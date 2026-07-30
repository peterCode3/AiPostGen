/**
 * AiPostGen worker — Cloud Run entrypoint (replaces the SQS-triggered Lambda).
 *
 * Pub/Sub delivers by HTTP push rather than the Lambda `Records` envelope, so
 * this unwraps the push body and dispatches to the same run* functions the
 * Lambda used. Message shapes are unchanged:
 *   { "type": "generate",        "payload": { keywordId, sourceIds?, language? } }
 *   { "type": "scrape",          "payload": { urls: string[] } }
 *   { "type": "auto-dentist",    "payload"?: {} }
 *   { "type": "backfill-images", "payload"?: { limit? } }
 *
 * Ack semantics replace SQS partial-batch-failure (Pub/Sub push is one message
 * per request, so the batch shape is unnecessary):
 *   204 -> acked (done, or permanently rejected — retrying would poison it)
 *   500 -> nacked, Pub/Sub redelivers until the dead-letter policy fires
 *
 * `src/lambda/handler.ts` is intentionally left in place; it is AWS-only and
 * carries no risk while the migration is in flight.
 */

import 'dotenv/config';
import http from 'node:http';
import { runGenerate } from '../../workers/generate';
import { runScrape } from '../../workers/scrape';
import { runAutoDentistFlow } from '../lib/autoDentistFlow/articlesai';
import { runBackfillImages } from '../lib/images/backfill';

type Msg =
  | { type: 'generate'; payload: { keywordId: string; sourceIds?: string[]; language?: 'en' | 'ar' } }
  | { type: 'scrape'; payload: { urls: string[] } }
  | { type: 'auto-dentist'; payload?: Record<string, unknown> }
  | { type: 'backfill-images'; payload?: { limit?: number } };

async function dispatch(msg: Msg, messageId: string): Promise<void> {
  console.log(`[worker] ${messageId} type=${msg.type}`);

  if (msg.type === 'generate') {
    const out = await runGenerate(msg.payload as any);
    console.log(`[worker] ${messageId} generate ok articleId=${out.articleId}`);
  } else if (msg.type === 'scrape') {
    const out = await runScrape(msg.payload.urls);
    console.log(`[worker] ${messageId} scrape ok saved=${out.saved}`);
  } else if (msg.type === 'auto-dentist') {
    const out = await runAutoDentistFlow();
    const queued = (out as any[]).filter((r) => r.status === 'queued').length;
    console.log(`[worker] ${messageId} auto-dentist ok queued=${queued}`);
  } else if (msg.type === 'backfill-images') {
    const out = await runBackfillImages(msg.payload || {});
    console.log(`[worker] ${messageId} backfill-images ok ${JSON.stringify(out)}`);
  } else {
    throw new Error(`Unknown job type: ${(msg as any).type}`);
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/healthz')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'aipostgen-worker' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }

  let messageId = 'unknown';
  try {
    const raw = await readBody(req);
    const envelope = JSON.parse(raw);
    const message = envelope?.message;
    if (!message) throw new Error("missing 'message' in Pub/Sub push envelope");

    messageId = message.messageId || 'unknown';
    const decoded = message.data
      ? Buffer.from(message.data, 'base64').toString('utf8')
      : JSON.stringify(message.attributes || {});
    const msg = JSON.parse(decoded) as Msg;

    await dispatch(msg, messageId);
    res.writeHead(204).end();
  } catch (err: any) {
    // Malformed payloads can never succeed on retry — ack them so they do not
    // consume the whole delivery-attempt budget. Everything else is retried.
    const permanent =
      err instanceof SyntaxError ||
      /missing 'message'|Unknown job type/.test(err?.message || '');
    console.error(`[worker] ${messageId} failed (${permanent ? 'permanent' : 'transient'}):`, err?.message);
    res.writeHead(permanent ? 204 : 500).end();
  }
});

const port = Number(process.env.PORT || 8080);
server.listen(port, () => console.log(`[worker] listening on ${port}`));
