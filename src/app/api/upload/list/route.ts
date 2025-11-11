import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { list } from '@vercel/blob';

export async function GET(req: NextRequest) {
  try {
    // Check if we're on Vercel - use Vercel Blob Storage
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      // List images from Vercel Blob Storage
      try {
        const { blobs } = await list({
          prefix: 'uploads/',
        });

        const images = blobs
          .filter(blob => {
            const ext = blob.pathname.split('.').pop()?.toLowerCase();
            return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '');
          })
          .map(blob => ({
            name: blob.pathname.split('/').pop() || blob.pathname,
            url: blob.url,
            size: blob.size || 0,
            createdAt: new Date(blob.uploadedAt),
          }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return NextResponse.json({ images });
      } catch (blobErr: any) {
        console.error('[upload:list] Vercel Blob error:', blobErr);
        // Return empty array if blob storage fails
        return NextResponse.json({ images: [] });
      }
    }

    // Use local file system for development
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(uploadsDir);
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          url: `/uploads/${file}`,
          size: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ images });
  } catch (err: any) {
    console.error('[upload:list] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list images' }, { status: 500 });
  }
}

