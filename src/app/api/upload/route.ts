import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Example: save file to /public/uploads
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `uploads/${Date.now()}-${file.name}`;
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'public', fileName);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ url: `/${fileName}` });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
