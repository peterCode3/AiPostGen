export async function serpTopUrlsFor(term: string): Promise<string[]> {
  if (!process.env.SERPAPI_KEY) return [];
  // You can implement SerpAPI call here; returning []
  return [];
}
