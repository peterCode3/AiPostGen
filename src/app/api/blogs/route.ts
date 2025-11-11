import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';

/**
 * Public API endpoint to get published blogs
 * No authentication required
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get only published articles, sorted by newest first
    const articles = await Article.find({ status: 'published' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean()
      .select('title content metaTitle metaDescription featuredImage createdAt publishedAt language slug _id');

    return NextResponse.json(articles);
  } catch (error: any) {
    console.error('[blogs:list] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch blogs' },
      { status: 500 }
    );
  }
}

