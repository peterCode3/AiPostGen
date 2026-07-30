/**
 * A minimal Mongoose-compatible model layer over MySQL.
 *
 * Why a shim instead of rewriting every route: a survey of src/ found only a
 * small, mechanical API surface in use —
 *   find, findOne, findById, findByIdAndUpdate, findOneAndUpdate,
 *   findByIdAndDelete, deleteOne, updateOne, create, save, countDocuments
 * plus the chainables .sort/.limit/.select/.lean/.populate and the operators
 * $set, $in, $regex, $or, $gte, $exists.
 *
 * Implementing exactly that surface keeps ~20 API route files unchanged, which
 * is far less regression risk than hand-porting each one.
 *
 * Deliberate limitations (throw loudly rather than silently differ):
 *   - No aggregation pipelines (none are used).
 *   - No populate — it is accepted and ignored, as the routes only ever called
 *     it where the referenced doc was not read back.
 *   - Documents are plain objects exposing `_id`; non-lean results also carry
 *     a save() that persists mutated fields.
 */

import { getPool, newObjectId } from './sql';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

type Filter = Record<string, any>;
type Update = Record<string, any>;

export interface ModelSpec {
  table: string;
  /** JS field -> SQL column. Any field not listed is snake_cased. */
  columns?: Record<string, string>;
  /** Fields stored as native JSON columns. */
  json?: string[];
  /** Fields stored as DATETIME. */
  dates?: string[];
}

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function createModel(spec: ModelSpec) {
  const jsonFields = new Set(spec.json || []);
  const dateFields = new Set(spec.dates || []);
  const explicit = spec.columns || {};

  const col = (field: string): string => {
    if (field === '_id' || field === 'id') return 'id';
    return explicit[field] || snake(field);
  };

  // Reverse map for hydrating rows back into JS field names.
  const fieldOf = (column: string): string => {
    if (column === 'id') return '_id';
    for (const [f, c] of Object.entries(explicit)) if (c === column) return f;
    return column.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  };

  const encode = (field: string, value: any) => {
    if (value === undefined) return null;
    if (jsonFields.has(field)) return value === null ? null : JSON.stringify(value);
    if (dateFields.has(field) && value instanceof Date) return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value;
  };

  const hydrate = (row: RowDataPacket): any => {
    const doc: any = {};
    for (const [column, raw] of Object.entries(row)) {
      const field = fieldOf(column);
      if (jsonFields.has(field) && typeof raw === 'string') {
        try {
          doc[field] = JSON.parse(raw);
        } catch {
          doc[field] = raw;
        }
      } else {
        doc[field] = raw;
      }
    }
    return doc;
  };

  /** Builds a WHERE clause from a Mongo-style filter. */
  const where = (filter: Filter = {}): { sql: string; params: any[] } => {
    const clauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === '$or' && Array.isArray(value)) {
        const parts = value.map((sub: Filter) => {
          const built = where(sub);
          params.push(...built.params);
          return built.sql ? `(${built.sql})` : '1=1';
        });
        if (parts.length) clauses.push(`(${parts.join(' OR ')})`);
        continue;
      }
      if (key === '$and' && Array.isArray(value)) {
        for (const sub of value) {
          const built = where(sub);
          if (built.sql) {
            clauses.push(`(${built.sql})`);
            params.push(...built.params);
          }
        }
        continue;
      }

      const c = `\`${col(key)}\``;

      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        for (const [op, operand] of Object.entries(value as Record<string, any>)) {
          switch (op) {
            case '$in':
              if (!Array.isArray(operand) || operand.length === 0) {
                clauses.push('1=0');
              } else {
                clauses.push(`${c} IN (${operand.map(() => '?').join(',')})`);
                params.push(...operand.map((v) => encode(key, v)));
              }
              break;
            case '$nin':
              if (Array.isArray(operand) && operand.length) {
                clauses.push(`${c} NOT IN (${operand.map(() => '?').join(',')})`);
                params.push(...operand.map((v) => encode(key, v)));
              }
              break;
            case '$ne':
              clauses.push(`(${c} <> ? OR ${c} IS NULL)`);
              params.push(encode(key, operand));
              break;
            case '$gt': clauses.push(`${c} > ?`); params.push(encode(key, operand)); break;
            case '$gte': clauses.push(`${c} >= ?`); params.push(encode(key, operand)); break;
            case '$lt': clauses.push(`${c} < ?`); params.push(encode(key, operand)); break;
            case '$lte': clauses.push(`${c} <= ?`); params.push(encode(key, operand)); break;
            case '$exists':
              clauses.push(operand ? `${c} IS NOT NULL` : `${c} IS NULL`);
              break;
            case '$regex': {
              const pattern = operand instanceof RegExp ? operand.source : String(operand);
              clauses.push(`${c} REGEXP ?`);
              params.push(pattern);
              break;
            }
            default:
              throw new Error(`[model:${spec.table}] unsupported query operator ${op}`);
          }
        }
        continue;
      }

      if (value === null) {
        clauses.push(`${c} IS NULL`);
      } else {
        clauses.push(`${c} = ?`);
        params.push(encode(key, value));
      }
    }

    return { sql: clauses.join(' AND '), params };
  };

  const applyUpdate = (update: Update) => {
    // Accept both { $set: {...} } and a bare patch object.
    const patch: Record<string, any> = { ...(update.$set || {}) };
    for (const [k, v] of Object.entries(update)) {
      if (!k.startsWith('$')) patch[k] = v;
    }
    if (update.$inc) {
      // Handled separately below via raw expressions.
    }
    const sets: string[] = [];
    const params: any[] = [];
    for (const [field, value] of Object.entries(patch)) {
      if (field === '_id' || field === 'id') continue;
      sets.push(`\`${col(field)}\` = ?`);
      params.push(encode(field, value));
    }
    for (const [field, amount] of Object.entries((update.$inc || {}) as Record<string, number>)) {
      sets.push(`\`${col(field)}\` = COALESCE(\`${col(field)}\`, 0) + ?`);
      params.push(amount);
    }
    return { sets, params };
  };

  /** Chainable, awaitable query — mirrors Mongoose's Query. */
  class Query<T> implements PromiseLike<T> {
    private _sort?: Record<string, 1 | -1>;
    private _limit?: number;
    private _skip?: number;
    private _select?: string[];
    private _single: boolean;
    private _lean = false;

    /**
     * `pre` runs before the SELECT. It lets findByIdAndUpdate/findOneAndUpdate
     * stay chainable (`.lean()` is called synchronously on the return value, so
     * they cannot be async functions) while still performing their write first.
     * It may return a replacement filter — used when the target id is only
     * known after resolving the original filter.
     */
    constructor(
      private filter: Filter,
      single: boolean,
      private pre?: () => Promise<Filter | void>,
    ) {
      this._single = single;
    }

    sort(s: Record<string, 1 | -1>) { this._sort = s; return this; }
    limit(n: number) { this._limit = n; return this; }
    skip(n: number) { this._skip = n; return this; }
    lean() { this._lean = true; return this; }
    populate() { return this; } // accepted and ignored — see header note
    select(fields: string | Record<string, 0 | 1>) {
      let picked: string[];
      if (typeof fields === 'string') {
        const parts = fields.split(/\s+/).filter(Boolean);
        // Exclusion-style selects fall back to SELECT * rather than guessing.
        if (parts.some((p) => p.startsWith('-'))) return this;
        picked = parts;
      } else {
        picked = Object.entries(fields).filter(([, v]) => v === 1).map(([k]) => k);
      }
      // Mongo projections can address JSON sub-paths ("metadata.title"). MySQL
      // selects the whole JSON column and the caller reads the sub-path off the
      // returned object, so collapse dotted paths to their root column.
      this._select = Array.from(new Set(picked.map((p) => p.split('.')[0])));
      return this;
    }

    private buildSql() {
      const built = where(this.filter);
      const cols = this._select
        ? Array.from(new Set(['_id', ...this._select])).map((f) => `\`${col(f)}\``).join(', ')
        : '*';
      let sql = `SELECT ${cols} FROM \`${spec.table}\``;
      if (built.sql) sql += ` WHERE ${built.sql}`;
      if (this._sort) {
        const order = Object.entries(this._sort)
          .map(([f, dir]) => `\`${col(f)}\` ${dir === -1 ? 'DESC' : 'ASC'}`)
          .join(', ');
        if (order) sql += ` ORDER BY ${order}`;
      }
      if (this._single) sql += ' LIMIT 1';
      else if (this._limit != null) sql += ` LIMIT ${Number(this._limit)}`;
      if (this._skip != null) sql += ` OFFSET ${Number(this._skip)}`;
      return { sql, params: built.params };
    }

    async exec(): Promise<T> {
      if (this.pre) {
        const replacement = await this.pre();
        if (replacement) this.filter = replacement;
        this.pre = undefined;
      }
      const { sql, params } = this.buildSql();
      const [rows] = await getPool().query<RowDataPacket[]>(sql, params);
      const docs = rows.map((r) => (this._lean ? hydrate(r) : attachSave(hydrate(r))));
      return (this._single ? (docs[0] ?? null) : docs) as T;
    }

    then<R1 = T, R2 = never>(
      onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
      onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
    ): PromiseLike<R1 | R2> {
      return this.exec().then(onfulfilled, onrejected);
    }
  }

  /** Gives non-lean docs a Mongoose-style save() that persists mutations. */
  function attachSave(doc: any) {
    const snapshot = JSON.stringify(doc);
    Object.defineProperty(doc, 'save', {
      enumerable: false,
      value: async function save() {
        if (JSON.stringify(doc) === snapshot) return doc;
        const { _id, ...rest } = doc;
        const { sets, params } = applyUpdate(rest);
        if (!sets.length) return doc;
        await getPool().query(
          `UPDATE \`${spec.table}\` SET ${sets.join(', ')} WHERE \`id\` = ?`,
          [...params, _id],
        );
        return doc;
      },
    });
    Object.defineProperty(doc, 'toObject', {
      enumerable: false,
      value: () => ({ ...doc }),
    });
    return doc;
  }

  async function insertOne(input: Record<string, any>) {
    const doc = { ...input };
    const id = doc._id || doc.id || newObjectId();
    delete doc._id;
    delete doc.id;

    const fields = Object.keys(doc).filter((f) => doc[f] !== undefined);
    const columns = ['`id`', ...fields.map((f) => `\`${col(f)}\``)];
    const placeholders = columns.map(() => '?');
    const params = [id, ...fields.map((f) => encode(f, doc[f]))];

    await getPool().query(
      `INSERT INTO \`${spec.table}\` (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      params,
    );
    return attachSave({ _id: id, ...doc });
  }

  return {
    modelName: spec.table,

    find(filter: Filter = {}, projection?: Record<string, 0 | 1>) {
      const q = new Query<any[]>(filter, false);
      return projection ? q.select(projection) : q;
    },
    findOne(filter: Filter = {}, projection?: Record<string, 0 | 1>) {
      const q = new Query<any>(filter, true);
      return projection ? q.select(projection) : q;
    },
    findById(id: string) { return new Query<any>({ _id: id }, true); },

    /** Mongoose returns the doc's _id or null; call sites only test truthiness. */
    async exists(filter: Filter) {
      const built = where(filter);
      const sql = `SELECT id FROM \`${spec.table}\`` +
        (built.sql ? ` WHERE ${built.sql}` : '') + ' LIMIT 1';
      const [rows] = await getPool().query<RowDataPacket[]>(sql, built.params);
      return rows.length ? { _id: rows[0].id } : null;
    },

    /**
     * Supports the `updateOne` bulk op shape actually used
     * (`{ updateOne: { filter, update, upsert } }`). Other bulk ops throw
     * rather than silently no-op.
     */
    async bulkWrite(ops: any[]) {
      let upsertedCount = 0;
      let modifiedCount = 0;
      let matchedCount = 0;

      for (const op of ops) {
        const spec_ = op.updateOne || op.updateMany;
        if (!spec_) {
          throw new Error(`[model:${spec.table}] unsupported bulkWrite op: ${Object.keys(op).join(',')}`);
        }
        const existing = await new Query<any>(spec_.filter, true);
        if (existing) {
          matchedCount++;
          const { sets, params } = applyUpdate(spec_.update || {});
          if (sets.length) {
            const [res] = await getPool().query<ResultSetHeader>(
              `UPDATE \`${spec.table}\` SET ${sets.join(', ')} WHERE \`id\` = ?`,
              [...params, existing._id],
            );
            modifiedCount += res.affectedRows;
          }
        } else if (spec_.upsert) {
          const seed: Record<string, any> = { ...spec_.filter, ...((spec_.update || {}).$set || {}) };
          for (const [k, v] of Object.entries(spec_.update || {})) {
            if (!k.startsWith('$')) seed[k] = v;
          }
          await insertOne(seed);
          upsertedCount++;
        }
      }
      return { upsertedCount, modifiedCount, matchedCount, ok: 1 };
    },

    async create(input: Record<string, any> | Record<string, any>[]) {
      if (Array.isArray(input)) return Promise.all(input.map(insertOne));
      return insertOne(input);
    },

    async insertMany(docs: Record<string, any>[]) {
      return Promise.all(docs.map(insertOne));
    },

    /**
     * Returns a chainable Query (call sites do `.lean()` on the result), so the
     * UPDATE runs in the query's pre-step rather than in an async wrapper.
     *
     * Mongoose defaults to returning the PRE-update doc unless {new:true};
     * every call site here passes new:true, so the post-update row is returned.
     */
    findByIdAndUpdate(id: string, update: Update, _opts: { new?: boolean } = {}) {
      return new Query<any>({ _id: id }, true, async () => {
        const { sets, params } = applyUpdate(update);
        if (sets.length) {
          await getPool().query(
            `UPDATE \`${spec.table}\` SET ${sets.join(', ')} WHERE \`id\` = ?`,
            [...params, id],
          );
        }
      });
    },

    async findOneAndUpdate(filter: Filter, update: Update, opts: { new?: boolean; upsert?: boolean } = {}) {
      const existing = await new Query<any>(filter, true);
      if (!existing) {
        if (opts.upsert) {
          const seed: Record<string, any> = { ...filter, ...(update.$set || {}) };
          for (const [k, v] of Object.entries(update)) if (!k.startsWith('$')) seed[k] = v;
          return insertOne(seed);
        }
        return null;
      }
      const { sets, params } = applyUpdate(update);
      if (sets.length) {
        await getPool().query(
          `UPDATE \`${spec.table}\` SET ${sets.join(', ')} WHERE \`id\` = ?`,
          [...params, existing._id],
        );
      }
      return new Query<any>({ _id: existing._id }, true);
    },

    async updateOne(filter: Filter, update: Update, opts: { upsert?: boolean } = {}) {
      const target = await new Query<any>(filter, true);
      if (!target) {
        if (opts.upsert) {
          const seed: Record<string, any> = { ...filter, ...(update.$set || {}) };
          for (const [k, v] of Object.entries(update)) if (!k.startsWith('$')) seed[k] = v;
          await insertOne(seed);
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        return { matchedCount: 0, modifiedCount: 0 };
      }
      const { sets, params } = applyUpdate(update);
      if (!sets.length) return { matchedCount: 1, modifiedCount: 0 };
      const [res] = await getPool().query<ResultSetHeader>(
        `UPDATE \`${spec.table}\` SET ${sets.join(', ')} WHERE \`id\` = ?`,
        [...params, target._id],
      );
      return { matchedCount: 1, modifiedCount: res.affectedRows };
    },

    async updateMany(filter: Filter, update: Update) {
      const built = where(filter);
      const { sets, params } = applyUpdate(update);
      if (!sets.length) return { matchedCount: 0, modifiedCount: 0 };
      const sql = `UPDATE \`${spec.table}\` SET ${sets.join(', ')}` +
        (built.sql ? ` WHERE ${built.sql}` : '');
      const [res] = await getPool().query<ResultSetHeader>(sql, [...params, ...built.params]);
      return { matchedCount: res.affectedRows, modifiedCount: res.changedRows };
    },

    async findByIdAndDelete(id: string) {
      const doc = await new Query<any>({ _id: id }, true);
      if (!doc) return null;
      await getPool().query(`DELETE FROM \`${spec.table}\` WHERE \`id\` = ?`, [id]);
      return doc;
    },

    async deleteOne(filter: Filter) {
      const doc = await new Query<any>(filter, true);
      if (!doc) return { deletedCount: 0 };
      await getPool().query(`DELETE FROM \`${spec.table}\` WHERE \`id\` = ?`, [doc._id]);
      return { deletedCount: 1 };
    },

    async deleteMany(filter: Filter) {
      const built = where(filter);
      const sql = `DELETE FROM \`${spec.table}\`` + (built.sql ? ` WHERE ${built.sql}` : '');
      const [res] = await getPool().query<ResultSetHeader>(sql, built.params);
      return { deletedCount: res.affectedRows };
    },

    async countDocuments(filter: Filter = {}) {
      const built = where(filter);
      const sql = `SELECT COUNT(*) AS n FROM \`${spec.table}\`` +
        (built.sql ? ` WHERE ${built.sql}` : '');
      const [rows] = await getPool().query<RowDataPacket[]>(sql, built.params);
      return Number(rows[0]?.n ?? 0);
    },

    async distinct(field: string, filter: Filter = {}) {
      const built = where(filter);
      const sql = `SELECT DISTINCT \`${col(field)}\` AS v FROM \`${spec.table}\`` +
        (built.sql ? ` WHERE ${built.sql}` : '');
      const [rows] = await getPool().query<RowDataPacket[]>(sql, built.params);
      return rows.map((r) => r.v);
    },
  };
}
