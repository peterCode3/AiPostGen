/**
 * Enhanced Prompt Engineering Module
 * Generates optimized prompts for SEO-rich, bilingual content
 */

export interface SourceSnippet {
  title: string;
  url: string;
  passages?: string[];
}

export interface PromptOptions {
  keyword: string;
  language?: 'en' | 'ar';
  sources?: SourceSnippet[];
  slugs?: string[];
  tone?: 'professional' | 'conversational' | 'academic';
  targetAudience?: string;
  wordCount?: number;
  includeSchema?: boolean;
}

/**
 * Build a comprehensive prompt for article generation with sources
 */
export function buildPrompt(opts: PromptOptions): string {
  const {
    keyword,
    language = 'en',
    sources = [],
    slugs = [],
    tone = 'professional',
    targetAudience = 'dental professionals in Saudi Arabia',
    wordCount = 1500,
    includeSchema = true
  } = opts;

  const languageName = language === 'ar' ? 'Arabic' : 'English';
  const isArabic = language === 'ar';

  // Format sources
  const sourcesTxt = sources.length > 0
    ? sources.map((s, idx) => `
SOURCE ${idx + 1}:
• Title: ${s.title}
• URL: ${s.url}
${s.passages && s.passages.length > 0 
  ? `• Key Points:\n${s.passages.map(p => `  - ${p.slice(0, 300)}`).join('\n')}` 
  : ''}
`).join('\n')
    : 'No specific sources provided - rely on your general knowledge.';

  // Format internal link suggestions
  const internalLinksTxt = slugs.length > 0
    ? `\nRELATED ARTICLES (suggest natural anchor text for these):
${slugs.map(slug => `• /articles/${slug}`).join('\n')}`
    : '';

  return `
═══════════════════════════════════════════════════════════════
                    CONTENT GENERATION BRIEF
═══════════════════════════════════════════════════════════════

PRIMARY KEYWORD: "${keyword}"
LANGUAGE: ${languageName} ${isArabic ? '(native speaker level, right-to-left text)' : ''}
TARGET WORD COUNT: ${wordCount} words
TONE: ${tone}
TARGET AUDIENCE: ${targetAudience}

───────────────────────────────────────────────────────────────
                         YOUR MISSION
───────────────────────────────────────────────────────────────

Write a comprehensive, original, SEO-optimized article about "${keyword}" that:
✅ Provides genuine value to ${targetAudience}
✅ Is factually accurate and well-researched
✅ Incorporates insights from the sources below WITHOUT copying
✅ Uses the target keyword naturally (avoid stuffing)
✅ Ranks well for related search queries
✅ Is completely plagiarism-free and unique

───────────────────────────────────────────────────────────────
                      SOURCE MATERIAL
───────────────────────────────────────────────────────────────

Use these vetted sources as INSPIRATION and for FACTUAL VERIFICATION:
${sourcesTxt}

⚠️  IMPORTANT:
• DO NOT copy sentences or phrases directly
• DO NOT use the same title as any source
• DO extract key facts, statistics, and insights
• DO cite sources naturally when referencing specific data
• DO add your own analysis and perspective

───────────────────────────────────────────────────────────────
                    CONTENT REQUIREMENTS
───────────────────────────────────────────────────────────────

STRUCTURE (Required Sections):
1. TITLE (H1)
   - Engaging, unique, and keyword-relevant
   - NOT the keyword itself
   - Maximum 60 characters
   ${isArabic ? '   - In Arabic, naturally phrased' : ''}

2. TL;DR (2-3 sentences)
   - Quick summary of key takeaways
   - Placed right after the title

3. INTRODUCTION (150-200 words)
   - Hook the reader immediately
   - Explain what the article covers
   - Why it matters to the audience

4. MAIN CONTENT (4-6 major sections with H2 headings)
   - Each section should be 200-300 words
   - Use H3 subheadings where appropriate
   - Include bullet points and numbered lists
   - Add practical examples or case studies
   - Use tables if comparing data

5. KEY TAKEAWAYS (Bullet list)
   - 5-7 actionable insights
   - Clear and memorable points

6. FAQ SECTION (5-7 Q&A pairs)
   - Address common questions about the topic
   - Use "What", "How", "Why", "When" format
   - Keep answers concise (2-3 sentences each)

7. CONCLUSION (100-150 words)
   - Summarize main points
   - Call-to-action (if appropriate)
   - Forward-looking statement

${internalLinksTxt}

───────────────────────────────────────────────────────────────
                      WRITING GUIDELINES
───────────────────────────────────────────────────────────────

STYLE:
• Tone: ${tone}, authoritative, helpful
• Voice: Active voice, clear sentences
• Paragraphs: 2-4 sentences max
• Readability: 8th-grade reading level (unless academic tone)
${isArabic ? '• Grammar: Proper Arabic grammar, diacritics where needed\n• Direction: Right-to-left text formatting' : ''}

SEO BEST PRACTICES:
• Target keyword density: 1-2%
• LSI keywords: Use semantic variations naturally
• Meta title: 50-60 characters, include primary keyword
• Meta description: 155-160 characters, compelling CTA
• Alt text: Suggest for any mentioned visuals
• Schema markup: ${includeSchema ? 'Include valid JSON-LD' : 'Not required'}

QUALITY STANDARDS:
❌ NO fabricated statistics or fake sources
❌ NO promotional or sales language
❌ NO generic filler content
❌ NO plagiarism or duplicate content
✅ Original insights and analysis
✅ Data-backed claims (cite sources)
✅ Practical, actionable advice
✅ Natural, conversational flow

───────────────────────────────────────────────────────────────
                       OUTPUT FORMAT
───────────────────────────────────────────────────────────────

Please output in PURE MARKDOWN format (GitHub-flavored):

# [Your Engaging Title Here]

**TL;DR:** [2-3 sentence summary]

## Introduction
[Content...]

## [Main Section 1]
[Content...]

### [Subsection if needed]
[Content...]

## [Main Section 2]
[Content...]

[Continue with all sections...]

## Key Takeaways
- Point 1
- Point 2
[...]

## Frequently Asked Questions

### Q: [Question 1]
A: [Answer]

### Q: [Question 2]
A: [Answer]

[...]

## Conclusion
[Content...]

${includeSchema ? `
---

**METADATA** (Please format exactly as shown):

\`\`\`json
{
  "metaTitle": "[50-60 chars with primary keyword]",
  "metaDescription": "[155-160 chars, compelling, with CTA]",
  "keywords": ["${keyword}", "related keyword 1", "related keyword 2", "related keyword 3"],
  "outline": [
    {"h": "Introduction", "bullets": ["point 1", "point 2"]},
    {"h": "Main Section 1", "bullets": ["point 1", "point 2"]},
    {"h": "Main Section 2", "bullets": ["point 1", "point 2"]}
  ],
  "schemaOrg": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "[Article title]",
    "description": "[Meta description]",
    "keywords": "${keyword}, [related keywords]",
    "wordCount": ${wordCount},
    "inLanguage": "${language === 'ar' ? 'ar-SA' : 'en-US'}",
    "author": {
      "@type": "Organization",
      "name": "Your Dental Practice Name"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Your Brand",
      "logo": {
        "@type": "ImageObject",
        "url": "https://yourdomain.com/logo.png"
      }
    }
  }
}
\`\`\`
` : ''}

