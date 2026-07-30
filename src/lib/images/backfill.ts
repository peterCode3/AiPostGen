/**
 * Backfill: walk all published articles missing a `featuredImage` and find
 * one via Unsplash + S3. Designed to be invoked from the Lambda once via an
 * SQS message of type `backfill-images`.
 *
 * Rate-limited at 50 req/hr by Unsplash, so we sleep 90 s between calls when
 * processing more than the limit allows. The whole thing is idempotent —
 * articles that already have a featuredImage are skipped.
 */
import 'dotenv/config';
import { dbConnect } from '../db/connect';
import Article from '../db/models/Article';
import { findAndStoreCover } from './cover';

export type BackfillResult = {
  total: number;
  filled: number;
  skipped: number;
  failed: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runBackfillImages(opts: { limit?: number } = {}): Promise<BackfillResult> {
  const { limit = 50 } = opts;
  await dbConnect();

  const candidates = await Article.find({
    $or: [{ featuredImage: { $exists: false } }, { featuredImage: null }, { featuredImage: '' }],
  })
    .limit(limit)
    .select('_id slug keywords title language')
    .lean();

  console.log(`[backfill] candidates=${candidates.length}`);
  const result: BackfillResult = {
    total: candidates.length,
    filled: 0,
    skipped: 0,
    failed: 0,
  };

  // Already-used Unsplash photo IDs (extracted from existing featuredImage URLs).
  const used = new Set<string>();
  const haveCovers = await Article.find({ featuredImage: { $regex: '/covers/' } })
    .select('featuredImage')
    .lean();
  for (const a of haveCovers) {
    const m = (a.featuredImage || '').match(/-([A-Za-z0-9_-]{11})\.jpg$/);
    if (m) used.add(m[1]);
  }

  for (const a of candidates) {
    // Prefer the primary keyword (first item) — that's what was used to
    // generate the article. Fall back to title if keywords are empty.
    const query = (a.keywords && a.keywords[0]) || a.title || '';
    if (!query) {
      result.skipped++;
      continue;
    }
    try {
      const cover = await findAndStoreCover(query, a.slug || String(a._id), used);
      if (cover) {
        const m = cover.url.match(/-([A-Za-z0-9_-]{11})\.jpg$/);
        if (m) used.add(m[1]);
      }
      if (!cover) {
        result.skipped++;
        continue;
      }
      await Article.updateOne(
        { _id: a._id },
        {
          $set: {
            featuredImage: cover.url,
            'seo.coverAttribution': cover.attribution,
            'seo.coverAlt': cover.alt,
          },
        },
      );
      result.filled++;
      console.log(`[backfill] +${a.slug} → ${cover.url}`);

    } catch (err: any) {
      console.warn(`[backfill] !${a.slug}: ${err.message}`);
      result.failed++;
    }

    // Conservative pacing: 50 req/hr free tier ≈ 1 req per 72s. We do 2 req
    // per article (search + image fetch), so 90s is safer.
    if (result.filled + result.failed < candidates.length) {
      await sleep(2000);
    }
  }

  return result;
}
