import {
  EmitenteDPS,
  TipoAmbiente,
  formatDhEmissao,
  generateDpsId,
  type DpsData,
} from "nfse-nacional";
import { getEnv } from "@/lib/config/env";

export type EmitParams = Record<string, unknown>;

export function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof out[key] === "object" &&
      out[key] &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(
        out[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

function applyParamShortcuts(
  inf: Record<string, unknown>,
  params: EmitParams,
) {
  const next = { ...inf };

  if (params.competencia) {
    next.dataCompetencia = String(params.competencia);
  }
  if (params.valor !== undefined) {
    const valores = {
      ...((next.valores as Record<string, unknown>) ?? {}),
      vServico: Number(params.valor),
    };
    next.valores = valores;
  }
  if (params.discriminacao) {
    const servico = {
      ...((next.servico as Record<string, unknown>) ?? {}),
      xDescServ: String(params.discriminacao),
    };
    next.servico = servico;
  }
  if (params.tomador && typeof params.tomador === "object") {
    next.tomador = deepMerge(
      ((next.tomador as Record<string, unknown>) ?? {}),
      params.tomador as Record<string, unknown>,
    );
  }
  if (params.tomadorNome || params.tomadorDoc) {
    const tomador = {
      ...((next.tomador as Record<string, unknown>) ?? {}),
    };
    if (params.tomadorNome) tomador.nome = String(params.tomadorNome);
    if (params.tomadorDoc) {
      const doc = String(params.tomadorDoc).replace(/\D/g, "");
      if (doc.length === 11) {
        tomador.cpf = doc;
        delete tomador.cnpj;
      } else {
        tomador.cnpj = doc;
        delete tomador.cpf;
      }
    }
    next.tomador = tomador;
  }

  return next;
}

export function buildDpsFromTemplate(options: {
  fixedPayload: Record<string, unknown>;
  params?: EmitParams;
  serie: string;
  numeroDps: string;
}) {
  const env = getEnv();
  const fixed = options.fixedPayload;
  const baseInf =
    (fixed.infDps as Record<string, unknown>) ??
    (fixed as Record<string, unknown>);

  let inf = deepMerge({}, baseInf);
  if (options.params) {
    const { dpsPatch, ...shortcuts } = options.params;
    inf = applyParamShortcuts(inf, shortcuts);
    if (dpsPatch && typeof dpsPatch === "object") {
      inf = deepMerge(inf, dpsPatch as Record<string, unknown>);
    }
  }

  const prestador = (inf.prestador as Record<string, unknown>) ?? {};
  if (!prestador.cnpj && !prestador.cpf && env.CPFCNPJ_PRESTADOR) {
    const doc = env.CPFCNPJ_PRESTADOR.replace(/\D/g, "");
    if (doc.length === 11) prestador.cpf = doc;
    else prestador.cnpj = doc;
  }
  if (!prestador.inscricaoMunicipal && env.INSCRICAO_MUNICIPAL) {
    prestador.inscricaoMunicipal = env.INSCRICAO_MUNICIPAL;
  }
  inf.prestador = prestador;

  const docPrestador = String(prestador.cnpj ?? prestador.cpf ?? "").replace(
    /\D/g,
    "",
  );
  const codMun = String(
    inf.codigoLocalEmissao ?? env.CODIGO_MUNICIPIO,
  ).padStart(7, "0");

  inf.tipoAmbiente = env.isProducao
    ? TipoAmbiente.Producao
    : TipoAmbiente.Homologacao;
  inf.dataEmissao = formatDhEmissao(new Date());
  inf.serie = options.serie;
  inf.numeroDps = options.numeroDps;
  inf.codigoLocalEmissao = codMun;
  inf.tipoEmitente = inf.tipoEmitente ?? EmitenteDPS.Prestador;
  inf.versaoAplicativo = inf.versaoAplicativo ?? env.VER_APLIC;
  inf.id = generateDpsId(docPrestador, codMun, options.serie, options.numeroDps);

  if (!inf.dataCompetencia) {
    const now = new Date();
    inf.dataCompetencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }

  const dps: DpsData = {
    versao: String(fixed.versao ?? "1.01"),
    infDps: inf as unknown as DpsData["infDps"],
  };

  return dps;
}

export function extractNotaMeta(dps: DpsData) {
  const toma = dps.infDps.tomador;
  const doc = toma?.cnpj ?? toma?.cpf ?? "";
  return {
    tomadorNome: toma?.nome ?? null,
    tomadorDoc: doc || null,
    valor: dps.infDps.valores?.vServico ?? null,
    competencia: dps.infDps.dataCompetencia ?? null,
    discriminacao: dps.infDps.servico?.xDescServ ?? null,
    dpsId: dps.infDps.id,
    numeroDps: dps.infDps.numeroDps,
    serie: dps.infDps.serie ?? null,
  };
}
