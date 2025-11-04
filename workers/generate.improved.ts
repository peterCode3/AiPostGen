/**
 * Improved Article Generation Worker
 * Features: retry logic, validation, better error handling, cost tracking
 */

import 'dotenv/config';
import { dbConnect } from '../src/lib/db/connect';
import Article from '../src/lib/db/models/Article';
import Keyword from '../src/lib/db/models/Keyword';
import Source from '../src/lib/db/models/Source';
import { buildPrompt, buildPromptNoSource, extractMetadata, validatePrompt } from '../src/lib/llm/prompt.improved';
import { generateMarkdown } from '../src/lib/llm/provider.improved';
import { postProcessHTML } from '../src/lib/seo/postprocess';
import { makeSlug } from '../src/lib/utils/slug';
import { estimateCost } from '../src/lib/utils/cost';

export interface GenerateJobData {
  keywordId: string;
  sourceIds?: string[];
  language?: 'en' | 'ar';
  customPromptInstructions?: string;
  regenerate?: boolean;
  articleId?: string; // For regeneration
}

export interface GenerateResult {
  articleId: string;
  slug: string;
  title: string;
  status: string;
  cost: {
    totalUSD: number;
    tokensIn: number;
    tokensOut: number;
    provider: string;
  };
  meta: any;
}

/**
 * Main generation function
 */
