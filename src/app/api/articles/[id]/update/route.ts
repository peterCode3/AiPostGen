import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await dbConnect();

  const { id } = await context.params;
  const { title, metaTitle, metaDescription, content, prompt, featuredImage } = await req.json();

  try {
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (content !== undefined) updateData.content = content;
    if (prompt !== undefined) updateData.prompt = prompt;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;

    const updated = await Article.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!updated) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[article:update]', err);
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}
