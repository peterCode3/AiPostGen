import { NextResponse } from 'next/server';

/**
 * Liveness endpoint for the Cloud Run probes.
 *
 * Shallow by design: it proves the process is serving and nothing more. It must
 * NOT touch Cloud SQL or Pub/Sub — a liveness probe wired to a dependency turns
 * a brief blip into a simultaneous restart of every instance, which is worse
 * than the blip itself. Dependency health is covered by uptime checks and the
 * Cloud SQL / dead-letter alerts.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { status: 'ok', service: 'aipostgen-web', ts: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
