import { getJamaatTimes } from "@/lib/db";

export async function GET() {
  const data = await getJamaatTimes();
  return Response.json({ ok: true, data }, { status: 200 });
}
