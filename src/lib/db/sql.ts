/**
 * MySQL connection pool for AiPostGen.
 *
 * Replaces the DocumentDB/Mongoose connection. Connects to Cloud SQL either
 * over the unix socket that Cloud Run mounts (--add-cloudsql-instances) or
 * over TCP for local development.
 *
 * Env:
 *   INSTANCE_UNIX_SOCKET  /cloudsql/<project>:<region>:<instance>   (Cloud Run)
 *   DB_HOST / DB_PORT                                              (local/TCP)
 *   DB_USER, DB_PASSWORD, DB_NAME
 */

import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let wrapped: mysql.Pool | null = null;

/**
 * MySQL/driver errors that mean "the connection died", not "the query is wrong".
 *
 * Cloud SQL resets every connection on a failover, a restart or maintenance,
 * and Cloud Run throttles CPU between requests so an idle instance cannot keep
 * its sockets alive. The first query afterwards fails; the pool then replaces
 * the connection and everything works again — so exactly one request fails, and
 * it fails for a real user. Observed here as:
 *
 *   ER_SERVER_SHUTDOWN (1053) "Server shutdown in progress" on SELECT 1
 *
 * which surfaced as a 500 from GET /api/blogs during a database restart.
 */
const TRANSIENT_DB_ERRORS = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'ER_SERVER_SHUTDOWN',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ER_CON_COUNT_ERROR',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
]);

function isTransientDbError(err: unknown): boolean {
  const e = err as { code?: string; errno?: number; fatal?: boolean };
  if (e?.code && TRANSIENT_DB_ERRORS.has(e.code)) return true;
  // 1053 server shutdown, 2006 server gone away, 2013 lost connection
  return [1053, 2006, 2013].includes(e?.errno ?? -1);
}

/**
 * Retry a query once the pool has had a moment to replace the dead connection.
 *
 * The delay is the point: retrying in the same tick races the pool's own
 * eviction of the broken connection and is handed the same one back. The
 * backend hit exactly that — its first retry implementation failed with the
 * identical error until a pause was added.
 */
async function withRetry<T>(run: () => Promise<T>, label: string): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isTransientDbError(err)) throw err;
    for (const delay of [300, 900]) {
      console.warn(`[db] transient error on ${label} (${(err as { code?: string })?.code}) — retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      try {
        return await run();
      } catch (retryErr) {
        if (!isTransientDbError(retryErr)) throw retryErr;
      }
    }
    throw err;
  }
}

export function getPool(): mysql.Pool {
  if (wrapped) return wrapped;
  const base = buildPool();
  // Wrap query/execute so every call site gets the retry without changing any
  // of them; everything else on the pool passes straight through.
  wrapped = new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'query' || prop === 'execute') {
        const original = Reflect.get(target, prop, receiver) as (...a: unknown[]) => Promise<unknown>;
        return (...args: unknown[]) =>
          withRetry(() => original.apply(target, args), String(prop));
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as mysql.Pool;
  return wrapped;
}

function buildPool(): mysql.Pool {
  if (pool) return pool;

  const socketPath = process.env.INSTANCE_UNIX_SOCKET;
  const base = {
    user: process.env.DB_USER || 'edentist_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'edentist',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    maxIdle: 4,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    charset: 'utf8mb4',
    timezone: 'Z',
    // Keep DATETIME values as JS Dates, matching what Mongoose returned.
    dateStrings: false as const,
  };

  pool = socketPath
    ? mysql.createPool({ ...base, socketPath })
    : mysql.createPool({
        ...base,
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
      });

  return pool;
}

/**
 * Drop-in for the old Mongoose `dbConnect()`; validates the pool is usable.
 *
 * Every API route calls this before touching a model, so it is the first thing
 * to meet a dead connection after a Cloud SQL restart or failover — and it runs
 * `SELECT 1` on a *connection*, which the pool-level retry wrapper never sees.
 * That is exactly how GET /api/blogs/<slug> still returned 500 with
 * `PROTOCOL_CONNECTION_LOST` after the pool wrapper was in place.
 *
 * A dead connection cannot be revived, so each attempt acquires a fresh one and
 * destroys the broken one rather than returning it to the pool.
 */
export async function dbConnect() {
  const p = getPool();

  const attempt = async () => {
    const conn = await p.getConnection();
    try {
      await conn.query('SELECT 1');
      conn.release();
    } catch (err) {
      // destroy(), not release(): a fatal connection must leave the pool, or it
      // gets handed straight back to the next caller.
      try {
        conn.destroy();
      } catch {
        /* already gone */
      }
      throw err;
    }
  };

  await withRetry(attempt, 'dbConnect');
  return p;
}

/**
 * Generates a 24-char hex id in MongoDB ObjectId layout
 * (4-byte timestamp + 5-byte random + 3-byte counter).
 *
 * Preserving the ObjectId shape means migrated rows keep their original ids,
 * existing admin URLs (/api/articles/draft/<id>) keep resolving, and any
 * stored cross-references stay valid.
 */
let counter = Math.floor(Math.random() * 0xffffff);
const PROCESS_RANDOM = Array.from({ length: 5 }, () =>
  Math.floor(Math.random() * 256).toString(16).padStart(2, '0'),
).join('');

export function newObjectId(): string {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  counter = (counter + 1) % 0xffffff;
  const inc = counter.toString(16).padStart(6, '0');
  return `${ts}${PROCESS_RANDOM}${inc}`;
}

export function isObjectIdLike(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v);
}
