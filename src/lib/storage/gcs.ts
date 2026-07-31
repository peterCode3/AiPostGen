/**
 * Object storage — Google Cloud Storage (was S3).
 *
 * Shared by the upload routes and the article cover-image generator so bucket
 * naming, public URL construction and cache headers stay in one place.
 *
 * Env:
 *   GCS_UPLOAD_BUCKET      bucket name (falls back to legacy S3_UPLOAD_BUCKET)
 *   GCS_PUBLIC_BASE_URL    optional CDN/base URL (falls back to S3_PUBLIC_BASE_URL)
 *
 * Auth comes from Application Default Credentials — on Cloud Run that is the
 * attached service account, so no keys are shipped in the image.
 */

import { Storage } from '@google-cloud/storage';

export const BUCKET =
  process.env.GCS_UPLOAD_BUCKET || process.env.S3_UPLOAD_BUCKET || '';

const PUBLIC_BASE =
  process.env.GCS_PUBLIC_BASE_URL ||
  process.env.S3_PUBLIC_BASE_URL ||
  (BUCKET ? `https://storage.googleapis.com/${BUCKET}` : '');

let storage: Storage | null = null;

function client(): Storage {
  if (!storage) storage = new Storage();
  return storage;
}

export function publicUrl(key: string): string {
  return `${PUBLIC_BASE.replace(/\/$/, '')}/${key}`;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType = 'application/octet-stream',
): Promise<string> {
  if (!BUCKET) throw new Error('GCS_UPLOAD_BUCKET not set');
  await client()
    .bucket(BUCKET)
    .file(key)
    .save(body, {
      contentType,
      // Matches the immutable caching the S3 uploads used.
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
      resumable: false,
    });
  return publicUrl(key);
}

export interface FetchedObject {
  body: ReadableStream<Uint8Array>;
  contentType?: string;
  size?: number;
}

/**
 * Read an object out of the private bucket for serving through the app.
 * Returns null when the object does not exist, so the caller can 404 rather
 * than surfacing a storage error.
 */
export async function getObjectStream(key: string): Promise<FetchedObject | null> {
  if (!BUCKET) throw new Error('GCS_UPLOAD_BUCKET not set');
  const file = client().bucket(BUCKET).file(key);

  const [exists] = await file.exists();
  if (!exists) return null;

  const [metadata] = await file.getMetadata();
  // Node stream -> web stream: the Next.js Response body needs the web type.
  const nodeStream = file.createReadStream();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return {
    body,
    contentType: metadata?.contentType,
    size: metadata?.size ? Number(metadata.size) : undefined,
  };
}

export interface StoredObject {
  key: string;
  size: number;
  createdAt: Date;
}

export async function listObjects(prefix: string, maxResults = 1000): Promise<StoredObject[]> {
  if (!BUCKET) throw new Error('GCS_UPLOAD_BUCKET not set');
  const [files] = await client().bucket(BUCKET).getFiles({ prefix, maxResults });
  return files.map((f) => ({
    key: f.name,
    size: Number(f.metadata?.size ?? 0),
    createdAt: f.metadata?.timeCreated ? new Date(f.metadata.timeCreated) : new Date(),
  }));
}
