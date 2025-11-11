import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Use local file system - save to public/uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    } catch (mkdirErr: any) {
      // If directory creation fails (e.g., on Vercel), return helpful error
      if (mkdirErr.code === 'EROFS' || process.env.VERCEL === '1') {
        return NextResponse.json(
          { 
            error: 'File system is read-only on this hosting platform. Please use a hosting service that supports file system writes (e.g., Railway, Render, DigitalOcean, AWS EC2) or configure cloud storage.',
            code: 'READ_ONLY_FILESYSTEM'
          },
          { status: 500 }
        );
      }
      throw mkdirErr;
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `uploads/${timestamp}-${randomStr}-${sanitizedName}`;
    const filePath = path.join(process.cwd(), 'public', fileName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      fs.writeFileSync(filePath, buffer);
    } catch (writeErr: any) {
      // If file write fails (e.g., on Vercel), return helpful error
      if (writeErr.code === 'EROFS' || process.env.VERCEL === '1') {
        return NextResponse.json(
          { 
            error: 'File system is read-only on this hosting platform. Please use a hosting service that supports file system writes (e.g., Railway, Render, DigitalOcean, AWS EC2) or configure cloud storage.',
            code: 'READ_ONLY_FILESYSTEM'
          },
          { status: 500 }
        );
      }
      throw writeErr;
    }

    return NextResponse.json({ url: `/${fileName}` });
  } catch (err: any) {
    console.error('[upload] Error:', err);
    
    // Check for read-only filesystem error
    if (err.code === 'EROFS' || process.env.VERCEL === '1') {
      return NextResponse.json(
        { 
          error: 'File system is read-only on this hosting platform. Please use a hosting service that supports file system writes (e.g., Railway, Render, DigitalOcean, AWS EC2) or configure cloud storage.',
          code: 'READ_ONLY_FILESYSTEM'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
