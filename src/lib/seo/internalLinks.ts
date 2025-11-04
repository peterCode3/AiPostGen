export async function findInternalLinks(keyword: string, outline: { h: string }[]) {
  // Stub: replace with DB query to your existing articles/slugs
  const slugs = ['/guide-to-'+keyword, '/what-is-'+keyword, '/compare-'+keyword];
  return { internalLinks: slugs.map(href => ({ href, anchor: href.split('/').pop()!.replace(/-/g,' ') })) };
}
