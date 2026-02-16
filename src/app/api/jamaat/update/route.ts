import { cookies } from "next/headers";

let inMemoryJamaat = {
  fajr: "06:35",
  dhuhr: "13:20",
  asr: "17:15",
  maghrib: "17:50",
  isha: "19:15",
  jummah: [{ khutbah: "12:45", salah: "13:15" }],
};

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;

  if (session !== "ok") {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  inMemoryJamaat = body;

  return Response.json({ ok: true });
}

// (We’ll move this to Vercel KV later so it persists)
export async function GET() {
  return Response.json({ ok: true, data: inMemoryJamaat });
}
