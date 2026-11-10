import { DanfeService } from "nfse-nacional";
import { getEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { notas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  hasPdfFile,
  hasXmlFile,
  readPdfFile,
  readXmlFile,
  savePdfFile,
  saveXmlFile,
} from "./files";
import { getCertificateInfo } from "./certificate";
import {
  assertCircuitClosed,
  recordGovFailure,
  recordGovSuccess,
} from "./circuit-breaker";
import { ContribuinteService, TipoAmbiente } from "nfse-nacional";

export type PdfSource = "cache" | "gov" | "local";

function sefin() {
  const env = getEnv();
  getCertificateInfo();
  return new ContribuinteService({
    ambiente: env.isProducao ? TipoAmbiente.Producao : TipoAmbiente.Homologacao,
    certificatePath: env.CERT_PATH,
    certificatePassword: env.CERT_PASSWORD,
    codigoMunicipio: env.CODIGO_MUNICIPIO,
  });
}

function decodeMaybeBase64Pdf(payload: string): Buffer | null {
  const cleaned = payload.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("%PDF")) return Buffer.from(cleaned, "utf8");
  try {
    const buf = Buffer.from(cleaned, "base64");
    if (buf.subarray(0, 4).toString("utf8") === "%PDF") return buf;
  } catch {
    /* ignore */
  }
  return null;
}

async function tryOfficialPdf(chave: string): Promise<Buffer | null> {
  if (!getEnv().PDF_TRY_OFFICIAL) return null;
  assertCircuitClosed();
  try {
    const raw = await sefin().downloadDanfse(chave);
    recordGovSuccess();
    return decodeMaybeBase64Pdf(raw);
  } catch (error) {
    recordGovFailure(error);
    return null;
  }
}

async function generateLocalPdf(xml: string, chave: string): Promise<Buffer> {
  const danfe = new DanfeService();
  const result = await danfe.generateFromXml(xml, { chaveAcesso: chave });
  return result.pdfBytes;
}

function updateNotaPaths(
  chave: string,
  paths: { xmlPath?: string; pdfPath?: string; pdfSource?: string },
) {
  const db = getDb();
  const row = db.select().from(notas).where(eq(notas.chaveAcesso, chave)).get();
  if (!row) return;
  db.update(notas)
    .set({
      xmlPath: paths.xmlPath ?? row.xmlPath,
      pdfPath: paths.pdfPath ?? row.pdfPath,
      pdfSource: paths.pdfSource ?? row.pdfSource,
    })
    .where(eq(notas.id, row.id))
    .run();
}

export async function ensureNotaArtifacts(options: {
  chave: string;
  xml?: string | null;
  generatePdf?: boolean;
}) {
  const { chave } = options;
  let xml = options.xml ?? null;

  if (xml) {
    saveXmlFile(chave, xml);
    updateNotaPaths(chave, { xmlPath: `xml/${chave}.xml` });
  } else if (!readXmlFile(chave)) {
    const row = getDb()
      .select()
      .from(notas)
      .where(eq(notas.chaveAcesso, chave))
      .get();
    xml = row?.xmlNfse ?? null;
    if (xml) {
      saveXmlFile(chave, xml);
      updateNotaPaths(chave, { xmlPath: `xml/${chave}.xml` });
    }
  } else {
    xml = readXmlFile(chave);
  }

  if (!options.generatePdf) {
    return {
      xmlPath: hasXmlFile(chave) ? `xml/${chave}.xml` : null,
      pdfPath: hasPdfFile(chave) ? `pdf/${chave}.pdf` : null,
      pdfSource: null as string | null,
    };
  }

  if (hasPdfFile(chave)) {
    return {
      xmlPath: hasXmlFile(chave) ? `xml/${chave}.xml` : null,
      pdfPath: `pdf/${chave}.pdf`,
      pdfSource: "cache" as const,
    };
  }

  const official = await tryOfficialPdf(chave);
  if (official) {
    savePdfFile(chave, official);
    updateNotaPaths(chave, {
      pdfPath: `pdf/${chave}.pdf`,
      pdfSource: "gov",
    });
    return {
      xmlPath: hasXmlFile(chave) ? `xml/${chave}.xml` : null,
      pdfPath: `pdf/${chave}.pdf`,
      pdfSource: "gov" as const,
    };
  }

  if (!xml) {
    const err = new Error(
      "XML da NFS-e não disponível para gerar DANFSe local",
    );
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const localPdf = await generateLocalPdf(xml, chave);
  savePdfFile(chave, localPdf);
  updateNotaPaths(chave, {
    pdfPath: `pdf/${chave}.pdf`,
    pdfSource: "local",
  });

  return {
    xmlPath: `xml/${chave}.xml`,
    pdfPath: `pdf/${chave}.pdf`,
    pdfSource: "local" as const,
  };
}

export async function getNotaPdfBuffer(chave: string) {
  if (hasPdfFile(chave)) {
    return {
      buffer: readPdfFile(chave)!,
      source: "cache" as PdfSource,
    };
  }

  const artifacts = await ensureNotaArtifacts({
    chave,
    generatePdf: true,
  });

  const buffer = readPdfFile(chave);
  if (!buffer) {
    const err = new Error("Não foi possível obter PDF da nota");
    (err as Error & { status: number }).status = 500;
    throw err;
  }

  return {
    buffer,
    source: (artifacts.pdfSource ?? "local") as PdfSource,
  };
}
