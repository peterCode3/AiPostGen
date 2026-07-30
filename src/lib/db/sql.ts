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

export function getPool(): mysql.Pool {
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

/** Drop-in for the old Mongoose `dbConnect()`; validates the pool is usable. */
export async function dbConnect() {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.query('SELECT 1');
  } finally {
    conn.release();
  }
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
