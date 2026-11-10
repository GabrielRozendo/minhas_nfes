import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const authEnabled =
    process.env.AUTH_ENABLED === "true" || process.env.AUTH_ENABLED === "1";
  if (!authEnabled) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // API: Bearer key OR session cookie
  if (pathname.startsWith("/api/")) {
    const auth = request.headers.get("authorization");
    const apiKey = process.env.API_KEY ?? "";
    if (apiKey && auth === `Bearer ${apiKey}`) {
      return NextResponse.next();
    }
  }

  const token = request.cookies.get("nfse_session")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET ||
        process.env.API_KEY ||
        process.env.AUTH_PASSWORD ||
        "dev-insecure-secret",
    );
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
