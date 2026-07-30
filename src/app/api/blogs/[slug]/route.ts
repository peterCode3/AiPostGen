import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';

/**
 * Public API endpoint to get a single published blog by slug.
 * No authentication required at the application layer — gated at the ALB.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const lang = req.nextUrl.searchParams.get('lang');
    await dbConnect();

    const filter: Record<string, unknown> = { slug, status: 'published' };
    if (lang) filter.language = lang;

    const article: any = await Article.findOne(filter)
      .lean()
      .select(
        'title content metaTitle metaDescription featuredImage createdAt publishedAt language slug _id keywords seo keywordId',
      );

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Attach sibling-language slugs so the web app can switch locales on the
    // same article without 404'ing.
    if (article.keywordId) {
      const siblings: any[] = await Article.find({
        keywordId: article.keywordId,
        status: 'published',
      })
        .select('language slug')
        .lean();
      const alternates: Record<string, string> = {};
      for (const s of siblings) {
        if (s.language && s.slug) alternates[s.language] = s.slug;
      }
      article.alternates = alternates;
    }

    return NextResponse.json(article);
  } catch (error: any) {
    console.error('[blogs:detail] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch blog' },
      { status: 500 },
    );
  }
}
