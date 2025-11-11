import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if credentials are available
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function GET(req: NextRequest) {
  try {
    // Check if Cloudinary is configured (for production/Vercel)
    const useCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (useCloudinary) {
      // List images from Cloudinary
      try {
        const result = await cloudinary.api.resources({
          type: 'upload',
          prefix: 'aipostgen/',
          max_results: 100,
          sort_by: [{ field: 'created_at', direction: 'desc' }]
        });

        const images = result.resources.map((resource: any) => ({
          name: resource.public_id.split('/').pop() || resource.public_id,
          url: resource.secure_url,
          size: resource.bytes || 0,
          createdAt: new Date(resource.created_at),
        }));

        return NextResponse.json({ images });
      } catch (cloudinaryError: any) {
        console.error('[upload:list] Cloudinary error:', cloudinaryError);
        // Fallback to empty array if Cloudinary fails
        return NextResponse.json({ images: [] });
      }
    } else {
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
    }
  } catch (err: any) {
    console.error('[upload:list] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list images' }, { status: 500 });
  }
}

