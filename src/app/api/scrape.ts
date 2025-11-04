import type { NextApiRequest, NextApiResponse } from "next";
import { runScrape } from '../../../workers/scrape';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "urls must be an array" });
    }

    const result = await runScrape(urls);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[scrape] error", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
