import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { getQueueCounts } from '@/lib/queue';

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['admin', 'editor']);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: 401 });

  const counts = await getQueueCounts();
  return Response.json({
    queue: 'aipostgen-jobs',
    counts,
    note:
      'Pub/Sub-backed; per-message bodies are not visible without consuming. ' +
      'Use Cloud Logging (Cloud Run service aipostgen-worker) for processing detail. ' +
      'counts.configured=false means the backlog metric was unavailable, not that the queue is empty.',
  });
}
