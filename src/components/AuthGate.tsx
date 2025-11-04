'use client';
import { ReactNode, useMemo } from 'react';

export default function AuthGate({ children }: { children: ReactNode }) {
  // stub: use real auth; in dev you can hardcode a bearer token
  return <>{children}</>;
}
