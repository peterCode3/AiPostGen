// ✅ Example for /api/articles/draft/[id]/publish/route.ts
import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';
import { requireRole } from '@/lib/auth/rbac';
import { jsonError } from '@/lib/utils/errors';
import { cmsPublish } from '@/lib/cms/client';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; 

  const auth = requireRole(req, ['admin', 'editor']);
  if (!auth.ok) return jsonError(auth.error, 401);

  await dbConnect();
  
  try {
    const article = await Article.findById(id);
    if (!article) return jsonError('Article not found', 404);

    // Attempt to publish to external CMS (if configured)
    const cmsResult = await cmsPublish(article);
    
    // Update article status regardless of external CMS result
    article.status = 'published';
    article.publishedAt = new Date();
    await article.save();
    
    console.log('✅ Published:', article.slug);
    return Response.json({ 
      success: true,
      message: cmsResult.message || 'Published successfully',
      article: article.toObject()
    });
  } catch (err: any) {
    console.error('❌ Publish failed:', err.message);
    return jsonError(`Publish failed: ${err.message}`, 500);
  }
}
