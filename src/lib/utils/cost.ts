/**
 * ============================================
 * COST ESTIMATION UTILITY
 * ============================================
 * 
 * Calculates estimated cost for LLM usage.
 * Used internally for tracking - NOT displayed in UI.
 * 
 * Backend only - no frontend display.
 */

export function estimateCost(usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }) {
  if (!usage) return { totalUSD: 0, tokensIn: 0, tokensOut: 0, provider: 'openai' };
  
  const inTok = usage.prompt_tokens ?? 0;
  const outTok = usage.completion_tokens ?? 0;
  
  // GPT-4 Turbo pricing (adjust to your plan)
  // Input: $10 per 1M tokens
  // Output: $30 per 1M tokens
  const usd = (inTok / 1e6) * 10 + (outTok / 1e6) * 30;
  
  return { 
    totalUSD: Number(usd.toFixed(4)), 
    tokensIn: inTok, 
    tokensOut: outTok, 
    provider: 'openai' 
  };
}

