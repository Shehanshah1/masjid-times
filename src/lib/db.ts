import { kv } from "@vercel/kv";
import { promises as fs } from "fs";
import path from "path";

export type JummahSlot = { khutbah: string; salah: string };

export type Jamaat = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: JummahSlot[];
  jummah2?: JummahSlot[]; // Optional second slot for display page
};

const DEFAULTS: Jamaat = {
  fajr: "06:35",
  dhuhr: "13:20",
  asr: "17:15",
  maghrib: "17:50",
  isha: "19:15",
  jummah: [{ khutbah: "12:45", salah: "13:15" }],
  jummah2: [{ khutbah: "13:15", salah: "13:45" }], // Default second slot
};

const FS_DATA_PATH = path.join(process.cwd(), "data", "jamaat.json");

// Helper to check if Vercel KV is configured
const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function isValidJamaat(x: unknown): x is Jamaat {
  if (!x || typeof x !== "object") return false;

  const value = x as Partial<Jamaat> & { jummah?: unknown };

  return (
    typeof value.fajr === "string" &&
    typeof value.dhuhr === "string" &&
    typeof value.asr === "string" &&
    typeof value.maghrib === "string" &&
    typeof value.isha === "string" &&
    Array.isArray(value.jummah)
  );
}

export async function getJamaatTimes(): Promise<Jamaat> {
  // 1. Try Vercel KV
  if (hasKV) {
    try {
      const data = await kv.get<Jamaat>("jamaat_times");
      if (data && isValidJamaat(data)) return data;
    } catch (error) {
      console.error("KV Read Error:", error);
    }
  }

  // 2. Fallback to Filesystem (Local Dev)
  try {
    const raw = await fs.readFile(FS_DATA_PATH, "utf8");
    const json = JSON.parse(raw);
    if (isValidJamaat(json)) return json;
  } catch {
    // File doesn't exist or error reading, ignore
  }

  // 3. Return Defaults
  return DEFAULTS;
}

export async function saveJamaatTimes(data: Jamaat): Promise<void> {
  if (!isValidJamaat(data)) throw new Error("Invalid payload");

  // 1. Save to Vercel KV
  if (hasKV) {
    await kv.set("jamaat_times", data);
  }

  // 2. Always sync to Filesystem (useful for local dev or backup)
  try {
    await fs.mkdir(path.dirname(FS_DATA_PATH), { recursive: true });
    await fs.writeFile(FS_DATA_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    // If running in a read-only serverless environment, this might fail, which is expected.
    if (!hasKV) console.error("FS Write Error:", error);
  }
}