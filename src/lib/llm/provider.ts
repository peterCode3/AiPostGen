/**
 * LLM Provider — Anthropic Claude (Sonnet 4.6 default)
 *
 * Replaces previous Gemini/Groq dual-provider setup.
 * Public surface preserved: SYSTEM_PROMPT, generateMarkdown(prompt, opts), testConnection().
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY not set — Claude calls will fail");
}

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export async function generateMarkdown(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    retries?: number;
    model?: string;
  } = {},
) {
  const { temperature = 0.5, maxTokens = 4000, retries = 3, model = DEFAULT_MODEL } = options;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`[Claude:${model}] attempt ${attempt + 1}/${retries}`);

      const res = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      const markdown = res.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const validation = validateContent(markdown);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.error}`);
      }

      console.log(`[Claude:${model}] ok — ${markdown.split(/\s+/).length} words`);

      return {
        markdown,
        usage: {
          prompt_tokens: res.usage.input_tokens,
          completion_tokens: res.usage.output_tokens,
          total_tokens: res.usage.input_tokens + res.usage.output_tokens,
        },
        provider: "anthropic",
        model,
        attempts: attempt + 1,
      };
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.response?.status;
      console.warn(`[Claude:${model}] attempt ${attempt + 1} failed:`, err.message);

      // Don't retry on auth errors
      if (status === 401 || status === 403) break;

      if (attempt < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Claude generation failed after ${retries} attempts. Last error: ${lastError?.message || "unknown"}`,
  );
}

export async function testConnection(): Promise<{ anthropic: boolean }> {
  const results = { anthropic: false };
  try {
    await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 16,
      messages: [{ role: "user", content: "ping" }],
    });
    results.anthropic = true;
    console.log("Anthropic connection ok");
  } catch (err: any) {
    console.error("Anthropic connection failed:", err.message);
  }
  return results;
}
