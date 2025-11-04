// import 'dotenv/config';
// import { Worker } from 'bullmq';
// import { connection } from '../src/lib/queue';
// import { dbConnect } from '../src/lib/db/connect';
// import Source from '../src/lib/db/models/Source';
// import { robotsAllowed } from '../src/lib/scrape/robots';
// import { fetchAndParse } from '../src/lib/scrape/fetchPage';
// import crypto from 'node:crypto';

// (async () => { await dbConnect(); console.log('[worker] scrape connected'); })();

// new Worker('scrape', async job => {
//   console.log('[worker] scrape job', job.id);
//   const { urls } = job.data as { urls: string[] };
//   for (const url of urls) {
//     if (!(await robotsAllowed(url))) { console.log('robots disallow', url); continue; }
//     const { title, text, rawHtml } = await fetchAndParse(url);
//     const hash = crypto.createHash('sha256').update(text.slice(0, 2000)).digest('hex');
//     await Source.updateOne({ url }, {
//       url, domain: new URL(url).hostname, robotsAllowed: true,
//       fetchedAt: new Date(), rawHtml, text, metadata: { title }, hash,
//     }, { upsert: true });
//   }
//   return { saved: urls.length };
// }, { connection });


// src/workers/scrape.ts
import 'dotenv/config';
import { dbConnect } from '../src/lib/db/connect';
import Source from '../src/lib/db/models/Source';
import { robotsAllowed } from '../src/lib/scrape/robots';
import { fetchAndParse } from '../src/lib/scrape/fetchPage';
import crypto from 'node:crypto';

export async function runScrape(urls: string[]) {
  await dbConnect();
  console.log('[scrape] connected');

  const results: any[] = [];

  for (const url of urls) {
    if (!(await robotsAllowed(url))) {
      console.log('robots disallow', url);
      continue;
    }

    const { title, text, rawHtml } = await fetchAndParse(url);
    const hash = crypto.createHash('sha256')
      .update(text.slice(0, 2000))
      .digest('hex');

    await Source.updateOne(
      { url },
      {
        url,
        domain: new URL(url).hostname,
        robotsAllowed: true,
        fetchedAt: new Date(),
        rawHtml,
        text,
        metadata: { title },
        hash,
      },
      { upsert: true }
    );

    results.push({ url, title });
  }

  return { saved: results.length, results };
}


// import 'dotenv/config';
// import { dbConnect } from '../src/lib/db/connect';
// import Source from '../src/lib/db/models/Source';
// import crypto from 'node:crypto';

// export async function runScrape(urls: string[]) {
//   await dbConnect();
//   console.log('[scrape] connected (dummy mode)');

//   const results: any[] = [];

//   for (const url of urls) {
//     // 🔹 Instead of real scraping, just make fake content
//     const title = `Dummy Title for ${url}`;
//     const text = `This is dummy scraped content for ${url}. It simulates article text without real scraping.`;
//     const rawHtml = `<html><head><title>${title}</title></head><body><p>${text}</p></body></html>`;

//     const hash = crypto.createHash('sha256')
//       .update(text.slice(0, 2000))
//       .digest('hex');

//     await Source.updateOne(
//       { url },
//       {
//         url,
//         domain: new URL(url).hostname,
//         robotsAllowed: true,
//         fetchedAt: new Date(),
//         rawHtml,
//         text,
//         metadata: { title },
//         hash,
//       },
//       { upsert: true }
//     );

//     results.push({ url, title });
//   }

//   return { saved: results.length, results };
// }
