import { findInternalLinks } from './internalLinks';
import { marked } from 'marked';

export function mdToHtml(markdown: string) {
  return marked.parse(markdown);
}

function clampChars(s: string, max: number) { return s.length <= max ? s : s.slice(0, max - 1) + '…'; }
function inferTitle(html: string) {
  const m = html.match(/<h1>(.*?)<\/h1>/i); return m ? m[1] : 'Untitled';
}
function summarize(html: string) {
  const txt = html.replace(/<[^>]+>/g, ' ');
  return clampChars(txt, 160);
}
function inferKeywords(html: string, primary: string) {
  return [primary];
}
function injectInternalLinks(html: string, links: { href: string; anchor: string }[]) {
  if (!links.length) return html;
  // Append simple list to the end for demo
  const list = links.map(l => `<li><a href="${l.href}">${l.anchor}</a></li>`).join('');
  return html + `\n<section><h2>Recommended reads</h2><ul>${list}</ul></section>`;
}

export async function postProcessHTML(markdown: string, ctx: { keyword: string }) {
  const html = await mdToHtml(markdown);
  const htmlStr = typeof html === 'string' ? html : String(html);
  const outline = Array.from(htmlStr.matchAll(/<h2>(.*?)<\/h2>/g)).map(m => ({ h: m[1], bullets: [] }));
  const { internalLinks } = await findInternalLinks(ctx.keyword, outline);
  const meta = {
    title: inferTitle(htmlStr),
    description: summarize(htmlStr),
    keywords: inferKeywords(htmlStr, ctx.keyword),
    seo: {
      internalLinks,
      schemaOrgJson: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: inferTitle(htmlStr),
        description: summarize(htmlStr),
        keywords: inferKeywords(htmlStr, ctx.keyword),
        datePublished: new Date().toISOString(),
        author: { "@type": "Organization", "name": "Your Brand" }
      }
    },
    outline
  };
  return { html: injectInternalLinks(htmlStr, internalLinks), meta };
}
