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

function mtlsRequest(pathname: string): Promise<{
  status: number;
  ok: boolean;
  json: unknown;
  text: string;
}> {
  const cert = getCertificateInfo();
  const url = new URL(`${adnBaseUrl()}${pathname}`);

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
    const nsu = String(
      row.NSU ?? row.nsu ?? row.Nsu ?? row.NumeroNSU ?? index + 1,
    );
    const chaveAcesso =
      String(
        row.ChaveAcesso ?? row.chaveAcesso ?? row.chNFSe ?? row.Chave ?? "",
      ).replace(/\D/g, "") || undefined;
    const xml =
      String(row.ArquivoXml ?? row.arquivoXml ?? row.XML ?? row.xml ?? "") ||
      undefined;
    return {
      nsu,
      chaveAcesso,
      xml,
      tipoDocumento: String(row.TipoDocumento ?? row.tipoDocumento ?? ""),
      raw: item,
    };
  });
}

export async function fetchDfeFromNsu(ultimoNsu: string) {
  const pathNsu = encodeURIComponent(ultimoNsu || "0");
  const result = await mtlsRequest(`/DFe/${pathNsu}`);

  if (result.status === 404) {
    return {
      empty: true as const,
      items: [] as AdnDfeItem[],
      ultimoNsu,
      maxNsu: ultimoNsu,
    };
  }

  if (!result.ok) {
    throw new Error(
      `ADN HTTP ${result.status}: ${typeof result.json === "object" ? JSON.stringify(result.json) : result.text}`.slice(
        0,
        500,
      ),
    );
  }

  const root = (result.json ?? {}) as Record<string, unknown>;
  const items = collectDocs(result.json);
  const maxNsu = String(
    root.MaxNSU ??
      root.maxNSU ??
      root.UltimoNSU ??
      root.ultimoNSU ??
      (items.at(-1)?.nsu ?? ultimoNsu),
  );

  const empty =
    items.length === 0 ||
    Boolean(root.StatusProcessamento === "NENHUM_DOCUMENTO") ||
    /nenhum documento/i.test(JSON.stringify(root));

  return { empty, items, ultimoNsu, maxNsu };
}
