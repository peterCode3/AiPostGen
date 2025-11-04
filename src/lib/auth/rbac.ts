import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

type Role = 'admin'|'editor'|'contributor'|'viewer';
const SECRET = process.env.NEXTAUTH_SECRET!;

export type SessionUser = { id: string; email: string; role: Role; name?: string };

export function signSession(user: SessionUser) {
  return jwt.sign(user, SECRET, { expiresIn: '7d' });
}

export function requireRole(req: NextRequest, allowed: Role[] = ['admin','editor']) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { ok: false, error: 'Missing bearer token' } as const;
  try {
    const user = jwt.verify(token, SECRET) as SessionUser;
    if (!allowed.includes(user.role)) return { ok: false, error: 'Forbidden' } as const;
    return { ok: true, user } as const;
  } catch {
    return { ok: false, error: 'Invalid token' } as const;
  }
}
