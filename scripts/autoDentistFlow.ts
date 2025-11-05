import 'dotenv/config';
import { dbConnect } from '../src/lib/db/connect';
import Source from '../src/lib/db/models/Source';
import Keyword from '../src/lib/db/models/Keyword';
import { qScrape, qGenerate } from '../src/lib/queue';
import { GoogleGenerativeAI } from '@google/generative-ai';
import got from 'got';
import * as cheerio from 'cheerio';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
console.log('✅ Google Gemini API Key:', process.env.GOOGLE_API_KEY ? 'Loaded' : 'Missing');
async function findTopDentistBlogs() {
  console.log('🔍 Finding top dentist blogs...');
  
  // Get existing URLs from database to avoid duplicates
  const existingSources = await Source.find({}, { url: 1 });
  const existingUrls = new Set(existingSources.map(s => s.url));
  console.log(`📊 Found ${existingUrls.size} existing URLs in database`);
  
  const uniqueUrls: string[] = [];
  let page = 0;
  const maxPages = 5; // Limit search to 5 pages (50 results max)
  
  while (uniqueUrls.length < 10 && page < maxPages) {
    const start = page * 10;
    console.log(`🔎 Searching page ${page + 1}... (starting at result ${start})`);
    
    const res = await got.post('https://google.serper.dev/search', {
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      json: { 
        q: 'top dentist blogs 2025 OR dental technology articles OR AI dentistry', 
        num: 10,
        start: start
      },
    }).json<any>();
    
    const pageUrls = res.organic?.map((r: any) => r.link) || [];
    
    for (const url of pageUrls) {
      // Skip if URL already exists in database OR already added to current batch
      if (!existingUrls.has(url) && !uniqueUrls.includes(url)) {
        uniqueUrls.push(url);
        console.log(`✅ New URL found: ${url}`);
        
        if (uniqueUrls.length >= 10) break;
      } else {
        console.log(`⏭️  Skipping duplicate: ${url}`);
      }
    }
    
    page++;
    
    // Small delay between pages to respect rate limits
    if (uniqueUrls.length < 10 && page < maxPages) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`🎯 Found ${uniqueUrls.length} new unique URLs`);
  return uniqueUrls;
}

async function scrapeAndSave(urls: string[]) {
  const results: any[] = [];
  for (const url of urls) {
    try {
      const res = await got(url, { timeout: { request: 15000 } });
      const html = res.body;
      const $ = cheerio.load(html);
      const title = $('h1').first().text() || $('title').text();
      const main = $('article').text() || $('main').text() || $('body').text();
      const text = main.replace(/\s+/g, ' ').trim();

      await Source.updateOne(
        { url },
        {
          url,
          domain: new URL(url).hostname,
          robotsAllowed: true,
          generatedAt: new Date(),
          rawHtml: html,
          text,
          metadata: { title },
        },
        { upsert: true }
      );
      results.push({ url, title });
    } catch {
      console.warn('Failed scrape:', url);
    }
  }
  return results;
}

async function extractKeywords(text: string) {
  const prompt = `Extract exactly 10 high-value SEO keywords related to dentistry, AI, and healthcare.
Return ONLY the keywords, one per line, without numbering, without explanations, without markdown formatting.

Text:
${text.slice(0, 4000)}`;
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  
  const raw = result.response.text();
  return raw.split('\n')
    .map((k: string) => k.replace(/^\d+[\.\)\-\*]\s*/, '').replace(/^[\*\-]\s*/, '').trim())
    .filter(k => k.length > 0 && !k.startsWith('**'))
    .slice(0, 10);
}

async function rephraseKeywords(keywords: string[]) {
  const prompt = `Rephrase these keywords naturally for SEO without changing their meaning.
Return ONLY the rephrased keywords, one per line, without numbering, without explanations, without markdown formatting.

Keywords:
${keywords.join('\n')}`;
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  
  const raw = result.response.text();
  return raw.split('\n')
    .map((k: string) => k.replace(/^\d+[\.\)\-\*]\s*/, '').replace(/^[\*\-]\s*/, '').trim())
    .filter(k => k.length > 0 && !k.startsWith('**'))
    .slice(0, 10);
}

export async function runAutoDentistFlow() {
  await dbConnect();
  console.log('[autoDentistFlow] connected ✅');

  const urls = await findTopDentistBlogs();
  console.log('🦷 Found dentist blogs:', urls);

  const scraped = await scrapeAndSave(urls);
  console.log('✅ Scraped:', scraped.length);

  const allText = scraped.map(s => s.title).join(' ') +
    ' ' + (await Source.find().limit(5)).map(s => s.text).join(' ');

  const keywords = await extractKeywords(allText);
  const rephrased = await rephraseKeywords(keywords);

  console.log('✨ Rephrased keywords:', rephrased);

  const results = [];

  for (const term of rephrased) {
    const kw = await Keyword.findOneAndUpdate(
      { term },
      { term, used: false },
      { upsert: true, new: true }
    );

    await qGenerate.add('generate', {
      keywordId: String(kw._id),
      sourceIds: [],
      language: 'en'
    });

    kw.used = true;
    kw.usedAt = new Date();
    await kw.save();
    
    results.push({ keyword: term, keywordId: String(kw._id) });
  }


  console.log('🎉 Auto Dentist Flow completed — articles queued for generation!');
  return results;
}

if (require.main === module) {
  runAutoDentistFlow()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}
