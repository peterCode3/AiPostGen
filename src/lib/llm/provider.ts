/**
 * LLM Provider - MULTI-PROVIDER SUPPORT
 * ✅ Google Gemini (FREE & High Quality) - Primary
 * ✅ Groq Llama 3.3 (FREE) - Fallback
 * ✅ Retry logic: Added with exponential backoff
 * ✅ Validation: Content quality checks
 */

import "dotenv/config";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Validate environment variables
if (!process.env.GOOGLE_API_KEY) {
  console.warn("⚠️  GOOGLE_API_KEY not set - Google Gemini calls will fail");
}
if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️  GROQ_API_KEY not set - Groq fallback unavailable");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

console.log("✅ Google Gemini API Key:", process.env.GOOGLE_API_KEY ? "Loaded" : "Missing");
console.log("✅ Groq API Key:", groq.apiKey ? "Loaded" : "Missing");

// System prompt for high-quality content
export const SYSTEM_PROMPT = `
You are an expert multilingual content writer and SEO strategist specializing in dental industry content.

WRITING GUIDELINES:
- Write factual, original, well-structured long-form articles (1200–1800 words)
- Use clear structure: H2/H3 headings, bullet lists, concise paragraphs
- Maintain a professional, neutral, and helpful tone
- Include practical examples and actionable insights
- NEVER fabricate statistics, citations, or sources
- Cite sources naturally when referencing external information

SEO REQUIREMENTS:
- Optimize for target keyword naturally (avoid keyword stuffing)
- Include meta description (155–160 characters)
- Add TL;DR and FAQ sections
- Use semantic HTML structure
- Include valid schema.org Article JSON-LD

OUTPUT FORMAT:
- Write content in GitHub-flavored Markdown
- Do NOT include YAML frontmatter
- Structure metadata in a parseable format at the end
`.trim();

// Helper: Sleep for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Validate generated content
function validateContent(markdown: string): { valid: boolean; error?: string } {
  if (!markdown || markdown.trim().length === 0) {
    return { valid: false, error: "Empty content" };
  }

  const wordCount = markdown.split(/\s+/).length;
  if (wordCount < 500) {
    return { valid: false, error: `Content too short (${wordCount} words, minimum 500)` };
  }

  if (!markdown.includes("#")) {
    return { valid: false, error: "Missing headings" };
  }

  return { valid: true };
}

// Main generation function with retry logic
export async function generateMarkdown(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    retries?: number;
  } = {}
) {
  const {
    temperature = 0.5,
    maxTokens = 4000,
    retries = 3
  } = options;

  let lastError: Error | null = null;

  // Try Google Gemini first (FREE & High Quality)
  if (process.env.GOOGLE_API_KEY) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`🤖 [Google Gemini] Attempt ${attempt + 1}/${retries}...`);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        });

        const markdown = result.response.text();

        // Validate content
        const validation = validateContent(markdown);
        if (!validation.valid) {
          throw new Error(`Content validation failed: ${validation.error}`);
        }

        console.log(`✅ [Google Gemini] Success! Generated ${markdown.split(/\s+/).length} words`);

        return {
          markdown,
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          provider: "google",
          attempts: attempt + 1,
        };

      } catch (err: any) {
        lastError = err;
        console.warn(`❌ [Google Gemini] Attempt ${attempt + 1} failed:`, err.message);

        // Don't retry on authentication errors
        if (err.message?.includes('API key') || err.message?.includes('authentication')) {
          break;
        }

        // Exponential backoff before retry
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await sleep(delay);
        }
      }
    }
  }

  // Fallback to Groq (if Google failed)
  if (process.env.GROQ_API_KEY) {
    console.log("🔄 Falling back to Groq...");
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
      console.log(`🤖 [Groq] Attempt ${attempt + 1}/${retries}...`);

      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile", // ✅ FIXED: Updated to current Groq model
        temperature,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
      });

      const markdown = res.choices?.[0]?.message?.content || "";

      // Validate Groq content
      const validation = validateContent(markdown);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.error}`);
      }

      console.log(`✅ [Groq] Success! Generated ${markdown.split(/\s+/).length} words`);

      return {
        markdown,
        usage: res.usage,
        provider: "groq",
        attempts: attempt + 1,
      };

    } catch (err: any) {
      lastError = err;
      console.warn(`❌ [Groq] Attempt ${attempt + 1} failed:`, err.message);

        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await sleep(delay);
        }
      }
    }
  }

  // All attempts failed
  throw new Error(
    `Failed to generate content with all providers. Last error: ${lastError?.message || 'Unknown error'}`
  );
}

// Test API connectivity
export async function testConnection(): Promise<{ google: boolean; groq: boolean }> {
  const results = { google: false, groq: false };

  // Test Google Gemini
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Test" }] }],
      generationConfig: { maxOutputTokens: 10 },
    });
    results.google = true;
    console.log("✅ Google Gemini connection successful");
  } catch (err: any) {
    console.error("❌ Google Gemini connection failed:", err.message);
  }

  // Test Groq
  try {
    await groq.models.list();
    results.groq = true;
    console.log("✅ Groq connection successful");
  } catch (err: any) {
    console.error("❌ Groq connection failed:", err.message);
  }

  return results;
}
