import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Source from '@/lib/db/models/Source';
import { requireRole } from '@/lib/auth/rbac';
import { jsonError } from '@/lib/utils/errors';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireRole(req, ['admin', 'editor']);
  if (!auth.ok) return jsonError(auth.error, 401);

  const { id } = await context.params;
  if (!id) return jsonError('ID required', 400);

  await dbConnect();
  
  try {
    const deleted = await Source.findByIdAndDelete(id);
    if (!deleted) return jsonError('Source not found', 404);
    return Response.json({ success: true, message: 'Source deleted successfully' });
  } catch (error: any) {
    console.error('[sources:delete] Error:', error);
    return jsonError(error.message || 'Delete failed', 500);
  }
}



