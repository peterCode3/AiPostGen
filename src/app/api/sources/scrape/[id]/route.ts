import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Source from '@/lib/db/models/Source';
import { requireRole } from '@/lib/auth/rbac';
import { jsonError } from '@/lib/utils/errors';

export async function GET(_req: NextRequest, { params }: { params: { id: string }}) {
  const { ok, error } = requireRole(_req, ['admin','editor','contributor','viewer']);
  if (!ok) return jsonError(error, 401);
  await dbConnect();
  const src = await Source.findById(params.id).lean();
  if (!src) return jsonError('not found', 404);
  return Response.json(src);
}