export async function runGenerate(data: GenerateJobData): Promise<GenerateResult> {
  await dbConnect();
  console.log('[generate] 🚀 Starting article generation...');

  const {
    keywordId,
    sourceIds = [],
    language = 'en',
    customPromptInstructions,
    regenerate = false,
    articleId
  } = data;

  try {
    // 1. Fetch keyword
    const keyword = await Keyword.findById(keywordId);
    if (!keyword) {
      throw new Error(`Keyword not found: ${keywordId}`);
    }
    console.log(`[generate] 📝 Keyword: "${keyword.term}"`);

    // 2. Handle regeneration case
    if (regenerate && articleId) {
      return await handleRegeneration(articleId, customPromptInstructions, language);
    }

    // 3. Fetch sources (if provided)
    let srcSnips: any[] = [];
    let prompt: string;

    if (sourceIds && sourceIds.length > 0) {
      console.log(`[generate] 📚 Fetching ${sourceIds.length} sources...`);
      const sources = await Source.find({ _id: { $in: sourceIds } });
      
      srcSnips = sources.map((s) => ({
        title: s.metadata?.title || s.url,
        url: s.url,
        passages: s.text ? [s.text.slice(0, 2000)] : [], // First 2000 chars for context
      }));

      prompt = buildPrompt({
        keyword: keyword.term,
        language,
        sources: srcSnips,
        slugs: [], // TODO: Fetch related article slugs
        tone: 'professional',
        targetAudience: 'dental professionals in Saudi Arabia',
        wordCount: 1500,
      });
    } else {
      console.log('[generate] 🤖 Generating without sources (AI knowledge only)');
      prompt = buildPromptNoSource({
        keyword: keyword.term,
        language,
        tone: 'professional',
        targetAudience: 'dental professionals in Saudi Arabia',
        wordCount: 1500,
      });
    }

    // Add custom instructions if provided
    if (customPromptInstructions) {
      prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nADDITIONAL INSTRUCTIONS:\n${customPromptInstructions}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      throw new Error(`Invalid prompt: ${validation.error}`);
    }

    console.log(`[generate] 📏 Prompt length: ${prompt.length} chars`);

    // 4. Generate content with LLM
    console.log('[generate] 🤖 Calling LLM...');
    const startTime = Date.now();
    
    const { markdown, usage, provider, retries } = await generateMarkdown({
      prompt,
      temperature: 0.5,
      maxTokens: 4000, // Increased for longer articles
      retries: 3,
    });

    const generationTime = Date.now() - startTime;
    console.log(`[generate] ✅ Content generated in ${generationTime}ms (${retries || 0} retries)`);
    console.log(`[generate] 📊 Tokens: ${usage?.total_tokens || 0} (${usage?.prompt_tokens}+${usage?.completion_tokens})`);

    // 5. Extract and validate metadata
    const { content: cleanMarkdown, metadata } = extractMetadata(markdown);
    
    if (!metadata.metaTitle) {
      console.warn('[generate] ⚠️  No metaTitle in response, inferring from content');
    }

    // 6. Post-process HTML
    console.log('[generate] 🔧 Post-processing HTML...');
    const { html, meta } = await postProcessHTML(cleanMarkdown, { 
      keyword: keyword.term 
    });

    // Merge metadata
    const finalMeta = {
      ...meta,
      ...metadata,
      title: metadata.metaTitle || meta.title,
      description: metadata.metaDescription || meta.description,
      keywords: metadata.keywords || meta.keywords,
    };

    // 7. Generate unique slug
    let baseSlug = makeSlug(keyword.term);
    let slug = baseSlug;
    let counter = 1;

    while (await Article.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    console.log(`[generate] 🔗 Slug: ${slug}`);

    // 8. Calculate cost
    const cost = estimateCost(usage || { total_tokens: 0 });
    console.log(`[generate] 💰 Estimated cost: $${cost.totalUSD.toFixed(4)}`);

    // 9. Save article to database
    console.log('[generate] 💾 Saving to database...');
    const article = await Article.create({
      slug,
      title: finalMeta.title,
      metaTitle: finalMeta.title,
      metaDescription: finalMeta.description,
      keywords: [keyword.term, ...(finalMeta.keywords || [])],
      keywordId: keyword._id,
      prompt,
      outline: finalMeta.outline || [],
      content: { markdown: cleanMarkdown, html },
      seo: finalMeta.seo || {},
      canonicalUrl: `/articles/${slug}`,
      language,
      sourceRefs: srcSnips.map((s) => ({ url: s.url, title: s.title })),
      status: 'review', // Always starts in review
      cost: {
        ...cost,
        provider,
      },
    });

    // 10. Update keyword status
    keyword.used = true;
    keyword.usedAt = new Date();
    await keyword.save();

    console.log(`[generate] ✅ Article created: ${article._id}`);

    return {
      articleId: String(article._id),
      slug: article.slug,
      title: article.title,
      status: article.status,
      cost: article.cost as any,
      meta: finalMeta,
    };

  } catch (error: any) {
    console.error('[generate] ❌ Generation failed:', error);
    
    // Log detailed error info
    console.error('[generate] Error details:', {
      message: error.message,
      stack: error.stack,
      keywordId,
      sourceIds,
      language,
    });

    // Rethrow with context
    throw new Error(`Article generation failed: ${error.message}`);
  }
}

/**
 * Handle article regeneration (editing case)
 */
async function handleRegeneration(
  articleId: string,
  customInstructions?: string,
  language: string = 'en'
): Promise<GenerateResult> {
  console.log(`[generate] 🔄 Regenerating article ${articleId}...`);

  const article = await Article.findById(articleId);
  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const keyword = await Keyword.findById(article.keywordId);
  if (!keyword) {
    throw new Error(`Keyword not found for article ${articleId}`);
  }

  // Build regeneration prompt
  let prompt = article.prompt || buildPromptNoSource({
    keyword: keyword.term,
    language,
  });

  if (customInstructions) {
    prompt = `${prompt}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nREGENERATION INSTRUCTIONS:\n${customInstructions}\n\nORIGINAL CONTENT:\n${article.content.markdown}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  // Generate new version
  const { markdown, usage, provider } = await generateMarkdown({
    prompt,
    temperature: 0.6, // Slightly higher for variation
    maxTokens: 4000,
  });

  const { content: cleanMarkdown, metadata } = extractMetadata(markdown);
  const { html, meta } = await postProcessHTML(cleanMarkdown, { 
    keyword: keyword.term 
  });

  const finalMeta = {
    ...meta,
    ...metadata,
    title: metadata.metaTitle || meta.title,
    description: metadata.metaDescription || meta.description,
  };

  // Update article
  const cost = estimateCost(usage || { total_tokens: 0 });
  
  article.title = finalMeta.title;
  article.metaTitle = finalMeta.title;
  article.metaDescription = finalMeta.description;
  article.content = { markdown: cleanMarkdown, html };
  article.seo = finalMeta.seo || {};
  article.prompt = prompt;
  article.cost = {
    totalUSD: (article.cost?.totalUSD || 0) + cost.totalUSD,
    tokensIn: (article.cost?.tokensIn || 0) + cost.tokensIn,
    tokensOut: (article.cost?.tokensOut || 0) + cost.tokensOut,
    provider,
  } as any;

  await article.save();

  console.log(`[generate] ✅ Article regenerated: ${article._id}`);

  return {
    articleId: String(article._id),
    slug: article.slug,
    title: article.title,
    status: article.status,
    cost: article.cost as any,
    meta: finalMeta,
  };
}

/**
 * Batch generation helper
 */
export async function runGenerateBatch(
  jobs: GenerateJobData[]
): Promise<GenerateResult[]> {
  console.log(`[generate] 📦 Running batch generation for ${jobs.length} jobs...`);

  const results: GenerateResult[] = [];
  const errors: Array<{ job: GenerateJobData; error: string }> = [];

  for (const job of jobs) {
    try {
      const result = await runGenerate(job);
      results.push(result);
    } catch (error: any) {
      console.error(`[generate] ❌ Job failed:`, error);
      errors.push({ job, error: error.message });
    }
  }

  console.log(`[generate] ✅ Batch complete: ${results.length} succeeded, ${errors.length} failed`);

  if (errors.length > 0) {
    console.error('[generate] Failed jobs:', JSON.stringify(errors, null, 2));
  }

  return results;
}

/**
 * CLI entry point (for direct script execution)
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: 
  tsx workers/generate.improved.ts <keywordId> [sourceIds...] [--lang ar]
  
Example:
  tsx workers/generate.improved.ts 507f1f77bcf86cd799439011 --lang en
  tsx workers/generate.improved.ts 507f1f77bcf86cd799439011 --lang ar
    `);
    process.exit(1);
  }

  const keywordId = args[0];
  const language = args.includes('--lang') 
    ? args[args.indexOf('--lang') + 1] as 'en' | 'ar'
    : 'en';

  runGenerate({ keywordId, language })
    .then((result) => {
      console.log('\n✅ Generation successful!');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Generation failed:', err.message);
      process.exit(1);
    });
}

