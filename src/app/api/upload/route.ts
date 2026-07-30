import { NextRequest, NextResponse } from 'next/server';
import { BUCKET, putObject } from '@/lib/storage/gcs';

export async function POST(req: NextRequest) {
  if (!BUCKET) {
    return NextResponse.json({ error: 'GCS_UPLOAD_BUCKET not configured' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${timestamp}-${randomStr}-${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const body = Buffer.from(arrayBuffer);

    const url = await putObject(key, body, file.type || 'application/octet-stream');

    return NextResponse.json({ url, key });
  } catch (err: any) {
    console.error('[upload] Error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
