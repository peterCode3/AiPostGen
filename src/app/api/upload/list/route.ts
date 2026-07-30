import { NextResponse } from 'next/server';
import { BUCKET, listObjects, publicUrl } from '@/lib/storage/gcs';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

export async function GET() {
  if (!BUCKET) {
    return NextResponse.json({ error: 'GCS_UPLOAD_BUCKET not configured' }, { status: 500 });
  }

  try {
    const objects = await listObjects('uploads/', 1000);

    const images = objects
      .filter((obj) => {
        const lower = obj.key.toLowerCase();
        return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
      })
      .map((obj) => ({
        name: obj.key.split('/').pop() || obj.key,
        url: publicUrl(obj.key),
        size: obj.size,
        createdAt: obj.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ images });
  } catch (err: any) {
    console.error('[upload:list] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list images' }, { status: 500 });
  }
}
