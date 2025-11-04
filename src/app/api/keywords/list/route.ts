import { dbConnect } from "@/lib/db/connect";
import Keyword from "@/lib/db/models/Keyword";

export async function GET() {
  await dbConnect();
  const data = await Keyword.find({}, { term: 1 });
  return Response.json(data);
}
