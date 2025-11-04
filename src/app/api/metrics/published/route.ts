import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';
import { requireRole } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['admin', 'editor']);
  if (!auth.ok)
    return new Response(JSON.stringify({ error: auth.error }), { status: 401 });

  await dbConnect();

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const rows = await Article.find(
    {
      status: 'published',
      createdAt: { $gte: since },
    },
    {
      cost: 1,
      title: 1,
      createdAt: 1,
      status: 1,
      publishedAt: 1,
    }
  )
    .sort({ createdAt: -1 })
    .lean();

  const total = rows.reduce((s, r) => s + (r.cost?.totalUSD || 0), 0);

  return Response.json({
    totalUSD: Number(total.toFixed(4)),
    count: rows.length,
    items: rows,
  });
}
