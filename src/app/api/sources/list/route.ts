import { dbConnect } from "@/lib/db/connect";
import Source from "@/lib/db/models/Source";

export async function GET() {
  await dbConnect();
  const data = await Source.find({}, { url: 1, domain: 1, "metadata.title": 1 });
  return Response.json(data);
}
