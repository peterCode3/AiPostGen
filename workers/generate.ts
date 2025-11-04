/**
 * ============================================
 * ARTICLE GENERATION WORKER
 * ============================================
 * 
 * CORE ENGINE for AI content generation.
 * 
 * FUNCTIONALITY:
 * 1. Takes keyword + sources (optional)
 * 2. Builds SEO prompt
 * 3. Calls GPT-4 Turbo (retry + fallback)
 * 4. Generates 1500+ words
 * 5. Post-processes HTML/SEO
 * 6. Saves as "review" status
 * 
 * FIXES: gpt-4.1→gpt-4-turbo, 700→4000 tokens
 */

// import 'dotenv/config';
// import { Worker } from 'bullmq';
// import { connection } from '../src/lib/queue';
// import { dbConnect } from '../src/lib/db/connect';
// import Article from '../src/lib/db/models/Article';
// import Keyword from '../src/lib/db/models/Keyword';
// import Source from '../src/lib/db/models/Source';
// import { buildPrompt } from '../src/lib/llm/prompt';
// import { generateMarkdown } from '../src/lib/llm/provider';
// import { postProcessHTML } from '../src/lib/seo/postprocess';
// import { makeSlug } from '../src/lib/utils/slug';
// import { estimateCost } from '../src/lib/utils/cost';

// (async () => { await dbConnect(); console.log('[worker] generate connected'); })();

// new Worker('generate', async job => {
//   console.log('[worker] generate job', job.id);
//   const { keywordId, sourceIds, language='en' } = job.data as any;
//   const kw = await Keyword.findById(keywordId);
//   if (!kw) throw new Error('Keyword not found');
//   const sources = await Source.find({ _id: { $in: sourceIds }});
//   const srcSnips = sources.map(s => ({ title: s.metadata?.title || s.url, url: s.url, passages: [] }));

//   const prompt = buildPrompt({ keyword: kw.term, language, sources: srcSnips, slugs: [] });
//   const { markdown, usage } = await generateMarkdown(prompt);
//   const { html, meta } = await postProcessHTML(markdown, { keyword: kw.term });
//   console.log(html, meta)
//   const article = await Article.create({
//     slug: makeSlug(kw.term),
//     title: meta.title,
//     metaTitle: meta.title,
//     metaDescription: meta.description,
//     keywords: [kw.term, ...meta.keywords],
//     outline: meta.outline,
//     content: { markdown, html },
//     seo: meta.seo,
//     sourceRefs: srcSnips.map(s => ({ url: s.url, title: s.title })),
//     status: 'review',
//     cost: estimateCost(usage),
//   });
//   console.log(article._id)

//   return { articleId: String(article._id) };
// }, { connection });


// src/workers/generate.ts
// import 'dotenv/config';
// import { dbConnect } from '../src/lib/db/connect';
// import Article from '../src/lib/db/models/Article';
// import Keyword from '../src/lib/db/models/Keyword';
// import Source from '../src/lib/db/models/Source';
// import { buildPrompt } from '../src/lib/llm/prompt';
// import { generateMarkdown } from '../src/lib/llm/provider';
// import { postProcessHTML } from '../src/lib/seo/postprocess';
// import { makeSlug } from '../src/lib/utils/slug';
// import { estimateCost } from '../src/lib/utils/cost';

// export async function runGenerate({
//   keywordId,
//   sourceIds,
//   language = 'en',
// }: {
//   keywordId: string;
//   sourceIds: string[];
//   language?: string;
// }) {
//   await dbConnect();
//   console.log('[generate] connected');

//   const kw = await Keyword.findById(keywordId);
//   if (!kw) throw new Error('Keyword not found');

//   const sources = await Source.find({ _id: { $in: sourceIds } });
//   const srcSnips = sources.map((s) => ({
//     title: s.metadata?.title || s.url,
//     url: s.url,
//     passages: [],
//   }));

//   const prompt = buildPrompt({
//     keyword: kw.term,
//     language,
//     sources: srcSnips,
//     slugs: [],
//   });

//   const { markdown, usage } = await generateMarkdown(prompt);
//   const { html, meta } = await postProcessHTML(markdown, { keyword: kw.term });

