import { NextRequest, NextResponse } from 'next/server';
import { BUCKET, getObjectStream } from '@/lib/storage/gcs';

/**
 * Public read-through for blog media held in a PRIVATE GCS bucket.
 *
 * Article cover images used to be public S3 objects
 * (aipostgen-assets-eu.s3.eu-central-1.amazonaws.com/covers/…) and were rendered
 * straight from that URL. On GCP the bucket is private — patient and content
 * buckets are not world-readable — so a bare storage URL returns 403, and a
 * signed URL is wrong here because it expires while article rows live forever.
 *
 * This route streams the object with the service account's credentials and lets
 * the CDN cache it. Deliberately limited:
 *   - only whitelisted prefixes are reachable (no arbitrary bucket browsing)
 *   - only GET
 *   - path traversal is rejected
 */

const ALLOWED_PREFIXES = ['covers/', 'uploads/'];

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ key: string[] }> },
) {
  if (!BUCKET) {
    return NextResponse.json({ error: 'GCS_UPLOAD_BUCKET not configured' }, { status: 500 });
  }

  // Next 15 hands route params as a Promise. `tsc --noEmit` does not enforce
  // this — only `next build` does — so a plain typecheck will not catch it.
  const { key: segments } = await context.params;
  const key = (segments || []).join('/');

  if (!key || key.includes('..') || key.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }
  if (!ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const object = await getObjectStream(key);
    if (!object) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    return new NextResponse(object.body, {
      status: 200,
      headers: {
        'Content-Type': object.contentType || CONTENT_TYPES[ext] || 'application/octet-stream',
        // Cover images are content-addressed by slug + photo id and never
        // rewritten in place, so they can be cached hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...(object.size ? { 'Content-Length': String(object.size) } : {}),
      },
    });
  } catch (err: any) {
    console.error(`[media] ${key}:`, err?.message || err);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
