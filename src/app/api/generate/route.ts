/**
 * ============================================
 * ARTICLE GENERATION API - MANUAL GENERATION
 * ============================================
 * 
 * Use this endpoint for MANUAL article generation
 * (Auto Dentist flow uses this internally)
 * 
 * REQUEST BODY:
 * {
 *   "keywordIds": ["id1", "id2"],      // Required: Array of keyword IDs
 *   "sourceIds": ["src1", "src2"],     // Optional: Source articles to reference
 *   "language": "en",                  // Optional: "en" or "ar" (default: "en")
 *   "customInstructions": "...",       // Optional: Custom prompt additions
 *   "wordCount": 1500                  // Optional: Target word count (default: 1500)
 * }
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "message": "Generated 2 of 2 articles",
 *   "results": [
 *     {
 *       "articleId": "...",
 *       "slug": "...",
 *       "title": "...",
 *       "wordCount": 1623,
 *       "cost": { "totalUSD": 0.0840, "provider": "openai" }
 *     }
 *   ],
 *   "summary": {
 *     "total": 2,
 *     "succeeded": 2,
 *     "failed": 0,
 *     "totalCost": "$0.1680",
 *     "totalWords": 3246
 *   }
 * }
 * 
 * FEATURES:
 * ✅ Batch processing (up to 10 keywords)
 * ✅ Concurrent generation
 * ✅ Detailed error reporting
 * ✅ Cost tracking per article
 * ✅ Input validation
 * 
 * EXAMPLE:
 * curl -X POST http://localhost:3000/api/generate \
 *   -H "Content-Type: application/json" \
 *   -d '{"keywordIds":["id1"],"language":"en"}'
 */

import { NextResponse } from 'next/server';
import { runGenerate } from "../../../../workers/generate";

export async function POST(req: Request) {
  console.log('[API /generate] 📥 Received POST request');

  try {
    // Parse request body
    const body = await req.json();
    const { keywordIds, sourceIds, language = 'en', customInstructions, wordCount } = body;

    // Validate input
    if (!keywordIds) {
      return NextResponse.json(
        { error: "Missing 'keywordIds' field" }, 
        { status: 400 }
      );
    }

    if (!Array.isArray(keywordIds)) {
      return NextResponse.json(
        { error: "'keywordIds' must be an array" }, 
        { status: 400 }
      );
    }

    if (keywordIds.length === 0) {
      return NextResponse.json(
        { error: "At least one keyword ID required" }, 
        { status: 400 }
      );
    }

    if (keywordIds.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 keywords per request" }, 
        { status: 400 }
      );
    }

    console.log(`[API /generate] 📝 Processing ${keywordIds.length} keywords`);
    console.log(`[API /generate] 🌐 Language: ${language}`);

    // Process all generation jobs
    const results = await Promise.allSettled(
      keywordIds.map((id: string) =>
        runGenerate({ 
          keywordId: id, 
          sourceIds, 
          language,
          customInstructions,
          wordCount 
        })
      )
    );

    // Separate successes and failures
    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, idx) => ({
        keywordId: keywordIds[idx],
        error: r.reason?.message || 'Unknown error',
      }));

    // Calculate total cost and word count
    const totalCost = successful.reduce(
      (sum, result) => sum + (result.cost?.totalUSD || 0),
      0
    );

    const totalWords = successful.reduce(
      (sum, result) => sum + (result.wordCount || 0),
      0
    );

    console.log(`[API /generate] ✅ Completed: ${successful.length} succeeded, ${failed.length} failed`);
    console.log(`[API /generate] 💰 Total cost: $${totalCost.toFixed(4)}`);
    console.log(`[API /generate] 📝 Total words: ${totalWords}`);

    // Return results
    return NextResponse.json(
      {
        success: true,
        message: `Generated ${successful.length} of ${keywordIds.length} articles`,
        results: successful,
        failed: failed.length > 0 ? failed : undefined,
        summary: {
          total: keywordIds.length,
          succeeded: successful.length,
          failed: failed.length,
          totalCost: `$${totalCost.toFixed(4)}`,
          totalWords,
          avgWordsPerArticle: successful.length > 0 
            ? Math.round(totalWords / successful.length) 
            : 0,
        },
      },
      { status: 200 }
    );

  } catch (err: any) {
    console.error('[API /generate] ❌ Error:', err.message);
    console.error('[API /generate] Stack:', err.stack);
    
    return NextResponse.json(
      { 
        error: err.message || "Internal Server Error",
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint for API documentation
export async function GET() {
  return NextResponse.json(
    {
      endpoint: '/api/generate',
      method: 'POST',
      description: 'Generate SEO-optimized articles from keywords',
      body: {
        keywordIds: {
          type: 'array',
          required: true,
          description: 'Array of keyword IDs (1-10)',
          example: ['507f1f77bcf86cd799439011']
        },
        sourceIds: {
          type: 'array',
          required: false,
          description: 'Optional array of source IDs to reference',
          example: ['507f1f77bcf86cd799439012']
        },
        language: {
          type: 'string',
          required: false,
          default: 'en',
          options: ['en', 'ar'],
          description: 'Content language'
        },
        customInstructions: {
          type: 'string',
          required: false,
          description: 'Additional instructions for content generation'
        },
        wordCount: {
          type: 'number',
          required: false,
          default: 1500,
          description: 'Target word count'
        }
      },
      response: {
        success: 'boolean',
        message: 'string',
        results: 'array of generated articles',
        summary: {
          total: 'number',
          succeeded: 'number',
          failed: 'number',
          totalCost: 'string',
          totalWords: 'number'
        }
      },
      example: {
        request: {
          keywordIds: ['507f1f77bcf86cd799439011'],
          language: 'en',
          wordCount: 1500
        }
      }
    },
    { status: 200 }
  );
}
