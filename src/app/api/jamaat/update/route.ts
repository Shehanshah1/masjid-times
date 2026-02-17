import { cookies } from "next/headers";
import { getJamaatTimes, saveJamaatTimes, type Jamaat } from "@/lib/db";

export const dynamic = "force-dynamic";

function isValidJamaat(x: unknown): x is Jamaat {
  if (!x || typeof x !== "object") return false;

  const value = x as Partial<Jamaat> & { jummah?: unknown; jummah2?: unknown };

  const isSlotArray = (slots: unknown) =>
    Array.isArray(slots) &&
    slots.every(
      (j) =>
        j &&
        typeof j === "object" &&
        typeof (j as { khutbah?: unknown }).khutbah === "string" &&
        typeof (j as { salah?: unknown }).salah === "string"
    );

  return (
    typeof value.fajr === "string" &&
    typeof value.dhuhr === "string" &&
    typeof value.asr === "string" &&
    typeof value.maghrib === "string" &&
    typeof value.isha === "string" &&
    isSlotArray(value.jummah) &&
    (value.jummah2 === undefined || isSlotArray(value.jummah2))
  );
}

export async function GET() {
  const data = await getJamaatTimes();
  return Response.json({ ok: true, data }, { status: 200 });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;

  if (session !== "ok") {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const candidate = body?.data ?? body;

    if (!isValidJamaat(candidate)) {
      return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    await saveJamaatTimes(candidate);
    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
}
