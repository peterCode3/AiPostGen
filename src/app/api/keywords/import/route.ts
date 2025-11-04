import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import Keyword from '@/lib/db/models/Keyword';
import { jsonError } from '@/lib/utils/errors';
import { requireRole } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['admin','editor','contributor']);
  if (!auth.ok) return jsonError(auth.error, 401);
  
  try {
    await dbConnect();
    const body = await req.json();
    
    // Support both formats:
    // 1. { terms: ["keyword1", "keyword2"] }
    // 2. { keywords: [{ term: "keyword1", locale: "en" }, ...] }
    let termsToInsert: string[] = [];
    
    if (body.terms && Array.isArray(body.terms)) {
      // Format 1: Simple array
      termsToInsert = body.terms.filter((t: any) => typeof t === 'string' && t.trim());
    } else if (body.keywords && Array.isArray(body.keywords)) {
      // Format 2: Object array
      termsToInsert = body.keywords
        .filter((k: any) => k && k.term && typeof k.term === 'string')
        .map((k: any) => k.term.trim());
    }
    
    if (termsToInsert.length === 0) {
      return jsonError('No valid keywords provided. Use { terms: ["kw1"] } or { keywords: [{ term: "kw1" }] }', 400);
    }
    
    // Bulk insert/update
    const ops = termsToInsert.map(term => ({
      updateOne: {
        filter: { term },
        update: { $set: { term, updatedAt: new Date() } },
        upsert: true
      }
    }));
    
    const result = await Keyword.bulkWrite(ops);
    
    // Fetch the created/updated keywords to return their IDs
    const insertedKeywords = await Keyword.find({ 
      term: { $in: termsToInsert } 
    }).lean();
    
    return Response.json({
      success: true,
      inserted: termsToInsert.length,
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      keywords: insertedKeywords.map(k => ({
        _id: k._id.toString(),
        term: k.term
      }))
    });
    
  } catch (error: any) {
    console.error('❌ [Keywords Import] Error:', error);
    return jsonError(error.message || 'Failed to import keywords', 500);
  }
}
