import got from 'got';
import * as cheerio from 'cheerio';

function ua() {
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36 AI-Agent/1.0`;
}
function clean(s: string) {
  return s.replace(/\s+/g,' ').trim();
}

export async function fetchAndParse(url: string) {
  const res = await got(url, {
    headers: { 'user-agent': ua(), 'accept-language': 'en-US,en;q=0.9' },
    timeout: { request: 15000 }
  });
  const html = res.body;
  const $ = cheerio.load(html);
  const title = $('h1').first().text() || $('title').text();
  const main = $('article').text() || $('main').text() || $('body').text();
  const text = clean(main);
  return { title: clean(title), text, rawHtml: html };
}
