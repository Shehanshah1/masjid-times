import { GET as getJamaat, POST as updateJamaat } from "../route";

export const dynamic = "force-dynamic";

export async function GET() {
  return getJamaat();
}

export async function POST(req: Request) {
  return updateJamaat(req);
}