//   const articleCreate = await Article.create({
//     slug: makeSlug(kw.term),
//     title: meta.title,
//     metaTitle: meta.title,
//     metaDescription: meta.description,
//     keywords: [kw.term, ...meta.keywords],
//     outline: meta.outline,
//     content: { markdown, html },
//     seo: meta.seo,
//     sourceRefs: srcSnips.map((s) => ({ url: s.url, title: s.title })),
//     status: 'review',
//     cost: estimateCost(usage),
//   });

//   return { articleId: String(articleCreate._id) };
// }


// import 'dotenv/config';
// import { dbConnect } from '../src/lib/db/connect';
// import Article from '../src/lib/db/models/Article';
// import Keyword from '../src/lib/db/models/Keyword';
// import Source from '../src/lib/db/models/Source';
// import { makeSlug } from '../src/lib/utils/slug';
// import { estimateCost } from '../src/lib/utils/cost';

// export async function runGenerate({
//   keywordId,
//   sourceIds,
//   language = 'en',
// }: {
//   keywordId: string;
//   sourceIds: string[];
//   language?: string;
// }) {
//   await dbConnect();
//   console.log('[generate] connected');

//   const kw = await Keyword.findById(keywordId);
//   if (!kw) throw new Error('Keyword not found');

//   const sources = await Source.find({ _id: { $in: sourceIds } });
//   const srcSnips = sources.map((s) => ({
//     title: s.metadata?.title || s.url,
//     url: s.url,
//     passages: [],
//   }));

//   // 🔹 Instead of OpenAI, create dummy content
//   const markdown = `# ${kw.term}\n\nThis is a dummy article for keyword **${kw.term}**.\n\nGenerated locally without OpenAI.`;
//   const html = `<h1>${kw.term}</h1><p>This is a dummy article for keyword <strong>${kw.term}</strong>.</p>`;
//   const meta = {
//     title: `Dummy Article about ${kw.term}`,
//     description: `This is a placeholder article generated without OpenAI for keyword "${kw.term}".`,
//     keywords: [kw.term, "dummy", "placeholder"],
//     outline: ["Introduction", "Main Content", "Conclusion"],
//     seo: { score: 80 },
//   };

//   const article = await Article.create({
//     slug: makeSlug(kw.term),
//     title: meta.title,
//     metaTitle: meta.title,
//     metaDescription: meta.description,
//     keywords: [kw.term, ...meta.keywords],
//     outline: meta.outline,
//     content: { markdown, html },
//     seo: meta.seo,
//     sourceRefs: srcSnips.map((s) => ({ url: s.url, title: s.title })),
//     status: 'review',
//     cost: estimateCost({ total_tokens: 0 }), // 0 cost since no AI call
//   });

//   return { articleId: String(article._id) };
// }



/**
 * Article Generation Worker - ENHANCED
 * ✅ Better error handling
 * ✅ Progress logging
 * ✅ Cost tracking
 * ✅ Input validation
 * ✅ Retry logic via provider
 */

import 'dotenv/config';
import { dbConnect } from '../src/lib/db/connect';
import Article from '../src/lib/db/models/Article';
import Keyword from '../src/lib/db/models/Keyword';
import Source from '../src/lib/db/models/Source';
import { buildPrompt, buildPromptNoSource } from '../src/lib/llm/prompt';
import { generateMarkdown } from '../src/lib/llm/provider';
import { postProcessHTML } from '../src/lib/seo/postprocess';
import { makeSlug } from '../src/lib/utils/slug';
import { estimateCost } from '../src/lib/utils/cost';

export interface GenerateOptions {
  keywordId: string;
  sourceIds?: string[];
  language?: 'en' | 'ar';
  customInstructions?: string;
  wordCount?: number;
}

export interface GenerateResult {
  articleId: string;
  slug: string;
  title: string;
  wordCount: number;
  cost: any;
  meta: any;
}

