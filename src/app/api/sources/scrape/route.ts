import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import Source from '@/lib/db/models/Source';
import { dbConnect } from '@/lib/db/connect';

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['admin','editor','contributor']);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  await dbConnect();
  const { url, name } = await req.json();
  
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  try {
    const src = await Source.create({
      url,
      name: name || url,
      domain: new URL(url).hostname,
      robotsAllowed: true,
      fetchedAt: new Date(),
    });
    return NextResponse.json(src);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



