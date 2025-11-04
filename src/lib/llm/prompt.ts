/**
 * Enhanced Prompt Engineering
 * ✅ Better structure and instructions
 * ✅ Bilingual support (EN/AR)
 * ✅ SEO optimization guidelines
 * ✅ Quality standards
 */

type SourceSnippet = { title: string; url: string; passages?: string[] };

export function buildPrompt(opts: { 
  keyword?: string; 
  language?: string; 
  sources: SourceSnippet[]; 
  slugs?: string[];
  wordCount?: number;
  tone?: string;
}) {
  const { 
    keyword = '', 
    language = 'en', 
    sources, 
    slugs = [],
    wordCount = 1500,
    tone = 'professional'
  } = opts;

  const languageName = language === 'ar' ? 'Arabic' : 'English';
  const isArabic = language === 'ar';

  // Format sources with better structure
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

  // Format internal links
  const internalLinksTxt = slugs.length > 0
    ? `\nRELATED ARTICLES (suggest natural anchor text):
${slugs.map(slug => `• /articles/${slug}`).join('\n')}`
    : '';

  return `
═══════════════════════════════════════════════════════════════
                    CONTENT GENERATION BRIEF
═══════════════════════════════════════════════════════════════

PRIMARY KEYWORD: "${keyword}"
LANGUAGE: ${languageName} ${isArabic ? '(native speaker level, right-to-left)' : ''}
TARGET WORD COUNT: ${wordCount} words
TONE: ${tone}
TARGET AUDIENCE: Dental professionals in Saudi Arabia

───────────────────────────────────────────────────────────────
                         YOUR MISSION
───────────────────────────────────────────────────────────────

Write a comprehensive, original, SEO-optimized article about "${keyword}" that:
✅ Provides genuine value to dental professionals
✅ Is factually accurate and well-researched
✅ Incorporates insights from sources WITHOUT copying
✅ Uses the target keyword naturally (avoid stuffing)
✅ Ranks well for related search queries
✅ Is completely plagiarism-free and unique

───────────────────────────────────────────────────────────────
                      SOURCE MATERIAL
───────────────────────────────────────────────────────────────
${sourcesTxt}

⚠️  IMPORTANT:
• DO NOT copy sentences or phrases directly
• DO NOT use the same title as any source
• DO extract key facts, statistics, and insights
• DO cite sources naturally when referencing data
• DO add your own analysis and perspective

───────────────────────────────────────────────────────────────
                    REQUIRED STRUCTURE
───────────────────────────────────────────────────────────────

# [Engaging Title - NOT just the keyword]
${isArabic ? '(In Arabic, naturally phrased)' : ''}

**TL;DR:** [2-3 sentence summary]

## Introduction (150-200 words)
[Hook + overview + why it matters]

## [Main Section 1]
[Content with H3 subsections as needed]

## [Main Section 2]
[Content...]

## [Main Section 3-6]
[Total 4-6 major sections]

## Key Takeaways
- [5-7 actionable bullet points]

## Frequently Asked Questions

### Q: [Question 1]
A: [Answer]

[5-7 FAQ pairs total]

## Conclusion (100-150 words)
[Summary + call-to-action]

${internalLinksTxt}

───────────────────────────────────────────────────────────────
                      QUALITY STANDARDS
───────────────────────────────────────────────────────────────

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

Please output in PURE MARKDOWN, then add metadata as JSON:

[Your markdown content here]

---

\`\`\`json
{
  "metaTitle": "[50-60 chars with primary keyword]",
  "metaDescription": "[155-160 chars, compelling]",
  "keywords": ["${keyword}", "related1", "related2"],
  "outline": [
    {"h": "Introduction", "bullets": ["point1", "point2"]},
    {"h": "Section 1", "bullets": ["point1", "point2"]}
  ],
  "schemaOrg": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "[Article title]",
    "description": "[Meta description]",
    "keywords": "${keyword}",
    "inLanguage": "${language === 'ar' ? 'ar-SA' : 'en-US'}"
  }
}
\`\`\`

═══════════════════════════════════════════════════════════════
                    BEGIN WRITING NOW
═══════════════════════════════════════════════════════════════
`.trim();
}


export function buildPromptNoSource(opts: { 
  keyword: string; 
  language?: string;
  wordCount?: number;
}) {
  const { keyword, language = 'en', wordCount = 1500 } = opts;
  const languageName = language === 'ar' ? 'Arabic' : 'English';
  const isArabic = language === 'ar';

  return `
═══════════════════════════════════════════════════════════════
              ORIGINAL CONTENT GENERATION BRIEF
═══════════════════════════════════════════════════════════════

PRIMARY KEYWORD: "${keyword}"
LANGUAGE: ${languageName} ${isArabic ? '(native speaker level)' : ''}
TARGET WORD COUNT: ${wordCount} words
TARGET AUDIENCE: Dental professionals in Saudi Arabia

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
                       OUTPUT FORMAT
───────────────────────────────────────────────────────────────

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
