// import { NextRequest } from 'next/server';
// import { requireRole } from '@/lib/auth/rbac';


import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';
import { requireRole } from '@/lib/auth/rbac';
import { qGenerate } from '@/lib/queue';

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['admin','editor','contributor']);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: 401 });
  const { keywordId, sourceIds, language='en' } = await req.json();
  if (!keywordId || !Array.isArray(sourceIds) || !sourceIds.length) {
    return new Response(JSON.stringify({ error: 'keywordId and sourceIds[] required' }), { status: 400 });
  }
  const job = await qGenerate.add('generate', { keywordId, sourceIds, language }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 }});
  return Response.json({ jobId: job.id });
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['admin','editor','contributor','viewer']);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: 401 });

  await dbConnect();
  const articles = await Article.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return Response.json(articles);
}
