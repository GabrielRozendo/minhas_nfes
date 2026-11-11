import https from "node:https";
import { getEnv } from "@/lib/config/env";
import { getCertificateInfo } from "./certificate";

export type AdnDfeItem = {
  nsu: string;
  chaveAcesso?: string;
  xml?: string;
  tipoDocumento?: string;
  raw?: unknown;
};

function adnBaseUrl() {
  const env = getEnv();
  return env.isProducao
    ? "https://adn.nfse.gov.br/contribuintes"
    : "https://adn.producaorestrita.nfse.gov.br/contribuintes";
}

/** NSU do ADN costuma ter 20 dígitos. */
export function normalizeNsu(nsu: string | number | null | undefined) {
  const digits = String(nsu ?? "0").replace(/\D/g, "") || "0";
  return digits.padStart(20, "0");
}

/**
 * Desde ~31/10/2026 a API ADN rejeita GET /DFe/{NSU} sem cnpjConsulta/cpfConsulta
 * (mesmo para o próprio titular), com REJEICAO e Erros=[].
 * Workaround oficial da comunidade: informar o documento explicitamente.
 */
function resolveConsultaQuery() {
  const env = getEnv();
  let doc = env.CPFCNPJ_PRESTADOR.replace(/\D/g, "");

  if (!doc) {
    const cn = getCertificateInfo().commonName ?? "";
    const match = cn.replace(/\D/g, "");
    // e-CNPJ: 14 dígitos no CN; e-CPF: 11
    if (match.length >= 14) doc = match.slice(-14);
    else if (match.length >= 11) doc = match.slice(-11);
  }

  if (!doc) {
    throw new Error(
      "ADN exige cnpjConsulta/cpfConsulta: defina CPFCNPJ_PRESTADOR no .env",
    );
  }

  if (doc.length <= 11) {
    return `cpfConsulta=${doc.padStart(11, "0")}`;
  }
  return `cnpjConsulta=${doc.padStart(14, "0")}`;
}

function mtlsRequest(pathnameWithQuery: string): Promise<{
  status: number;
  ok: boolean;
  json: unknown;
  text: string;
}> {
  const cert = getCertificateInfo();
  const url = new URL(`${adnBaseUrl()}${pathnameWithQuery}`);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: { Accept: "application/json" },
        cert: cert.certificatePem,
        key: cert.privateKeyPem,
        rejectUnauthorized: true,
        timeout: 30000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json: unknown = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = { raw: text };
          }
          const status = res.statusCode ?? 0;
          resolve({ status, ok: status >= 200 && status < 300, json, text });
        });
      },
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("ADN request timeout"));
    });
    req.end();
  });
}

function collectDocs(payload: unknown): AdnDfeItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;

  const candidates =
    (root.LoteDFe as unknown) ??
    (root.loteDFe as unknown) ??
    (root.Documentos as unknown) ??
    (root.documentos as unknown) ??
    (root.DFe as unknown) ??
    [];

  const list = Array.isArray(candidates)
    ? candidates
    : candidates
      ? [candidates]
      : [];

  return list.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const nsu = normalizeNsu(
      String(row.NSU ?? row.nsu ?? row.Nsu ?? row.NumeroNSU ?? index + 1),
    );
    const chaveAcesso =
      String(
        row.ChaveAcesso ?? row.chaveAcesso ?? row.chNFSe ?? row.Chave ?? "",
      ).replace(/\D/g, "") || undefined;
    const xml =
      String(
        row.ArquivoXml ??
          row.arquivoXml ??
          row.XML ??
          row.xml ??
          row.Arquivo ??
          "",
      ) || undefined;
    return {
      nsu,
      chaveAcesso,
      xml,
      tipoDocumento: String(row.TipoDocumento ?? row.tipoDocumento ?? ""),
      raw: item,
    };
  });
}

function formatAdnError(json: unknown, text: string, status: number) {
  if (json && typeof json === "object") {
    const root = json as Record<string, unknown>;
    const erros = root.Erros ?? root.erros;
    if (Array.isArray(erros) && erros.length > 0) {
      return `ADN HTTP ${status}: ${JSON.stringify(erros)}`;
    }
    const statusProc = root.StatusProcessamento ?? root.statusProcessamento;
    return `ADN HTTP ${status} (${String(statusProc ?? "sem status")}): ${JSON.stringify(json)}`.slice(
      0,
      500,
    );
  }
  return `ADN HTTP ${status}: ${text}`.slice(0, 500);
}

export async function fetchDfeFromNsu(ultimoNsu: string) {
  const nsu = normalizeNsu(ultimoNsu);
  const consulta = resolveConsultaQuery();
  const result = await mtlsRequest(`/DFe/${nsu}?${consulta}`);

  const root = (result.json ?? {}) as Record<string, unknown>;
  const statusProc = String(
    root.StatusProcessamento ?? root.statusProcessamento ?? "",
  ).toUpperCase();

  // Sem documentos: resposta esperada (não é falha)
  if (
    result.status === 404 ||
    statusProc.includes("NENHUM_DOCUMENTO") ||
    statusProc === "NENHUM_DOCUMENTO_LOCALIZADO"
  ) {
    return {
      empty: true as const,
      items: [] as AdnDfeItem[],
      ultimoNsu: nsu,
      maxNsu: nsu,
    };
  }

  if (!result.ok || statusProc === "REJEICAO") {
    throw new Error(formatAdnError(result.json, result.text, result.status));
  }

  const items = collectDocs(result.json);
  const maxNsu = normalizeNsu(
    String(
      root.MaxNSU ??
        root.maxNSU ??
        root.UltimoNSU ??
        root.ultimoNSU ??
        items.at(-1)?.nsu ??
        nsu,
    ),
  );

  if (items.length === 0) {
    return { empty: true as const, items, ultimoNsu: nsu, maxNsu };
  }

  return {
    empty: false as const,
    items,
    ultimoNsu: nsu,
    maxNsu,
  };
}
