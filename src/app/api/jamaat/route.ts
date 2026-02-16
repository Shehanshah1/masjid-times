const DEFAULTS = {
  fajr: "06:35",
  dhuhr: "13:20",
  asr: "17:15",
  maghrib: "17:50",
  isha: "19:15",
  jummah: [{ khutbah: "12:45", salah: "13:15" }],
};

export async function GET() {
  // Read the "current" jamaat times from the update route (in-memory store)
  const res = await fetch("http://localhost:3000/api/jamaat/update", {
    cache: "no-store",
  });

  if (!res.ok) {
    return Response.json({ ok: true, data: DEFAULTS });
  }

  const json = await res.json();
  return Response.json({ ok: true, data: json.data ?? DEFAULTS });
}
