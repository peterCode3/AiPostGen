import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // REQUIRED for BullMQ
});

export const qGenerate = new Queue('generate', { connection });
export const qScrape   = new Queue('scrape',   { connection });
