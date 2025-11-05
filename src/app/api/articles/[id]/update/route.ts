import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await dbConnect();

  const { id } = await context.params;
  const { title, metaTitle, metaDescription, content, prompt } = await req.json();

  try {
    const updated = await Article.findByIdAndUpdate(
      id,
      { title, metaTitle, metaDescription, content, prompt },
      { new: true }
    );
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[article:update]', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
