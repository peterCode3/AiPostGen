import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';
import { requireRole } from '@/lib/auth/rbac';
import { jsonError } from '@/lib/utils/errors';

export async function POST(req: NextRequest, context: any) {
  const { id } = await context.params;   
  const auth = requireRole(req, ['admin','editor']);
  if (!auth.ok) return jsonError(auth.error, 401);
  await dbConnect();
  const a = await Article.findByIdAndUpdate(id, { status: 'published' }, { new: true }).lean();
  if (!a) return jsonError('not found', 404);
  return Response.json(a);
}
