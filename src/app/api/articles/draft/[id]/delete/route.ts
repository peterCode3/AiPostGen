import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';

export async function DELETE(req: NextRequest, context: any) {
  const auth = requireRole(req, ['admin', 'editor']);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await context.params;   
  if (!id) return NextResponse.json({ error: 'Article ID required' }, { status: 400 });

  await dbConnect();
  const article = await Article.findById(id);
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  await article.deleteOne();
  return NextResponse.json({ message: 'Article deleted successfully' });
}
