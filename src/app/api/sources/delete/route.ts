import { dbConnect } from "@/lib/db/connect";
import Source from "@/lib/db/models/Source";

export async function DELETE(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
  await Source.findByIdAndDelete(id);
  return Response.json({ success: true });
}
