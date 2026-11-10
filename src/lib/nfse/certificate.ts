import fs from "node:fs";
import { loadCertificate, type CertificateInfo } from "nfse-nacional";
import { getEnv } from "@/lib/config/env";

declare global {
  // eslint-disable-next-line no-var
  var __nfseCert: CertificateInfo | undefined;
}

export function getCertificateInfo(): CertificateInfo {
  if (globalThis.__nfseCert) return globalThis.__nfseCert;

  const env = getEnv();
  if (!env.CERT_PASSWORD) {
    throw new Error("CERT_PASSWORD não configurada");
  }
  if (!fs.existsSync(env.CERT_PATH)) {
    throw new Error(`Certificado não encontrado em ${env.CERT_PATH}`);
  }

  const info = loadCertificate(env.CERT_PATH, env.CERT_PASSWORD);
  globalThis.__nfseCert = info;
  return info;
}

export function getCertificateStatus() {
  try {
    const info = getCertificateInfo();
    const expiresAt = info.expiresAt;
    const daysLeft = Math.floor(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return {
      ok: true as const,
      commonName: info.commonName,
      expiresAt: expiresAt.toISOString(),
      daysLeft,
      pathConfigured: true,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
      pathConfigured: Boolean(getEnv().CERT_PATH),
    };
  }
}
