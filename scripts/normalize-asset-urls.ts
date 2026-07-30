/**
 * Normalizes stored asset references in `edentist_core.Report` from fully
 * qualified AWS S3 URLs to bare object keys.
 *
 * Why: every Report row stored an absolute URL like
 *   https://edentist-asset-eu.s3.eu-central-1.amazonaws.com/cropped-123.jpeg
 * which hard-codes the storage host into the *data*. That works today only
 * because UploaderService.extractKey() recognises the legacy S3 host via the
 * S3_BUCKET_NAME env var — i.e. the rows depend on AWS-specific config that
 * should disappear at decommission.
 *
 * Storing a bare key makes the storage host configuration rather than data:
 * UploaderService.extractKey() returns any non-`http` value unchanged
 * (`if (!urlOrKey.startsWith('http')) return urlOrKey;`), then signs it against
 * GCS_BUCKET_NAME. So bare keys are the natively supported form.
 *
 * Safety:
 *   - Writes a JSON backup of every affected row/column BEFORE mutating.
 *   - Only rewrites values whose host matches a known bucket; anything else is
 *     left untouched and reported.
 *   - --dry-run (default) prints the plan and changes nothing. Pass --apply.
 *
 * Usage:
 *   DB_HOST=… DB_PASSWORD=… npx tsx scripts/normalize-asset-urls.ts [--apply]
 */

import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const APPLY = process.argv.includes('--apply');
const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp';

// Buckets whose URLs are ours to rewrite. Anything else is left alone.
const KNOWN_BUCKETS = new Set([
  'edentist-asset-eu',
  'edentist-assets',
  'edentist-dev-edentist-assets',
  'edentist-dev-edentist-assets-legacy',
]);

const COLUMNS = [
  'anterior_teeth_raw',
  'anterior_teeth_labeled',
  'upper_teeth_raw',
  'upper_teeth_labeled',
  'lower_teeth_raw',
  'lower_teeth_labeled',
];

/** Mirrors UploaderService.extractKey() for the S3/GCS hosts we own. */
function toKey(value: string): { key: string | null; reason?: string } {
  if (!value.startsWith('http')) return { key: null, reason: 'already-a-key' };

  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { key: null, reason: 'unparseable-url' };
  }

  const p = u.pathname.replace(/^\//, '');

  const gcsVirtual = u.hostname.match(/^(.+)\.storage\.googleapis\.com$/);
  if (gcsVirtual && KNOWN_BUCKETS.has(gcsVirtual[1])) return { key: decodeURIComponent(p) };

  if (u.hostname === 'storage.googleapis.com') {
    const parts = p.split('/');
    if (KNOWN_BUCKETS.has(parts[0])) return { key: decodeURIComponent(parts.slice(1).join('/')) };
    return { key: null, reason: 'unknown-gcs-bucket' };
  }

  const s3Virtual = u.hostname.match(/^([^.]+)\.s3[.-]/);
  if (s3Virtual && KNOWN_BUCKETS.has(s3Virtual[1])) return { key: decodeURIComponent(p) };

  if (/^s3[.-]/.test(u.hostname)) {
    const parts = p.split('/');
    if (KNOWN_BUCKETS.has(parts[0])) return { key: decodeURIComponent(parts.slice(1).join('/')) };
  }

  return { key: null, reason: `unknown-host:${u.hostname}` };
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'edentist_app',
    password: process.env.DB_PASSWORD || '',
    database: 'edentist_core',
  });

  const [rows] = await conn.query<any[]>(
    `SELECT id, ${COLUMNS.map((c) => `\`${c}\``).join(', ')} FROM \`Report\``,
  );

  const backup: any[] = [];
  const updates: { id: number; col: string; from: string; to: string }[] = [];
  const skipped: Record<string, number> = {};

  for (const row of rows) {
    for (const col of COLUMNS) {
      const val = row[col];
      if (!val || typeof val !== 'string') continue;
      const { key, reason } = toKey(val);
      if (key && key !== val) {
        updates.push({ id: row.id, col, from: val, to: key });
      } else if (reason && reason !== 'already-a-key') {
        skipped[reason] = (skipped[reason] || 0) + 1;
      }
    }
    backup.push(row);
  }

  const stamp = String(rows.length) + '-rows';
  const backupPath = path.join(BACKUP_DIR, `Report-asset-urls-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`backup written: ${backupPath} (${backup.length} rows, all ${COLUMNS.length} columns)`);

  console.log(`\nrows scanned      : ${rows.length}`);
  console.log(`values to rewrite : ${updates.length}`);
  if (Object.keys(skipped).length) console.log(`skipped           : ${JSON.stringify(skipped)}`);
  console.log('\nsample:');
  for (const u of updates.slice(0, 3)) {
    console.log(`  [${u.id}] ${u.col}`);
    console.log(`      from: ${u.from}`);
    console.log(`      to:   ${u.to}`);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    for (const u of updates) {
      await conn.query(`UPDATE \`Report\` SET \`${u.col}\` = ? WHERE id = ?`, [u.to, u.id]);
    }
    await conn.commit();
    console.log(`\napplied ${updates.length} updates (single transaction, committed)`);
  } catch (e) {
    await conn.rollback();
    console.error('rolled back:', e);
    process.exit(1);
  }

  const [after] = await conn.query<any[]>(
    "SELECT COUNT(*) n FROM `Report` WHERE anterior_teeth_raw LIKE 'http%'",
  );
  const [keys] = await conn.query<any[]>(
    "SELECT COUNT(*) n FROM `Report` WHERE anterior_teeth_raw IS NOT NULL AND anterior_teeth_raw NOT LIKE 'http%'",
  );
  console.log(`verify: anterior_teeth_raw still-URL=${after[0].n}, bare-key=${keys[0].n}`);

  await conn.end();
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
