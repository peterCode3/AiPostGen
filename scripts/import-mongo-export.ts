/**
 * Imports a mongoexport dump of the AiPostGen DocumentDB collections into the
 * Cloud SQL MySQL schema created by migrations/001 + 002.
 *
 * DocumentDB is private to the AWS VPC, so the dump is produced by the
 * `aipostgen-mongo-export` CodeBuild project (VPC-attached, security group
 * `edentist-ecs-sg`, which is the only source DocumentDB's SG accepts) and
 * landed in s3://aipostgen-codebuild-source/mongo-export/.
 *
 * Usage:
 *   DB_HOST=<ip> DB_USER=edentist_app DB_PASSWORD=... DB_NAME=edentist \
 *   EXPORT_DIR=/path/to/mongo-export npx tsx scripts/import-mongo-export.ts [--truncate]
 *
 * Ids are preserved verbatim from Mongo's ObjectId hex, so cross-document
 * references (article.keywordId -> keyword._id, sourceRefs[].sourceId) stay
 * valid and existing admin URLs keep resolving.
 */

import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const EXPORT_DIR = process.env.EXPORT_DIR || './mongo-export';
const TRUNCATE = process.argv.includes('--truncate');

/** Recursively converts MongoDB Extended JSON v2 into plain JS values. */
function fromExtendedJson(v: any): any {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.map(fromExtendedJson);
  if (typeof v !== 'object') return v;

  const keys = Object.keys(v);
  if (keys.length === 1) {
    const k = keys[0];
    if (k === '$oid') return v.$oid;
    if (k === '$date') {
      const d = v.$date;
      // $date is either an ISO string or { $numberLong: "millis" }
      if (typeof d === 'string') return new Date(d);
      if (d && typeof d === 'object' && d.$numberLong) return new Date(Number(d.$numberLong));
      return new Date(d);
    }
    if (k === '$numberInt' || k === '$numberLong') return Number(v[k]);
    if (k === '$numberDouble') return Number(v[k]);
    if (k === '$numberDecimal') return Number(v[k]);
    if (k === '$undefined') return null;
  }

  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(v)) out[key] = fromExtendedJson(val);
  return out;
}

function load(file: string): any[] {
  const p = path.join(EXPORT_DIR, file);
  if (!fs.existsSync(p)) {
    console.log(`  (${file} absent — skipping)`);
    return [];
  }
  const raw = fs.readFileSync(p, 'utf8').trim();
  if (!raw) {
    console.log(`  (${file} empty — skipping)`);
    return [];
  }
  return JSON.parse(raw).map(fromExtendedJson);
}

