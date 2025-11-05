import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';
import { requireRole } from '@/lib/auth/rbac';
import { jsonError } from '@/lib/utils/errors';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireRole(req, ['admin', 'editor']);
  if (!auth.ok) return jsonError(auth.error, 401);

  const { id } = await context.params;
  const { scheduledAt } = await req.json() as { scheduledAt: string };
  if (!scheduledAt) return jsonError('Missing schedule date', 400);

  await dbConnect();

  const a = await Article.findByIdAndUpdate(
    id,
    { status: 'scheduled', scheduledAt: new Date(scheduledAt) },
    { new: true }
  ).lean();

  if (!a) return jsonError('not found', 404);

  return Response.json(a);
}
