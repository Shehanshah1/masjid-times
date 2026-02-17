import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";

type Jamaat = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: { khutbah: string; salah: string }[];
};

export const dynamic = "force-dynamic";

/* ================= Fallback ================= */

const FALLBACK: Jamaat = {
  fajr: "06:35",
  dhuhr: "13:20",
  asr: "17:15",
  maghrib: "17:50",
  isha: "19:15",
  jummah: [{ khutbah: "12:45", salah: "13:15" }],
};

/* ================= Validation ================= */

function isValidJamaat(x: any): x is Jamaat {
  return (
    x &&
    typeof x.fajr === "string" &&
    typeof x.dhuhr === "string" &&
    typeof x.asr === "string" &&
    typeof x.maghrib === "string" &&
    typeof x.isha === "string" &&
    Array.isArray(x.jummah) &&
    x.jummah.every(
      (j: any) =>
        j &&
        typeof j.khutbah === "string" &&
        typeof j.salah === "string"
    )
  );
}

/* ================= Storage =================
   Persists to: /data/jamaat.json at project root
   Works great for VPS/local/kiosk.
   (If hosting is serverless, switch to DB/KV.)
============================================ */

const DATA_PATH = path.join(process.cwd(), "data", "jamaat.json");

async function ensureDir() {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
}

async function readJamaat(): Promise<Jamaat> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const json = JSON.parse(raw);
    return isValidJamaat(json) ? json : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

async function writeJamaat(next: Jamaat) {
  if (!isValidJamaat(next)) throw new Error("Invalid payload");
  await ensureDir();
  await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf8");
}

/* ================= Route handlers ================= */

export async function GET() {
  const data = await readJamaat();
  return Response.json({ ok: true, data }, { status: 200 });
}

export async function POST(req: Request) {
 const cookieStore = await cookies();
const session = cookieStore.get("admin_session")?.value;


  if (session !== "ok") {
    return Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    // Accept BOTH shapes:
    // 1) direct Jamaat
    // 2) { data: Jamaat }
    const candidate = body?.data ?? body;

    if (!isValidJamaat(candidate)) {
      return Response.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 }
      );
    }

    await writeJamaat(candidate);

    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }
}
