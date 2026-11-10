import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/config/env";

const COOKIE_NAME = "nfse_session";

function secretKey() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function createSessionToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function setSessionCookie() {
  const token = await createSessionToken();
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function hasValidSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export function isApiKeyValid(header: string | null) {
  const env = getEnv();
  if (!env.API_KEY) return false;
  if (!header?.startsWith("Bearer ")) return false;
  const key = header.slice("Bearer ".length).trim();
  return key.length > 0 && key === env.API_KEY;
}

export async function requireAuth(request: Request) {
  const env = getEnv();
  if (!env.authRequired) return { ok: true as const };

  if (isApiKeyValid(request.headers.get("authorization"))) {
    return { ok: true as const };
  }

  if (await hasValidSession()) {
    return { ok: true as const };
  }

  return { ok: false as const, status: 401 as const };
}
