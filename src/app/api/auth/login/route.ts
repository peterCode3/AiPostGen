import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // TODO: replace with real user lookup. For now: hardcoded dev creds.
  if (email === 'admin@example.com' && password === 'admin123') {
    const token = signSession({ id: 'u1', email, role: 'admin', name: 'Admin' });
    return NextResponse.json({ token });
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
