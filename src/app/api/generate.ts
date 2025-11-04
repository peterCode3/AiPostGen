// import type { NextApiRequest, NextApiResponse } from "next";
// import { runGenerate } from '../../../workers/generate';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }

//   try {
//     const { keywordId, sourceIds, language } = req.body;
//     if (!keywordId || !sourceIds) {
//       return res.status(400).json({ error: "Missing keywordId or sourceIds" });
//     }

//     const result = await runGenerate({ keywordId, sourceIds, language });
//     return res.status(200).json(result);
//   } catch (err: any) {
//     console.error("[generate] error", err);
//     return res.status(500).json({ error: err.message || "Internal Server Error" });
//   }
// }


import type { NextApiRequest, NextApiResponse } from "next";
import { runGenerate } from "../../../workers/generate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { keywordIds, sourceIds, language } = req.body;

    if (!Array.isArray(keywordIds) || keywordIds.length === 0) {
      return res.status(400).json({ error: "Missing keywordIds" });
    }


    const results = await Promise.all(
      keywordIds.map(id => runGenerate({ keywordId: id, sourceIds, language }))
    );


    return res.status(200).json({ success: true, results });
  } catch (err: any) {
    console.error("[generate] error", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
