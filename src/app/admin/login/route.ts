import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { passcode } = await req.json();

    if (!process.env.ADMIN_PASSCODE) {
      return Response.json(
        { ok: false, error: "ADMIN_PASSCODE not configured" },
        { status: 500 }
      );
    }

    if (passcode !== process.env.ADMIN_PASSCODE) {
      return Response.json({ ok: false }, { status: 401 });
    }

    const cookieStore = cookies();

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
