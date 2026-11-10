import { NextResponse } from "next/server";
import { getCertificateStatus } from "@/lib/nfse/certificate";
import { getEnv } from "@/lib/config/env";

export const runtime = "nodejs";

export async function GET() {
  const env = getEnv();
  const cert = getCertificateStatus();
  return NextResponse.json({
    ok: cert.ok,
    ambiente: env.NFSE_AMBIENTE,
    certificate: cert.ok
      ? { expiresAt: cert.expiresAt, daysLeft: cert.daysLeft }
      : { error: cert.error },
  });
}
