import 'dotenv/config';
import { dbConnect } from '../db/connect';
import Source from '../db/models/Source';
import Keyword from '../db/models/Keyword';
import { qGenerate } from '../queue';
import Anthropic from '@anthropic-ai/sdk';
import got from 'got';
import * as cheerio from 'cheerio';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
console.log('Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? 'Loaded' : 'Missing');

async function claudeText(prompt: string, maxTokens = 512): Promise<string> {
  const res = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}
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
  const results: { url: string; title: string }[] = [];
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

// Defensive parser: takes Claude's response (which sometimes includes markdown
// tables, numbering, or **bold** markers) and returns clean 3–8 word keyword
// phrases — one per line, max 10.
function parseKeywords(raw: string, max = 10): string[] {
  const out: string[] = [];
  for (const lineRaw of raw.split('\n')) {
    let line = lineRaw.trim();
    if (!line) continue;
    // Skip markdown headings, table separators, decorative dividers
    if (/^[#>|`*\-=_~]/.test(line) && !/^\*\*/.test(line)) continue;
    // Strip leading numbering like "1.", "1)", "- ", "* "
    line = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*•]\s*/, '');
    // Pull out **bold** content if present (Claude often emphasizes the keyword)
    const bold = line.match(/\*\*([^*]{3,80})\*\*/);
    if (bold) line = bold[1];
    // Strip remaining markdown markers
    line = line
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^["'`]+|["'`]+$/g, '')
      .trim();
    // Reject empty, too long, table headers, or lines containing pipes/colons
    if (!line || line.length > 80 || line.length < 5) continue;
    if (/^(keyword|original|natural|search intent|seo|category)/i.test(line)) continue;
    if (line.includes('|')) continue;
    // Reject lines that look like sentences (multiple commas, end punctuation)
    if (/[.!?]$/.test(line)) continue;
    if ((line.match(/,/g) || []).length > 2) continue;
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

async function extractKeywords(text: string) {
  const prompt = `Extract exactly 10 high-value SEO keywords related to dentistry, AI, and healthcare from the source text below.

STRICT OUTPUT FORMAT:
- Output ONLY the 10 keyword phrases, one per line.
- 3–8 words each.
- NO numbering, NO bullets, NO markdown, NO bold, NO quotes, NO explanations, NO headings, NO tables.
- NO leading or trailing punctuation.

Source:
${text.slice(0, 4000)}`;
  const raw = await claudeText(prompt, 600);
  return parseKeywords(raw);
}

async function rephraseKeywords(keywords: string[]) {
  if (keywords.length === 0) return [];
  const prompt = `Rephrase each of the following SEO keywords naturally without changing meaning. Keep them concise.

STRICT OUTPUT FORMAT:
- Output exactly ${keywords.length} lines, one rephrased keyword per line.
- 3–8 words each.
- NO numbering, NO bullets, NO markdown, NO bold, NO quotes, NO explanations, NO headings, NO tables, NO commentary.

Input keywords (one per line):
${keywords.join('\n')}`;
  const raw = await claudeText(prompt, 600);
  const parsed = parseKeywords(raw, keywords.length);
  // Fallback: if parsing collapsed to nothing, return originals so the flow
  // still produces articles instead of going silent.
  return parsed.length > 0 ? parsed : keywords;
}

export async function runAutoDentistFlow() {
  await dbConnect();
  console.log('[autoDentistFlow] connected ✅');

  const urls = await findTopDentistBlogs();
  console.log('🦷 Found dentist blogs:', urls);

  const scraped = await scrapeAndSave(urls);
  console.log('✅ Scraped:', scraped.length);

  const allText =
    scraped.map(s => s.title).join(' ') +
    ' ' + (await Source.find().limit(5)).map(s => s.text).join(' ');

  const keywords = await extractKeywords(allText);
  const rephrased = await rephraseKeywords(keywords);

  console.log('✨ Rephrased keywords:', rephrased);

  // Limit how many articles we generate per run; configurable via env, defaults
  // to 3 keywords × N languages so the schedule doesn't flood DocDB.
  const dailyKeywords = Number(process.env.AUTO_DENTIST_DAILY_KEYWORDS || 3);
  const languagesEnv = (process.env.AUTO_DENTIST_LANGUAGES || 'en,ar')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as Array<'en' | 'ar'>;

  const selectedKeywords = rephrased.slice(0, dailyKeywords);
  const serializedResults: { title?: string; url?: string; status: string; language?: string }[] = [];

  for (const term of selectedKeywords) {
    const kw = await Keyword.findOneAndUpdate(
      { term },
      { term, used: false },
      { upsert: true, new: true }
    );

    for (const lang of languagesEnv) {
      await qGenerate.add('generate', {
        keywordId: String(kw._id),
        sourceIds: [],
        language: lang,
      });
      serializedResults.push({ title: kw.term, status: 'queued', language: lang });
    }

    kw.used = true;
    kw.usedAt = new Date();
    await kw.save();
  }

  scraped.forEach(s => {
    serializedResults.push({ title: s.title, url: s.url, status: 'scraped' });
  });

  console.log('🎉 Auto Dentist Flow completed ✅');
  return serializedResults;
}

// Optional CLI support.
//
// ⚠ `require.main === module` alone is NOT safe here. When this module is pulled
// into a single-file esbuild bundle that is then run directly (`node worker.cjs`),
// the guard evaluates true and the whole auto-dentist flow fires at process
// startup — burning Serper quota and Anthropic tokens, and enqueueing generate
// jobs that wake the worker again in a self-feeding loop. Observed for real on
// Cloud Run 2026-07-29.
//
// The explicit env opt-in makes the CLI path impossible to trigger by accident,
// regardless of how the module is bundled or invoked.
if (require.main === module && process.env.RUN_AUTO_DENTIST_CLI === '1') {
  runAutoDentistFlow()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}
