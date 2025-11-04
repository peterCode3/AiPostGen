import { NextRequest, NextResponse } from 'next/server';
import { runAutoDentistFlow } from '../../../../scripts/autoDentistFlow';

/**
 * ============================================
 * AUTO DENTIST FLOW - COMPLETE AUTOMATION
 * ============================================
 * 
 * This is the MAIN AUTOMATIC FLOW that does everything:
 * 
 * STEP 1: Find Top 10 Dental Articles
 *   - Uses SerperAPI to search Google
 *   - Query: "dental industry" or custom
 *   - Returns: Top 10 URLs
 * 
 * STEP 2: Scrape Each Article
 *   - Uses Cheerio to parse HTML
 *   - Extracts: Title, content, metadata
 *   - Saves to: Source model in MongoDB
 * 
 * STEP 3: Extract Keywords
 *   - Uses GPT-4o-mini for cost efficiency
 *   - Extracts: 10 high-value SEO keywords
 *   - Rephrases: Naturally for better SEO
 *   - Saves to: Keyword model
 * 
 * STEP 4: Generate Articles
 *   - For each keyword
 *   - Uses GPT-4 Turbo
 *   - Generates: 1500+ word articles
 *   - Status: "review" (waiting for admin)
 * 
 * STEP 5: Complete
 *   - All articles ready in /admin/drafts
 *   - Admin can: review, edit, publish
 * 
 * HOW TO USE:
 * 1. UI: /admin/settings → "Generate Blog Dentist" → Click button
 * 2. API: POST /api/auto-dentist
 * 
 * TIME: 2-3 minutes for complete flow
 * COST: ~$0.50-1.00 (depending on article count)
 * 
 * POST /api/auto-dentist
 */
export async function POST(req: NextRequest) {
  console.log('[API /auto-dentist] 🚀 Starting Auto Dentist Flow...');
  
  try {
    const results = await runAutoDentistFlow();
    
    console.log('[API /auto-dentist] ✅ Flow completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Auto Dentist flow completed',
      results: results || [],
      summary: {
        totalArticles: results?.length || 0,
        status: 'Articles queued for generation'
      }
    }, { status: 200 });
    
  } catch (err: any) {
    console.error('❌ Auto Dentist Flow Error:', err);
    return NextResponse.json(
      { 
        success: false,
        error: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for API documentation
 */
export async function GET() {
  return NextResponse.json({
    name: 'Auto Dentist Flow API',
    description: 'Automatically scrapes top dental articles, extracts keywords, and generates new articles',
    endpoint: 'POST /api/auto-dentist',
    flow: [
      '1. Find top 10 dental articles (SerperAPI)',
      '2. Scrape each article (Cheerio)',
      '3. Extract keywords (GPT-4)',
      '4. Rephrase keywords naturally',
      '5. Generate articles (GPT-4 Turbo)',
      '6. Save to database with "review" status'
    ],
    response: {
      success: 'boolean',
      message: 'string',
      results: 'array of generated articles',
      summary: {
        totalArticles: 'number',
        status: 'string'
      }
    }
  });
}
