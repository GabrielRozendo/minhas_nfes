export type ParamFieldType =
  | "money"
  | "date"
  | "text"
  | "textarea"
  | "document";

export type TemplateParamField = {
  key: string;
  label: string;
  type: ParamFieldType;
  required?: boolean;
  defaultValue?: string | number;
};

export type TemplateParamSchema = {
  fields: TemplateParamField[];
};

/** Parâmetros típicos de nota recorrente (mesmo CNPJ, n8n mensal). */
export const DEFAULT_PARAM_FIELDS: TemplateParamField[] = [
  {
    key: "competencia",
    label: "Competência",
    type: "date",
    required: true,
  },
  {
    key: "valor",
    label: "Valor da nota",
    type: "money",
    required: true,
    defaultValue: 0,
  },
  {
    key: "discriminacao",
    label: "Descrição do serviço",
    type: "textarea",
    required: true,
  },
];

export type TemplateFormData = {
  name: string;
  description: string;
  tomadorNome: string;
  tomadorDoc: string;
  tomadorLogradouro: string;
  tomadorNumero: string;
  tomadorComplemento: string;
  tomadorBairro: string;
  tomadorMunicipio: string;
  tomadorCep: string;
  codigoServico: string;
  codigoServicoMun: string;
  codigoNbs: string;
  codigoMunicipio: string;
  discriminacaoPadrao: string;
  /** Alíquota ISS em decimal; vazio = não enviar no DPS. */
  aliquota: string;
  tributacaoIssqn: number;
  tipoRetencaoIssqn: number;
  cstPisCofins: string;
  tipoRetencaoPisCofins: number;
  percentualTotalTributosSN: string;
  ibsFinNfse: string;
  ibsIndFinal: string;
  ibsCIndOp: string;
  ibsIndDest: string;
  ibsCst: string;
  ibsClassTrib: string;
  opSimpNac: number;
  regApurSN: string;
  regEspTrib: number;
  paramFields: TemplateParamField[];
};

export function normalizeParamSchema(raw: unknown): TemplateParamSchema {
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as TemplateParamSchema).fields)
  ) {
    const fields = (raw as TemplateParamSchema).fields.filter(
      (f) => f && typeof f.key === "string" && f.key.trim(),
    );
    if (fields.length > 0) return { fields };
  }
  return { fields: DEFAULT_PARAM_FIELDS.map((f) => ({ ...f })) };
}

function trimOrUndef(v: string | undefined | null): string | undefined {
  const t = (v ?? "").trim();
  return t || undefined;
}

