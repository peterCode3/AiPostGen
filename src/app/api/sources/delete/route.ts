import { dbConnect } from "@/lib/db/connect";
import Source from "@/lib/db/models/Source";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { id } = params;
  await Source.findByIdAndDelete(id);
  return Response.json({ success: true });
}
