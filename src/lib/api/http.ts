import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { safeErrorMessage } from "@/lib/nfse/safe-log";

export async function withApiAuth(
  request: Request,
  handler: () => Promise<Response>,
) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await handler();
  } catch (error) {
    const status =
      typeof error === "object" &&
      error &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;

    return NextResponse.json(
      {
        error: safeErrorMessage(error),
        code,
      },
      { status },
    );
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function requireIdempotencyKey(request: Request) {
  const key =
    request.headers.get("idempotency-key") ||
    request.headers.get("Idempotency-Key");
  if (!key?.trim()) {
    const err = new Error("Header Idempotency-Key é obrigatório");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  return key.trim();
}
