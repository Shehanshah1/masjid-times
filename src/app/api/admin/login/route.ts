import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { passcode } = await req.json();

  if (!process.env.ADMIN_PASSCODE) {
  return Response.json({ ok: false, error: "Missing ADMIN_PASSCODE" }, { status: 500 });
}

  if (passcode !== process.env.ADMIN_PASSCODE) {

    return Response.json({ ok: false }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_session", "ok", {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return Response.json({ ok: true });
}