export async function runGenerate(options: GenerateOptions): Promise<GenerateResult> {
  const {
    keywordId,
    sourceIds,
    language = 'en',
    customInstructions,
    wordCount = 1500
  } = options;

  console.log('[generate] 🚀 Starting article generation...');
  console.log('[generate] Options:', { keywordId, language, sourceCount: sourceIds?.length || 0 });

  try {
    // 1. Connect to database
    await dbConnect();
    console.log('[generate] ✅ Database connected');

    // 2. Fetch keyword
    const kw = await Keyword.findById(keywordId);
    if (!kw) {
      throw new Error(`Keyword not found: ${keywordId}`);
    }
    console.log(`[generate] 📝 Keyword: "${kw.term}"`);

    // 3. Prepare sources and build prompt
    let prompt: string;
    let srcSnips: any[] = [];

    if (sourceIds && sourceIds.length > 0) {
      console.log(`[generate] 📚 Fetching ${sourceIds.length} sources...`);
      const sources = await Source.find({ _id: { $in: sourceIds } });
      console.log(`[generate] ✅ Found ${sources.length} sources`);

      srcSnips = sources.map((s) => ({
        title: s.metadata?.title || s.url,
        url: s.url,
        passages: [s.text?.slice(0, 2000) || ''], // First 2000 chars for context
      }));

      prompt = buildPrompt({
        keyword: kw.term,
        language,
        sources: srcSnips,
        slugs: [],
        wordCount,
        tone: 'professional'
      });
    } else {
      console.log('[generate] 🤖 Running in no-source mode (AI knowledge only)');
      prompt = buildPromptNoSource({ 
        keyword: kw.term, 
        language,
        wordCount 
      });
    }

    // Add custom instructions if provided
    if (customInstructions) {
      prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nADDITIONAL INSTRUCTIONS:\n${customInstructions}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    console.log(`[generate] 📏 Prompt length: ${prompt.length} characters`);

    // 4. Generate content with LLM
    console.log('[generate] 🤖 Calling LLM (with retry logic)...');
    const startTime = Date.now();

    const result = await generateMarkdown(prompt, {
      temperature: 0.5,
      maxTokens: 4000,
      retries: 3
    });

    const generationTime = Date.now() - startTime;
    const { markdown, usage, provider, attempts } = result;

    console.log(`[generate] ✅ Content generated in ${generationTime}ms`);
    console.log(`[generate] 📊 Provider: ${provider}, Attempts: ${attempts || 1}`);
    console.log(`[generate] 📊 Tokens: ${usage?.total_tokens || 0} (${usage?.prompt_tokens}+${usage?.completion_tokens})`);

    const actualWordCount = markdown.split(/\s+/).length;
    console.log(`[generate] 📝 Word count: ${actualWordCount}`);

    // 5. Post-process HTML
    console.log('[generate] 🔧 Post-processing HTML...');
    const { html, meta } = await postProcessHTML(markdown, { keyword: kw.term });
    console.log('[generate] ✅ Post-processing complete');

    // 6. Generate unique slug
    let baseSlug = makeSlug(kw.term);
    let slug = baseSlug;
    let counter = 1;

    while (await Article.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    console.log(`[generate] 🔗 Slug: ${slug}`);

    // 7. Calculate cost
    const cost = estimateCost(usage || { total_tokens: 0 });
    console.log(`[generate] 💰 Estimated cost: $${cost.totalUSD.toFixed(4)}`);

    // 8. Save article to database
    console.log('[generate] 💾 Saving to database...');
    const article = await Article.create({
      slug,
      title: meta.title,
      metaTitle: meta.title,
      metaDescription: meta.description,
      keywords: [kw.term, ...(meta.keywords || [])],
      keywordId: kw._id,
      prompt,
      outline: meta.outline || [],
      content: { markdown, html },
      seo: meta.seo || {},
      canonicalUrl: `/articles/${slug}`,
      language,
      sourceRefs: srcSnips.map((s) => ({ url: s.url, title: s.title })),
      status: 'review',
      cost: {
        ...cost,
        provider,
      },
    });

    // 9. Update keyword status
    kw.used = true;
    kw.usedAt = new Date();
    await kw.save();

    console.log(`[generate] ✅ Article created: ${article._id}`);
    console.log(`[generate] 🎉 Generation complete!`);

    return {
      articleId: String(article._id),
      slug: article.slug,
      title: article.title,
      wordCount: actualWordCount,
      cost: article.cost,
      meta,
    };

  } catch (error: any) {
    console.error('[generate] ❌ Generation failed:', error.message);
    console.error('[generate] Error details:', {
      message: error.message,
      stack: error.stack,
      keywordId,
      sourceIds,
      language,
    });

    throw new Error(`Article generation failed: ${error.message}`);
  }
}
