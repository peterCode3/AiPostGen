import 'dotenv/config';
import { dbConnect } from '../src/lib/db/connect';
import Article from '../src/lib/db/models/Article';
import { generateMarkdown } from '../src/lib/llm/provider';
import { postProcessHTML } from '../src/lib/seo/postprocess';
import { estimateCost } from '../src/lib/utils/cost';

/**
 * Updates an existing article
 * @param articleId - MongoDB article _id
 * @param prompt - updated prompt to regenerate content
 * @param language - article language
 * @param regenerate - whether to regenerate content from AI
 */
export async function runUpdateArticle({
  articleId,
  prompt,
  language = 'en',
  regenerate = false,
}: {
  articleId: string;
  prompt: string;
  language?: string;
  regenerate?: boolean;
}) {
  await dbConnect();
  const article = await Article.findById(articleId);
  if (!article) throw new Error('Article not found');

  let markdown = article.content.markdown;

  // Regenerate content from AI if requested
  let usage;
  if (regenerate && prompt) {
    const result = await generateMarkdown(prompt);
    markdown = result.markdown;
    usage = result.usage;
  }

  // Post-process HTML, SEO, meta
  const { html, meta } = await postProcessHTML(markdown, { keyword: article.keywords[0] || '' });

  // Update article
  const updated = await Article.findByIdAndUpdate(
    articleId,
    {
      title: meta.title,
      metaTitle: meta.title,
      metaDescription: meta.description,
      keywords: [article.keywords[0], ...(meta.keywords || [])],
      prompt,
      content: { markdown, html },
      seo: meta.seo,
      outline: meta.outline,
      cost: usage ? estimateCost(usage) : article.cost,
      language,
    },
    { new: true }
  );

  return updated;
}
