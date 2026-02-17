import { cookies } from "next/headers";
import { getJamaatTimes, saveJamaatTimes, type Jamaat } from "@/lib/db";

export const dynamic = "force-dynamic";

function isValidJamaat(x: unknown): x is Jamaat {
  if (!x || typeof x !== "object") return false;
  const v = x as any;
  return (
    typeof v.fajr === "string" &&
    typeof v.dhuhr === "string" &&
    typeof v.asr === "string" &&
    typeof v.maghrib === "string" &&
    typeof v.isha === "string" &&
    Array.isArray(v.jummah)
  );
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;

  if (session !== "ok") {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const candidate = body.data ?? body;

    if (!isValidJamaat(candidate)) {
      return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    // Merge with existing data to preserve fields like jummah2 not in admin form
    const existing = await getJamaatTimes();
    const merged = { ...existing, ...candidate };

    await saveJamaatTimes(merged);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: "Failed to save" }, { status: 500 });
  }
}