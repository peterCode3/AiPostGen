/**
 * Job queue — Pub/Sub-backed (was SQS, and BullMQ before that).
 *
 * Producers keep the BullMQ-style `qXxx.add(name, payload, opts?)` shape so no
 * call site changes. The returned id is the Pub/Sub messageId.
 *
 * Queue depth: SQS exposed ApproximateNumberOfMessages directly via
 * GetQueueAttributes. Pub/Sub has no data-plane equivalent — backlog is only
 * visible through Cloud Monitoring, queried lazily below. On failure it reports
 * `configured:false` rather than fake zeros, so the admin view can tell
 * "empty queue" apart from "no metric".
 */

import { PubSub } from '@google-cloud/pubsub';

const TOPIC = process.env.PUBSUB_JOBS_TOPIC || '';
const SUBSCRIPTION = process.env.PUBSUB_JOBS_SUBSCRIPTION || '';
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '';

const pubsub = new PubSub(PROJECT_ID ? { projectId: PROJECT_ID } : {});

type Job = { id?: string };

async function send(type: 'generate' | 'scrape', payload: any): Promise<Job> {
  if (!TOPIC) throw new Error('PUBSUB_JOBS_TOPIC not set');
  const messageId = await pubsub
    .topic(TOPIC)
    .publishMessage({ data: Buffer.from(JSON.stringify({ type, payload })) });
  return { id: messageId };
}

class JobQueue {
  constructor(private type: 'generate' | 'scrape') {}
  async add(_name: string, payload: any, _opts?: unknown): Promise<Job> {
    return send(this.type, payload);
  }
}

export const qGenerate = new JobQueue('generate');
export const qScrape = new JobQueue('scrape');

export async function getQueueCounts() {
  if (!TOPIC || !SUBSCRIPTION) {
    return { visible: 0, inFlight: 0, delayed: 0, configured: false };
  }

  try {
    // Deliberately NOT @google-cloud/monitoring: that client is gRPC-based and
    // loads `protos.json` from disk at runtime, which Next.js does not trace
    // into its build output. It fails with:
    //   ENOENT: no such file or directory, open 'protos.json'
    // The Monitoring REST API needs no protos, so call it directly and use
    // google-auth-library (pure JS) only to mint the token from ADC.
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/monitoring.read'],
    });
    const projectId = PROJECT_ID || (await auth.getProjectId());
    const token = await auth.getAccessToken();
    if (!token) throw new Error('could not obtain access token from ADC');

    const nowSec = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
      filter:
        'metric.type="pubsub.googleapis.com/subscription/num_undelivered_messages" ' +
        `AND resource.label.subscription_id="${SUBSCRIPTION}"`,
      'interval.startTime': new Date((nowSec - 600) * 1000).toISOString(),
      'interval.endTime': new Date(nowSec * 1000).toISOString(),
    });

    const res = await fetch(
      `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`monitoring API ${res.status}: ${await res.text()}`);

    const body = await res.json();
    const series = body?.timeSeries;
    if (!Array.isArray(series) || series.length === 0) {
      // No datapoints yet (e.g. a brand-new subscription). Distinguish this
      // from a genuinely empty queue.
      return { visible: 0, inFlight: 0, delayed: 0, configured: false };
    }

    // Points come newest-first.
    const latest = series[0]?.points?.[0]?.value?.int64Value;
    return {
      visible: Number(latest ?? 0),
      // Pub/Sub exposes no in-flight/delayed split equivalent to SQS's.
      inFlight: 0,
      delayed: 0,
      configured: true,
    };
  } catch (err: any) {
    console.warn('[queue] backlog metric unavailable:', err?.message);
    return { visible: 0, inFlight: 0, delayed: 0, configured: false };
  }
}
