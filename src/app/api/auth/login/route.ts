import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  // Fail closed: if env credentials aren't configured, reject every login
  // attempt — never fall back to a hard-coded default.
  if (!expectedEmail || !expectedPassword) {
    console.error('[auth] ADMIN_EMAIL / ADMIN_PASSWORD not configured');
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  if (email === expectedEmail && password === expectedPassword) {
    const token = signSession({ id: 'u1', email, role: 'admin', name: 'Admin' });
    return NextResponse.json({ token });
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
