// src/app/api/jamaat/update/route.ts

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;

  if (session !== "ok") {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const candidate = body.data ?? body;

  // 1. Get existing data first
  const existingData = await getJamaatTimes();

  // 2. Validate the incoming update
  if (!isValidJamaat(candidate)) {
    return Response.json({ ok: false, error: "Invalid payload format" }, { status: 400 });
  }

  try {
    // 3. MERGE candidate with existing to preserve jummah2
    const finalData = {
      ...existingData,
      ...candidate,
      // If candidate has jummah, use it; otherwise keep existing
      jummah: candidate.jummah || existingData.jummah 
    };

    await saveJamaatTimes(finalData);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: "Database error" }, { status: 500 });
  }
}