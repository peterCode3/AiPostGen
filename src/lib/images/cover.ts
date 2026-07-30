/**
 * Cover-image search + object-storage upload.
 *
 * Queries Unsplash by keyword, downloads the first landscape result, uploads
 * it to Cloud Storage under `covers/<slug>-<id>.jpg`, and returns a public URL
 * plus the photographer attribution required by Unsplash's API guidelines.
 *
 * Required env: UNSPLASH_ACCESS_KEY, GCS_UPLOAD_BUCKET.
 */
import { BUCKET, putObject } from '@/lib/storage/gcs';

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

export type CoverImage = {
  url: string;
  alt: string;
  attribution: { name: string; profileUrl: string; sourceUrl: string };
};

type UnsplashPhoto = {
  id: string;
  alt_description?: string;
  description?: string;
  urls: { regular: string; small: string; raw: string };
  links: { html: string };
  user: { name: string; links: { html: string } };
};

async function searchUnsplash(
  query: string,
  excludeIds: Set<string>,
): Promise<UnsplashPhoto | null> {
  if (!UNSPLASH_KEY) return null;
  // Pull a wider page so we can skip photos already used by other articles.
  const params = new URLSearchParams({
    query,
    per_page: '20',
    orientation: 'landscape',
    content_filter: 'high',
  });
  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: {
      'Accept-Version': 'v1',
      Authorization: `Client-ID ${UNSPLASH_KEY}`,
    },
  });
  if (!res.ok) {
    console.warn(`[cover] unsplash search returned ${res.status}`);
    return null;
  }
  const json = (await res.json()) as { results: UnsplashPhoto[] };
  if (!json.results?.length) return null;
  for (const photo of json.results) {
    if (!excludeIds.has(photo.id)) return photo;
  }
  // All results already used — return the first anyway so the article still
  // gets a cover (preferable to going blank).
  return json.results[0] || null;
}

async function uploadToS3(buf: Buffer, key: string, contentType: string): Promise<string> {
  // Name kept so call sites below read unchanged; storage is now GCS.
  return putObject(key, buf, contentType);
}

// Build a list of fallback queries from a specific keyword. If Unsplash
// returns nothing for "AI-Powered Dental Charting", we try "dental charting",
// then "dentistry", then "dental clinic". Every article gets *some* cover.
function buildSearchQueries(keyword: string): string[] {
  const cleaned = keyword.replace(/[^A-Za-z؀-ۿ\s]/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
  const queries = [keyword.trim(), cleaned];
  if (words.length > 2) queries.push(words.slice(-2).join(' '));
  if (words.length > 1) queries.push(words[words.length - 1]);
  // Domain-generic fallbacks — guaranteed to return results
  queries.push('dentistry', 'dental clinic', 'medical office');
  // De-dup while preserving order
  return Array.from(new Set(queries.filter(Boolean)));
}

/**
 * Find a cover image for `keyword` and return the persisted S3 URL + the
 * Unsplash attribution metadata. Pass `excludePhotoIds` to skip photos that
 * are already used by other articles so each post gets a distinct cover.
 * Falls back through progressively-generic queries so we never return null
 * unless Unsplash is unreachable or unconfigured.
 */
export async function findAndStoreCover(
  keyword: string,
  slug: string,
  excludePhotoIds: Set<string> = new Set(),
): Promise<CoverImage | null> {
  if (!UNSPLASH_KEY) {
    console.warn('[cover] UNSPLASH_ACCESS_KEY not set — skipping cover');
    return null;
  }
  if (!BUCKET) {
    console.warn('[cover] GCS_UPLOAD_BUCKET not set — skipping cover');
    return null;
  }
  try {
    let photo = null;
    for (const q of buildSearchQueries(keyword)) {
      photo = await searchUnsplash(q, excludePhotoIds);
      if (photo) {
        if (q !== keyword) console.log(`[cover] fallback query matched: "${q}"`);
        break;
      }
    }
    if (!photo) {
      console.warn(`[cover] no Unsplash results across all fallbacks for "${keyword}"`);
      return null;
    }
    // Use the `regular` URL (≈1080w) — quality is fine for a card hero.
    const imgRes = await fetch(photo.urls.regular);
    if (!imgRes.ok) {
      console.warn(`[cover] image fetch returned ${imgRes.status}`);
      return null;
    }
    const arrayBuf = await imgRes.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const key = `covers/${slug}-${photo.id}.jpg`;
    const url = await uploadToS3(buf, key, 'image/jpeg');
    return {
      url,
      alt: photo.alt_description || photo.description || keyword,
      attribution: {
        name: photo.user.name,
        profileUrl: `${photo.user.links.html}?utm_source=edentist&utm_medium=referral`,
        sourceUrl: `${photo.links.html}?utm_source=edentist&utm_medium=referral`,
      },
    };
  } catch (err: any) {
    console.warn('[cover] failed:', err.message);
    return null;
  }
}