export function buildFixedPayloadFromForm(
  form: TemplateFormData,
  envDefaults?: { cnpj?: string; im?: string; municipio?: string },
): Record<string, unknown> {
  const doc = form.tomadorDoc.replace(/\D/g, "");
  const tomador: Record<string, unknown> = {
    nome: form.tomadorNome.trim(),
  };
  if (doc.length === 11) tomador.cpf = doc;
  else if (doc.length >= 14) tomador.cnpj = doc;

  const end: Record<string, unknown> = {};
  const xLgr = trimOrUndef(form.tomadorLogradouro);
  const nro = trimOrUndef(form.tomadorNumero);
  const xCpl = trimOrUndef(form.tomadorComplemento);
  const xBairro = trimOrUndef(form.tomadorBairro);
  const cMun = trimOrUndef(form.tomadorMunicipio)?.padStart(7, "0");
  const cep = trimOrUndef(form.tomadorCep)?.replace(/\D/g, "");
  if (xLgr) end.xLgr = xLgr;
  if (nro) end.nro = nro;
  if (xCpl) end.xCpl = xCpl;
  if (xBairro) end.xBairro = xBairro;
  if (cMun) end.cMun = cMun;
  if (cep) end.cep = cep;
  if (Object.keys(end).length > 0) tomador.endereco = end;

  const municipio = (
    form.codigoMunicipio ||
    envDefaults?.municipio ||
    "0000000"
  ).padStart(7, "0");

  const regimeTributario: Record<string, unknown> = {
    opSimpNac: Number(form.opSimpNac) || 1,
    regEspTrib: Number(form.regEspTrib) || 0,
  };
  const regApur = trimOrUndef(form.regApurSN);
  if (regApur != null) regimeTributario.regApurSN = Number(regApur);

  const prestador: Record<string, unknown> = {
    regimeTributario,
  };
  if (envDefaults?.cnpj) {
    const p = envDefaults.cnpj.replace(/\D/g, "");
    if (p.length === 11) prestador.cpf = p;
    else if (p) prestador.cnpj = p;
  }
  if (envDefaults?.im) prestador.inscricaoMunicipal = envDefaults.im;

  const codigoServico: Record<string, unknown> = {
    cServTribNac: form.codigoServico.trim().replace(/\D/g, ""),
  };
  const cServMun = trimOrUndef(form.codigoServicoMun)?.replace(/\D/g, "");
  const cNBS = trimOrUndef(form.codigoNbs)?.replace(/\D/g, "");
  if (cServMun) codigoServico.cServMun = cServMun;
  if (cNBS) codigoServico.cNBSPrinc = cNBS;

  const issqn: Record<string, unknown> = {
    tributacaoIssqn: Number(form.tributacaoIssqn) || 1,
    tipoRetencaoIssqn: Number(form.tipoRetencaoIssqn) || 1,
  };
  const aliquotaRaw = trimOrUndef(form.aliquota);
  if (aliquotaRaw != null) {
    const aliquota = Number(aliquotaRaw);
    if (!Number.isNaN(aliquota)) issqn.aliquota = aliquota;
  }

  const tributacao: Record<string, unknown> = {
    issqn,
  };

  const cst = trimOrUndef(form.cstPisCofins);
  if (cst != null) {
    tributacao.federal = {
      cstPisCofins: cst,
      tipoRetencaoPisCofins: Number(form.tipoRetencaoPisCofins) || 0,
    };
  }

  const pTotSn = trimOrUndef(form.percentualTotalTributosSN);
  if (pTotSn != null) {
    tributacao.percentualTotalTributosSN = Number(pTotSn);
  }

  const infDps: Record<string, unknown> = {
    prestador,
    tomador,
    servico: {
      localPrestacao: { cLocPrestacao: municipio },
      codigoServico,
      xDescServ: form.discriminacaoPadrao.trim() || "Prestação de serviços",
    },
    tributacao,
  };

  const cIndOp = trimOrUndef(form.ibsCIndOp);
  const cstIbs = trimOrUndef(form.ibsCst);
  const classTrib = trimOrUndef(form.ibsClassTrib);
  if (cIndOp && cstIbs && classTrib) {
    infDps.ibsCbs = {
      finNFSe: form.ibsFinNfse.trim() || "0",
      indFinal: form.ibsIndFinal.trim() || "0",
      cIndOp,
      indDest: form.ibsIndDest.trim() || "0",
      valores: {
        trib: {
          gIBSCBS: {
            CST: cstIbs,
            cClassTrib: classTrib,
          },
        },
      },
    };
  }

  return { infDps };
}

