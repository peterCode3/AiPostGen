import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { qGenerate, qScrape } from '@/lib/queue';

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['admin','editor']);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: 401 });
  const [gen, scr] = await Promise.all([qGenerate.getJobs(['waiting','active','delayed']), qScrape.getJobs(['waiting','active','delayed'])]);
  
  const genJobs = await Promise.all(gen.map(async (j) => ({ 
    id: j.id, 
    name: j.name, 
    data: j.data, 
    state: await j.getState() 
  })));
  
  const scrJobs = await Promise.all(scr.map(async (j) => ({ 
    id: j.id, 
    name: j.name, 
    data: j.data, 
    state: await j.getState() 
  })));
  
  return Response.json({ generate: genJobs, scrape: scrJobs });
}
