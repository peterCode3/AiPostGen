import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';
import Keyword from '@/lib/db/models/Keyword';
import Source from '@/lib/db/models/Source';
import { buildPrompt } from '@/lib/llm/prompt';
import { generateMarkdown } from '@/lib/llm/provider';
import { postProcessHTML } from '@/lib/seo/postprocess';
import { makeSlug } from '@/lib/utils/slug';
import { estimateCost } from '@/lib/utils/cost';

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['admin','editor','contributor']);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { keywordId, sourceIds, language = 'en' } = await req.json();
  if (!keywordId || !Array.isArray(sourceIds) || !sourceIds.length) {
    return NextResponse.json({ error: 'keywordId and sourceIds[] required' }, { status: 400 });
  }

  await dbConnect();
  const kw = await Keyword.findById(keywordId);
  if (!kw) return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
  const sources = await Source.find({ _id: { $in: sourceIds }});
  const srcSnips = sources.map(s => ({ title: s.metadata?.title || s.url, url: s.url, passages: [] }));

  const prompt = buildPrompt({ keyword: kw.term, language, sources: srcSnips, slugs: [] });
  const { markdown, usage } = await generateMarkdown(prompt);
  const { html, meta } = await postProcessHTML(markdown, { keyword: kw.term });

  const article = await Article.create({
    slug: makeSlug(kw.term),
    title: meta.title,
    metaTitle: meta.title,
    metaDescription: meta.description,
    keywords: [kw.term, ...(meta.keywords || [])],
    outline: meta.outline,
    content: { markdown, html },
    seo: meta.seo,
    sourceRefs: srcSnips.map(s => ({ url: s.url, title: s.title })),
    status: 'review',
    cost: estimateCost(usage),
  });

  return NextResponse.json({ articleId: String(article._id), slug: article.slug });
}
