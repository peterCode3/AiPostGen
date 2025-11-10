import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';
import { requireRole } from '@/lib/auth/rbac';
import { jsonError } from '@/lib/utils/errors';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; 
  const auth = requireRole(req, ['admin', 'editor', 'contributor', 'viewer']);
  if (!auth.ok) return jsonError(auth.error, 401);

  await dbConnect();
  
  try {
    const doc = await Article.findById(id).lean();
    if (!doc) return jsonError('Article not found', 404);
    return Response.json(doc);
  } catch (error: any) {
    console.error('[article:get] Error:', error);
    return jsonError(error.message || 'Failed to fetch article', 500);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; 
  const auth = requireRole(req, ['admin', 'editor', 'contributor']);
  if (!auth.ok) return jsonError(auth.error, 401);

  await dbConnect();
  
  try {
    const updates = await req.json();
    const doc = await Article.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!doc) return jsonError('Article not found', 404);
    return Response.json(doc);
  } catch (error: any) {
    console.error('[article:patch] Error:', error);
    return jsonError(error.message || 'Failed to update article', 500);
  }
}