const asJson = (v: any) => (v === null || v === undefined ? null : JSON.stringify(v));
const asDate = (v: any) => (v instanceof Date ? v : v ? new Date(v) : null);
const asBool = (v: any) => (v === null || v === undefined ? 0 : v ? 1 : 0);
const str = (v: any) => (v === null || v === undefined ? null : String(v));

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'edentist_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'edentist',
    charset: 'utf8mb4',
    timezone: 'Z',
    connectionLimit: 4,
    // rawHtml/text fields reach ~1 MB; keep headroom for a single-row insert.
    // mysql2 honours maxAllowedPacket at runtime but omits it from PoolOptions,
    // so the assertion is required for `tsc --noEmit` in the image build.
    maxAllowedPacket: 64 * 1024 * 1024,
  } as mysql.PoolOptions);

  const articles = load('articles.json');
  const sources = load('sources.json');
  const keywords = load('keywords.json');
  const jobs = load('jobs.json');
  const users = load('users.json');

  console.log(
    `loaded: articles=${articles.length} sources=${sources.length} keywords=${keywords.length} ` +
      `jobs=${jobs.length} users=${users.length}`,
  );

  if (TRUNCATE) {
    // The dev database is a clone target — anything already in these tables is
    // either test data or the residue of an unintended worker run.
    for (const t of ['articles', 'sources', 'keywords', 'jobs', 'users']) {
      await pool.query(`DELETE FROM \`${t}\``);
    }
    console.log('truncated target tables');
  }

  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  async function insert(table: string, cols: string[], rows: any[][]) {
    const placeholders = cols.map(() => '?').join(',');
    const sql = `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${placeholders})`;
    for (const row of rows) {
      try {
        await pool.query(sql, row);
        ok++;
      } catch (e: any) {
        failed++;
        if (errors.length < 10) errors.push(`${table} ${row[0]}: ${e.message}`);
      }
    }
    console.log(`  ${table}: attempted ${rows.length}`);
  }

  await insert(
    'keywords',
    ['id', 'term', 'locale', 'intent', 'serp', 'used', 'used_at', 'fetched_at', 'created_at', 'updated_at'],
    keywords.map((k) => [
      k._id, str(k.term), str(k.locale) || 'en', str(k.intent) || 'informational',
      asJson(k.serp), asBool(k.used), asDate(k.usedAt), asDate(k.fetchedAt),
      asDate(k.createdAt), asDate(k.updatedAt),
    ]),
  );

  await insert(
    'sources',
    ['id', 'url', 'domain', 'robots_allowed', 'raw_html', 'text', 'language', 'metadata',
     'hash', 'used', 'used_at', 'fetched_at', 'generated_at', 'created_at', 'updated_at'],
    sources.map((s) => [
      s._id, str(s.url), str(s.domain),
      s.robotsAllowed === null || s.robotsAllowed === undefined ? null : asBool(s.robotsAllowed),
      str(s.rawHtml), str(s.text), str(s.language), asJson(s.metadata), str(s.hash),
      asBool(s.used), asDate(s.usedAt), asDate(s.fetchedAt), asDate(s.generatedAt),
      asDate(s.createdAt), asDate(s.updatedAt),
    ]),
  );

  await insert(
    'articles',
    ['id', 'slug', 'title', 'meta_title', 'meta_description', 'keywords', 'keyword_id', 'prompt',
     'status', 'language', 'canonical_url', 'featured_image', 'source_refs', 'outline', 'content',
     'seo', 'review', 'cost', 'scheduled_at', 'published_at', 'created_at', 'updated_at'],
    articles.map((a) => [
      a._id, str(a.slug), str(a.title), str(a.metaTitle), str(a.metaDescription),
      asJson(a.keywords), str(a.keywordId), str(a.prompt),
      str(a.status) || 'draft', str(a.language) || 'en', str(a.canonicalUrl), str(a.featuredImage),
      asJson(a.sourceRefs), asJson(a.outline), asJson(a.content), asJson(a.seo), asJson(a.review),
      asJson(a.cost), asDate(a.scheduledAt), asDate(a.publishedAt),
      asDate(a.createdAt), asDate(a.updatedAt),
    ]),
  );

  if (jobs.length) {
    await insert(
      'jobs',
      ['id', 'type', 'payload', 'status', 'attempts', 'error', 'created_at', 'updated_at'],
      jobs.map((j) => [
        j._id, str(j.type), asJson(j.payload), str(j.status) || 'pending',
        j.attempts ?? 0, str(j.error), asDate(j.createdAt), asDate(j.updatedAt),
      ]),
    );
  }

  if (users.length) {
    await insert(
      'users',
      ['id', 'email', 'name', 'role', 'provider', 'created_at', 'updated_at'],
      users.map((u) => [
        u._id, str(u.email), str(u.name), str(u.role) || 'viewer',
        str(u.provider) || 'credentials', asDate(u.createdAt), asDate(u.updatedAt),
      ]),
    );
  }

  // Verify against the source counts rather than trusting the insert loop.
  console.log('\n=== row counts in MySQL ===');
  for (const t of ['articles', 'sources', 'keywords', 'jobs', 'users']) {
    const [r] = await pool.query<any[]>(`SELECT COUNT(*) AS n FROM \`${t}\``);
    console.log(`  ${t}: ${r[0].n}`);
  }
  const [pub] = await pool.query<any[]>(
    "SELECT COUNT(*) AS n FROM articles WHERE status='published'",
  );
  console.log(`  articles(published): ${pub[0].n}`);
  const [langs] = await pool.query<any[]>(
    'SELECT language, COUNT(*) AS n FROM articles GROUP BY language',
  );
  console.log(`  by language: ${langs.map((l: any) => `${l.language}=${l.n}`).join(' ')}`);

  await pool.end();

  console.log(`\ninserted ${ok}, failed ${failed}`);
  if (errors.length) {
    console.log('first errors:');
    for (const e of errors) console.log('  ' + e);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
