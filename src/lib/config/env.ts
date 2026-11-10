import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),

  AUTH_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  AUTH_PASSWORD: z.string().optional().default(""),
  API_KEY: z.string().optional().default(""),
  SESSION_SECRET: z.string().optional().default(""),

  CERT_PATH: z.string().default("/certs/certificado.pfx"),
  CERT_PASSWORD: z.string().default(""),

  NFSE_AMBIENTE: z.enum(["homologacao", "producao"]).default("homologacao"),
  CODIGO_MUNICIPIO: z.string().min(7).max(7).default("0000000"),
  CPFCNPJ_PRESTADOR: z.string().default(""),
  INSCRICAO_MUNICIPAL: z.string().optional().default(""),
  DPS_SERIE: z.string().default("1"),
  VER_APLIC: z.string().default("minhas-nfes/0.1.0"),

  DATABASE_PATH: z.string().default("./data/nfse.db"),
  FILES_PATH: z.string().default("./files"),

  /** Tenta GET /nfse/{chave}/pdf na SEFIN antes de gerar DANFSe local (API oficial costuma estar suspensa). */
  PDF_TRY_OFFICIAL: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),

  ADN_SYNC_MIN_INTERVAL_MS: z.coerce.number().default(60 * 60 * 1000),
  CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number().default(30 * 60 * 1000),
});

export type AppEnv = z.infer<typeof envSchema> & {
  isProducao: boolean;
  authRequired: boolean;
};

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }

  const data = parsed.data;
  const sessionSecret =
    data.SESSION_SECRET || data.API_KEY || data.AUTH_PASSWORD || "dev-insecure-secret";

  if (data.AUTH_ENABLED && !data.AUTH_PASSWORD && !data.API_KEY) {
    throw new Error(
      "AUTH_ENABLED=true requer AUTH_PASSWORD (dashboard) e/ou API_KEY (API)",
    );
  }

  cached = {
    ...data,
    SESSION_SECRET: sessionSecret,
    isProducao: data.NFSE_AMBIENTE === "producao",
    authRequired: Boolean(data.AUTH_ENABLED),
  };

  return cached;
}

export function resetEnvCache() {
  cached = null;
}
