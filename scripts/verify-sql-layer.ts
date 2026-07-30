/**
 * Runtime verification of the MySQL data layer that replaced Mongoose.
 *
 * A typecheck proves nothing about generated SQL, so this exercises every
 * method the app actually calls, against a real database, and asserts on
 * results. Writes and then removes its own rows; safe to re-run.
 *
 *   DB_HOST=<ip> DB_USER=... DB_PASSWORD=... DB_NAME=edentist npx tsx scripts/verify-sql-layer.ts
 */

import Article from '../src/lib/db/models/Article';
import Source from '../src/lib/db/models/Source';
import Keyword from '../src/lib/db/models/Keyword';
import { dbConnect, getPool, newObjectId } from '../src/lib/db/connect';

let passed = 0;
let failed = 0;
const TAG = `verify-${Date.now()}`;

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

async function main() {
  await dbConnect();
  console.log('connected\n');

  // --- create + findById -----------------------------------------------
  const slug = `${TAG}-slug`;
  const created = await Article.create({
    slug,
    title: 'Verify Article',
    status: 'draft',
    language: 'en',
    keywords: ['alpha', 'beta'],
    content: { markdown: '# hi', html: '<h1>hi</h1>' },
    seo: { og: { title: 'og-title' }, internalLinks: [{ href: '/x', anchor: 'x' }] },
    cost: { totalUSD: 0.11, tokensIn: 100, tokensOut: 200 },
  });
  check('create returns 24-hex _id', /^[0-9a-f]{24}$/.test(created._id), created._id);

  const fetched = await Article.findById(created._id).lean();
  check('findById returns the row', fetched?.slug === slug, fetched?.slug);
  check('JSON array round-trips', Array.isArray(fetched?.keywords) && fetched.keywords[1] === 'beta', fetched?.keywords);
  check('nested JSON round-trips', fetched?.content?.markdown === '# hi', fetched?.content);
  check('deep nested JSON round-trips', fetched?.seo?.og?.title === 'og-title', fetched?.seo);
  check('numeric JSON round-trips', fetched?.cost?.totalUSD === 0.11, fetched?.cost);

  // --- find + sort + select + lean --------------------------------------
  const listed = await Article.find({ status: 'draft', language: 'en' })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()
    .select('title slug status _id');
  check('find/sort/limit/select returns rows', listed.length > 0, listed.length);
  check('select restricts columns', listed[0] && !('prompt' in listed[0]), Object.keys(listed[0] || {}));
  check('select always includes _id', !!listed[0]?._id);

  // --- 2-arg find (projection object) ------------------------------------
  const projected = await Article.find({ slug }, { title: 1, slug: 1 });
  check('find(filter, projection) works', projected[0]?.title === 'Verify Article', projected[0]);

  // --- findByIdAndUpdate(...).lean() chaining -----------------------------
  const updated = await Article.findByIdAndUpdate(created._id, { status: 'scheduled' }, { new: true }).lean();
  check('findByIdAndUpdate is chainable and returns post-update doc', updated?.status === 'scheduled', updated?.status);

  // --- $set / $in / $or / $exists / $gte ---------------------------------
  await Article.updateOne({ _id: created._id }, { $set: { metaTitle: 'meta-x' } });
  const afterSet = await Article.findById(created._id).lean();
  check('$set applies', afterSet?.metaTitle === 'meta-x', afterSet?.metaTitle);

  const inRes = await Article.find({ status: { $in: ['scheduled', 'published'] }, slug });
  check('$in matches', inRes.length === 1, inRes.length);

  const orRes = await Article.find({ $or: [{ slug }, { slug: 'nope-not-here' }] });
  check('$or matches', orRes.length === 1, orRes.length);

  const existsRes = await Article.find({ slug, metaTitle: { $exists: true } });
  check('$exists matches', existsRes.length === 1, existsRes.length);

  const gteRes = await Article.find({ slug, createdAt: { $gte: new Date(Date.now() - 3600_000) } });
  check('$gte on dates matches', gteRes.length === 1, gteRes.length);

  // --- exists() -----------------------------------------------------------
  const ex = await Article.exists({ slug, language: 'en' });
  check('exists() finds row', !!ex && !!ex._id, ex);
  const exNo = await Article.exists({ slug: 'definitely-not-present' });
  check('exists() returns null when absent', exNo === null, exNo);

  // --- save() on a non-lean doc -------------------------------------------
  const doc = await Article.findById(created._id);
  doc.metaDescription = 'saved-desc';
  await doc.save();
  const afterSave = await Article.findById(created._id).lean();
  check('doc.save() persists mutations', afterSave?.metaDescription === 'saved-desc', afterSave?.metaDescription);

  // --- updateOne with upsert (workers/scrape.ts path) ---------------------
  const url = `https://example.com/${TAG}`;
  await Source.updateOne(
    { url },
    { url, domain: 'example.com', robotsAllowed: true, fetchedAt: new Date(), text: 'body', metadata: { title: 'T' }, hash: 'h1' },
    { upsert: true },
  );
  const src1 = await Source.findOne({ url }).lean();
  check('updateOne upsert inserts', src1?.domain === 'example.com', src1?.domain);
  check('boolean round-trips', !!src1?.robotsAllowed, src1?.robotsAllowed);

  await Source.updateOne({ url }, { text: 'body-2' }, { upsert: true });
  const src2 = await Source.findOne({ url }).lean();
  check('updateOne upsert updates existing (no duplicate)', src2?.text === 'body-2', src2?.text);
  check('upsert did not duplicate', (await Source.countDocuments({ url })) === 1);

  // --- generatedAt column (migration 002) ---------------------------------
  await Source.updateOne({ url }, { generatedAt: new Date() }, { upsert: true });
  const src3 = await Source.findOne({ url }).lean();
  check('generatedAt column exists and persists', !!src3?.generatedAt, src3?.generatedAt);

  // --- dotted projection ("metadata.title") -------------------------------
  const dotted = await Source.find({ url }, { url: 1, domain: 1, 'metadata.title': 1 });
  check('dotted projection returns root JSON column', dotted[0]?.metadata?.title === 'T', dotted[0]?.metadata);

  // --- bulkWrite (keywords/import path) -----------------------------------
  const t1 = `${TAG}-kw1`;
  const t2 = `${TAG}-kw2`;
  const bulk = await Keyword.bulkWrite([
    { updateOne: { filter: { term: t1 }, update: { $set: { term: t1, updatedAt: new Date() } }, upsert: true } },
    { updateOne: { filter: { term: t2 }, update: { $set: { term: t2, updatedAt: new Date() } }, upsert: true } },
  ]);
  check('bulkWrite upserts new terms', bulk.upsertedCount === 2, bulk);
  const kws = await Keyword.find({ term: { $in: [t1, t2] } }).lean();
  check('bulkWrite rows readable via $in', kws.length === 2, kws.length);

  const bulk2 = await Keyword.bulkWrite([
    { updateOne: { filter: { term: t1 }, update: { $set: { locale: 'ar' } }, upsert: true } },
  ]);
  check('bulkWrite updates existing rather than duplicating', bulk2.matchedCount === 1, bulk2);
  check('bulkWrite update applied', (await Keyword.findOne({ term: t1 }).lean())?.locale === 'ar');

  // --- unique constraint on (slug, language) ------------------------------
  const arSame = await Article.create({ slug, title: 'Arabic twin', status: 'draft', language: 'ar' });
  check('same slug allowed for a different language', !!arSame._id);
  let dupBlocked = false;
  try {
    await Article.create({ slug, title: 'dup', status: 'draft', language: 'en' });
  } catch {
    dupBlocked = true;
  }
  check('duplicate (slug, language) rejected', dupBlocked);

  // --- countDocuments -----------------------------------------------------
  check('countDocuments counts', (await Article.countDocuments({ slug })) === 2);

  // --- cleanup ------------------------------------------------------------
  await Article.deleteMany({ slug });
  await Source.deleteMany({ url });
  await Keyword.deleteMany({ term: { $in: [t1, t2] } });
  check('cleanup removed articles', (await Article.countDocuments({ slug })) === 0);
  check('cleanup removed sources', (await Source.countDocuments({ url })) === 0);

  await getPool().end();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nFATAL:', e);
  process.exit(1);
});
