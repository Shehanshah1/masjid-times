import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const passcode = String(body?.passcode ?? "").trim();
    // Default to a safe placeholder if env is missing to prevent crash
    const expected = String(process.env.ADMIN_PASSCODE ?? "").trim();

    if (!expected) {
      console.error("ADMIN_PASSCODE is not set in .env file");
      return Response.json(
        { ok: false, error: "Server configuration error: ADMIN_PASSCODE missing" },
        { status: 500 }
      );
    }

    if (passcode !== expected) {
      return Response.json({ ok: false }, { status: 401 });
    }

    const cookieStore = await cookies();

    cookieStore.set("admin_session", "ok", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}