/**
 * AiPostGen worker Lambda.
 *
 * Triggered by SQS via event-source mapping. Each message body looks like
 *   { "type": "generate", "payload": { keywordId, sourceIds, language? } }
 *   { "type": "scrape",   "payload": { urls: string[] } }
 *
 * Returns SQSBatchResponse partial-failure shape so successful messages are
 * deleted and failed ones get redriven (or hit the DLQ after max receives).
 */

import 'dotenv/config';
import type { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { runGenerate } from '../../workers/generate';
import { runScrape } from '../../workers/scrape';
import { runAutoDentistFlow } from '../lib/autoDentistFlow/articlesai';
import { runBackfillImages } from '../lib/images/backfill';

type Msg =
  | { type: 'generate'; payload: { keywordId: string; sourceIds?: string[]; language?: 'en' | 'ar' } }
  | { type: 'scrape'; payload: { urls: string[] } }
  | { type: 'auto-dentist'; payload?: Record<string, unknown> }
  | { type: 'backfill-images'; payload?: { limit?: number } };

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    const messageId = record.messageId;
    try {
      const msg = JSON.parse(record.body) as Msg;
      console.log(`[lambda] ${messageId} type=${msg.type}`);

      if (msg.type === 'generate') {
        const out = await runGenerate(msg.payload as any);
        console.log(`[lambda] ${messageId} generate ok articleId=${out.articleId}`);
      } else if (msg.type === 'scrape') {
        const out = await runScrape(msg.payload.urls);
        console.log(`[lambda] ${messageId} scrape ok saved=${out.saved}`);
      } else if (msg.type === 'auto-dentist') {
        const out = await runAutoDentistFlow();
        const queued = (out as any[]).filter((r) => r.status === 'queued').length;
        console.log(`[lambda] ${messageId} auto-dentist ok queued=${queued}`);
      } else if (msg.type === 'backfill-images') {
        const out = await runBackfillImages(msg.payload || {});
        console.log(`[lambda] ${messageId} backfill-images ok ${JSON.stringify(out)}`);
      } else {
        throw new Error(`Unknown job type: ${(msg as any).type}`);
      }
    } catch (err: any) {
      console.error(`[lambda] ${messageId} failed:`, err.message);
      batchItemFailures.push({ itemIdentifier: messageId });
    }
  }

  return { batchItemFailures };
};