═══════════════════════════════════════════════════════════════
                    BEGIN WRITING NOW
═══════════════════════════════════════════════════════════════
`.trim();
}

/**
 * Build prompt for generation WITHOUT sources (pure AI knowledge)
 */
export function buildPromptNoSource(opts: Omit<PromptOptions, 'sources'>): string {
  const {
    keyword,
    language = 'en',
    tone = 'professional',
    targetAudience = 'dental professionals in Saudi Arabia',
    wordCount = 1500,
  } = opts;

  const languageName = language === 'ar' ? 'Arabic' : 'English';
  const isArabic = language === 'ar';

  return `
═══════════════════════════════════════════════════════════════
              ORIGINAL CONTENT GENERATION BRIEF
═══════════════════════════════════════════════════════════════

PRIMARY KEYWORD: "${keyword}"
LANGUAGE: ${languageName} ${isArabic ? '(native speaker level)' : ''}
TARGET WORD COUNT: ${wordCount} words
TONE: ${tone}
TARGET AUDIENCE: ${targetAudience}

───────────────────────────────────────────────────────────────
                         TASK
───────────────────────────────────────────────────────────────

Write a detailed, SEO-optimized, completely original article about "${keyword}".

Since NO external sources are provided, you must:
✅ Rely on your general knowledge and expertise
✅ Provide accurate, factual information
✅ Include practical examples and actionable advice
✅ Write ${wordCount}+ words of high-quality content
❌ Do NOT fabricate statistics or fake sources
❌ Do NOT make unverifiable claims

───────────────────────────────────────────────────────────────
                    REQUIRED STRUCTURE
