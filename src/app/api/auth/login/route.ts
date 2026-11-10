import { NextResponse } from "next/server";
import { getEnv } from "@/lib/config/env";
import { setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const env = getEnv();
  if (!env.authRequired) {
    return NextResponse.json({ ok: true, authDisabled: true });
  }

  const body = (await request.json()) as { password?: string };
  if (!body.password || body.password !== env.AUTH_PASSWORD) {
    return NextResponse.json({ error: "Senha inválida" }, { status: 401 });
  }

  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
