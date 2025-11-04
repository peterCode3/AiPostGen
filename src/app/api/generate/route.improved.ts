/**
 * Improved Generate API Route
 * Features: input validation, error handling, authentication, rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { runGenerate } from '../../../../workers/generate.improved';
import { generateRequestSchema } from '../../../lib/validation/schemas';
import { 
  asyncHandler, 
  validateRequest, 
  AuthenticationError,
  RateLimitError 
} from '../../../lib/api/errorHandler';
import { verifyToken } from '../../../lib/utils/auth';

// Simple in-memory rate limiter (replace with Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): void {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (userLimit.count >= maxRequests) {
    throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((userLimit.resetAt - now) / 1000)}s`);
  }

  userLimit.count++;
}

/**
 * POST /api/generate
 * Generate articles from keywords
 */
export const POST = asyncHandler(async (req: NextRequest) => {
  // 1. Authenticate user
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new AuthenticationError('Authorization header required');
  }

  const token = authHeader.replace('Bearer ', '');
  const user = await verifyToken(token);
  
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // 2. Rate limiting
  checkRateLimit(user.id, 10, 60000); // 10 requests per minute

  // 3. Validate request body
  const body = await validateRequest(req, generateRequestSchema);
  const { keywordIds, sourceIds, language, customInstructions } = body;

  console.log(`[generate] User ${user.email} generating ${keywordIds.length} articles`);

  // 4. Process generation jobs
  const results = await Promise.allSettled(
    keywordIds.map((keywordId) =>
      runGenerate({
        keywordId,
        sourceIds,
        language,
        customPromptInstructions: customInstructions,
      })
    )
  );

  // 5. Separate successes and failures
  const successful = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map((r) => r.value);

  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r, idx) => ({
      keywordId: keywordIds[idx],
      error: r.reason?.message || 'Unknown error',
    }));

  // 6. Calculate total cost
  const totalCost = successful.reduce(
    (sum, result) => sum + (result.cost?.totalUSD || 0),
    0
  );

  console.log(`[generate] Completed: ${successful.length} succeeded, ${failed.length} failed`);
  console.log(`[generate] Total cost: $${totalCost.toFixed(4)}`);

  // 7. Return results
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
      },
    },
    { status: 200 }
  );
});

/**
 * GET /api/generate
 * Return API information
 */
export async function GET() {
  return NextResponse.json(
    {
      endpoint: '/api/generate',
      method: 'POST',
      description: 'Generate SEO-optimized articles from keywords',
      authentication: 'Bearer token required',
      rateLimit: '10 requests per minute',
      body: {
        keywordIds: 'array of keyword IDs (1-10)',
        sourceIds: 'optional array of source IDs',
        language: 'optional: "en" or "ar" (default: "en")',
        customInstructions: 'optional: additional instructions',
      },
      example: {
        keywordIds: ['507f1f77bcf86cd799439011'],
        sourceIds: ['507f1f77bcf86cd799439012'],
        language: 'en',
      },
    },
    { status: 200 }
  );
}