───────────────────────────────────────────────────────────────

# [Engaging Title - NOT just the keyword]

**TL;DR:** [2-3 sentence summary]

## Introduction
[Hook + overview + why it matters]

## [Main Content Sections - 4-6 H2 sections]
[Well-researched content with H3 subsections as needed]

## Key Takeaways
- [5-7 actionable bullet points]

## Frequently Asked Questions
### Q: [Question 1]
A: [Answer]

[5-7 FAQ pairs total]

## Conclusion
[Summary + forward-looking statement]

───────────────────────────────────────────────────────────────

**METADATA:**
\`\`\`json
{
  "metaTitle": "[50-60 chars]",
  "metaDescription": "[155-160 chars]",
  "keywords": ["${keyword}", "related1", "related2"],
  "outline": [{"h": "section", "bullets": ["point"]}],
  "schemaOrg": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "[title]",
    "description": "[meta desc]",
    "keywords": "${keyword}",
    "inLanguage": "${language === 'ar' ? 'ar-SA' : 'en-US'}"
  }
}
\`\`\`

BEGIN WRITING NOW.
`.trim();
}

/**
 * Build prompt for regenerating/improving existing content
 */
export function buildRegeneratePrompt(
  originalContent: string,
  instructions: string,
  keyword: string,
  language: string = 'en'
): string {
  return `
═══════════════════════════════════════════════════════════════
                   CONTENT REGENERATION TASK
═══════════════════════════════════════════════════════════════

KEYWORD: "${keyword}"
LANGUAGE: ${language}

USER FEEDBACK:
${instructions}

ORIGINAL CONTENT:
───────────────────────────────────────────────────────────────
${originalContent}
───────────────────────────────────────────────────────────────

INSTRUCTIONS:
Based on the user feedback above, please regenerate/improve this content while:
✅ Maintaining the core topic and keyword optimization
✅ Incorporating the requested changes
✅ Keeping the overall structure (unless requested otherwise)
✅ Improving SEO and readability
✅ Ensuring originality and quality

OUTPUT the improved version in the same markdown format.
`.trim();
}

/**
 * Extract metadata from LLM response
 */
export function extractMetadata(markdown: string): {
  content: string;
  metadata: any;
} {
  // Try to find JSON block
  const jsonMatch = markdown.match(/```json\s*\n([\s\S]*?)\n```/);
  
  if (jsonMatch) {
    try {
      const metadata = JSON.parse(jsonMatch[1]);
      const content = markdown.replace(/```json\s*\n[\s\S]*?\n```/, '').trim();
      return { content, metadata };
    } catch (err) {
      console.warn('⚠️  Failed to parse metadata JSON:', err);
    }
  }

  // Fallback: return content without metadata
  return {
    content: markdown,
    metadata: {
      metaTitle: extractTitle(markdown),
      metaDescription: extractDescription(markdown),
      keywords: [],
      outline: extractOutline(markdown),
    }
  };
}

/**
 * Helper: Extract title from markdown
 */
function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * Helper: Extract description from TL;DR or first paragraph
 */
function extractDescription(markdown: string): string {
  // Try TL;DR first
  const tldrMatch = markdown.match(/\*\*TL;DR:?\*\*\s*(.+?)(?:\n\n|$)/s);
  if (tldrMatch) {
    return tldrMatch[1].trim().slice(0, 160);
  }

  // Fallback to first paragraph
  const paragraphs = markdown.split('\n\n');
  for (const p of paragraphs) {
    if (!p.startsWith('#') && p.trim().length > 50) {
      return p.trim().slice(0, 160);
    }
  }

  return 'Read this comprehensive article...';
}

/**
 * Helper: Extract outline from H2 headings
 */
function extractOutline(markdown: string): Array<{ h: string; bullets: string[] }> {
  const headings = markdown.match(/^##\s+(.+)$/gm) || [];
  return headings.map(h => ({
    h: h.replace(/^##\s+/, '').trim(),
    bullets: []
  }));
}

/**
 * Validate prompt before sending
 */
export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt is empty' };
  }

  if (prompt.length < 100) {
    return { valid: false, error: 'Prompt too short (minimum 100 characters)' };
  }

  if (prompt.length > 50000) {
    return { valid: false, error: 'Prompt too long (maximum 50,000 characters)' };
  }

  return { valid: true };
}

// Export default for backward compatibility
export default {
  buildPrompt,
  buildPromptNoSource,
  buildRegeneratePrompt,
  extractMetadata,
  validatePrompt,
};

