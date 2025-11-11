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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check if we're in production (Vercel) - file system is read-only
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    
    // Check if Cloudinary is configured (for production/Vercel)
    const useCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    // In production, Cloudinary is required
    if (isProduction && !useCloudinary) {
      return NextResponse.json(
        { 
          error: 'Image upload requires Cloudinary configuration in production. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables.',
          requiresCloudinary: true
        },
        { status: 500 }
      );
    }

    if (useCloudinary) {
      // Use Cloudinary for production
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const dataURI = `data:${file.type};base64,${base64}`;

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const publicId = `aipostgen/${timestamp}-${randomStr}-${sanitizedName}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        public_id: publicId,
        folder: 'aipostgen',
        resource_type: 'auto',
      });

      return NextResponse.json({ url: result.secure_url });
    } else {
      // Use local file system for development
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `uploads/${timestamp}-${randomStr}-${sanitizedName}`;
      const filePath = path.join(process.cwd(), 'public', fileName);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({ url: `/${fileName}` });
    }
  } catch (err: any) {
    console.error('[upload] Error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