export function formFromTemplate(tpl: {
  name: string;
  description: string;
  fixedPayload: Record<string, unknown>;
  paramSchema: unknown;
}): TemplateFormData {
  const inf =
    (tpl.fixedPayload.infDps as Record<string, unknown>) ?? tpl.fixedPayload;
  const tomador = (inf.tomador as Record<string, unknown>) ?? {};
  const endereco = (tomador.endereco as Record<string, unknown>) ?? {};
  const servico = (inf.servico as Record<string, unknown>) ?? {};
  const codigo = (servico.codigoServico as Record<string, unknown>) ?? {};
  const local = (servico.localPrestacao as Record<string, unknown>) ?? {};
  const trib = (inf.tributacao as Record<string, unknown>) ?? {};
  const issqn = (trib.issqn as Record<string, unknown>) ?? {};
  const federal = (trib.federal as Record<string, unknown>) ?? {};
  const prestador = (inf.prestador as Record<string, unknown>) ?? {};
  const regime = (prestador.regimeTributario as Record<string, unknown>) ?? {};
  const ibs = (inf.ibsCbs as Record<string, unknown>) ?? {};
  const ibsValores = (ibs.valores as Record<string, unknown>) ?? {};
  const ibsTrib = (ibsValores.trib as Record<string, unknown>) ?? {};
  const gIbs = (ibsTrib.gIBSCBS as Record<string, unknown>) ?? {};

  const aliquota =
    issqn.aliquota !== undefined && issqn.aliquota !== null
      ? String(issqn.aliquota)
      : "";

  return {
    name: tpl.name,
    description: tpl.description,
    tomadorNome: String(tomador.nome ?? ""),
    tomadorDoc: String(tomador.cnpj ?? tomador.cpf ?? ""),
    tomadorLogradouro: String(endereco.xLgr ?? ""),
    tomadorNumero: String(endereco.nro ?? ""),
    tomadorComplemento: String(endereco.xCpl ?? ""),
    tomadorBairro: String(endereco.xBairro ?? ""),
    tomadorMunicipio: String(endereco.cMun ?? ""),
    tomadorCep: String(endereco.cep ?? ""),
    codigoServico: String(codigo.cServTribNac ?? ""),
    codigoServicoMun: String(codigo.cServMun ?? ""),
    codigoNbs: String(codigo.cNBSPrinc ?? ""),
    codigoMunicipio: String(local.cLocPrestacao ?? ""),
    discriminacaoPadrao: String(servico.xDescServ ?? ""),
    aliquota,
    tributacaoIssqn: Number(issqn.tributacaoIssqn ?? 1),
    tipoRetencaoIssqn: Number(issqn.tipoRetencaoIssqn ?? 1),
    cstPisCofins: String(federal.cstPisCofins ?? ""),
    tipoRetencaoPisCofins: Number(federal.tipoRetencaoPisCofins ?? 0),
    percentualTotalTributosSN:
      trib.percentualTotalTributosSN != null
        ? String(trib.percentualTotalTributosSN)
        : "",
    ibsFinNfse: String(ibs.finNFSe ?? "0"),
    ibsIndFinal: String(ibs.indFinal ?? "0"),
    ibsCIndOp: String(ibs.cIndOp ?? ""),
    ibsIndDest: String(ibs.indDest ?? "0"),
    ibsCst: String(gIbs.CST ?? ""),
    ibsClassTrib: String(gIbs.cClassTrib ?? ""),
    opSimpNac: Number(regime.opSimpNac ?? 1),
    regApurSN: regime.regApurSN != null ? String(regime.regApurSN) : "",
    regEspTrib: Number(regime.regEspTrib ?? 0),
    paramFields: normalizeParamSchema(tpl.paramSchema).fields,
  };
}

export function emptyTemplateForm(municipio = ""): TemplateFormData {
  return {
    name: "",
    description: "",
    tomadorNome: "",
    tomadorDoc: "",
    tomadorLogradouro: "",
    tomadorNumero: "",
    tomadorComplemento: "",
    tomadorBairro: "",
    tomadorMunicipio: "",
    tomadorCep: "",
    codigoServico: "",
    codigoServicoMun: "",
    codigoNbs: "",
    codigoMunicipio: municipio,
    discriminacaoPadrao: "",
    aliquota: "",
    tributacaoIssqn: 1,
    tipoRetencaoIssqn: 1,
    cstPisCofins: "00",
    tipoRetencaoPisCofins: 0,
    percentualTotalTributosSN: "",
    ibsFinNfse: "0",
    ibsIndFinal: "0",
    ibsCIndOp: "",
    ibsIndDest: "0",
    ibsCst: "",
    ibsClassTrib: "",
    opSimpNac: 1,
    regApurSN: "",
    regEspTrib: 0,
    paramFields: DEFAULT_PARAM_FIELDS.map((f) => ({ ...f })),
  };
}

/** Form de campos fixos a partir de um fixedPayload (ex.: duplicar / avulsa). */
export function formFromFixedPayload(
  fixedPayload: Record<string, unknown>,
  meta?: { name?: string; description?: string; paramSchema?: unknown },
): TemplateFormData {
  return formFromTemplate({
    name: meta?.name ?? "",
    description: meta?.description ?? "",
    fixedPayload,
    paramSchema: meta?.paramSchema,
  });
}
