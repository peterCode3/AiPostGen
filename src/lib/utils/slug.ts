export const makeSlug = (s: string) =>
  s.toLowerCase()
   .replace(/[^a-z0-9\s-]/g, '')
   .replace(/\s+/g, '-')
   .replace(/-+/g, '-')
   .slice(0, 80);
