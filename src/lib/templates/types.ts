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
  codigoServico: string;
  codigoMunicipio: string;
  discriminacaoPadrao: string;
  aliquota: number;
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

  const municipio = (
    form.codigoMunicipio ||
    envDefaults?.municipio ||
    "0000000"
  ).padStart(7, "0");

  const prestador: Record<string, unknown> = {
    regimeTributario: { opSimpNac: 2, regEspTrib: 0 },
  };
  if (envDefaults?.cnpj) {
    const p = envDefaults.cnpj.replace(/\D/g, "");
    if (p.length === 11) prestador.cpf = p;
    else prestador.cnpj = p;
  }
  if (envDefaults?.im) prestador.inscricaoMunicipal = envDefaults.im;

  return {
    infDps: {
      prestador,
      tomador,
      servico: {
        localPrestacao: { cLocPrestacao: municipio },
        codigoServico: { cServTribNac: form.codigoServico.trim() },
        xDescServ: form.discriminacaoPadrao.trim() || "Prestação de serviços",
      },
      valores: { vServico: 0 },
      tributacao: {
        issqn: {
          tributacaoIssqn: 1,
          tipoRetencaoIssqn: 1,
          aliquota: Number(form.aliquota) || 0.02,
        },
      },
    },
  };
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
  const servico = (inf.servico as Record<string, unknown>) ?? {};
  const codigo = (servico.codigoServico as Record<string, unknown>) ?? {};
  const local = (servico.localPrestacao as Record<string, unknown>) ?? {};
  const trib = (inf.tributacao as Record<string, unknown>) ?? {};
  const issqn = (trib.issqn as Record<string, unknown>) ?? {};

  return {
    name: tpl.name,
    description: tpl.description,
    tomadorNome: String(tomador.nome ?? ""),
    tomadorDoc: String(tomador.cnpj ?? tomador.cpf ?? ""),
    codigoServico: String(codigo.cServTribNac ?? ""),
    codigoMunicipio: String(local.cLocPrestacao ?? ""),
    discriminacaoPadrao: String(servico.xDescServ ?? ""),
    aliquota: Number(issqn.aliquota ?? 0.02),
    paramFields: normalizeParamSchema(tpl.paramSchema).fields,
  };
}

export function emptyTemplateForm(municipio = ""): TemplateFormData {
  return {
    name: "",
    description: "",
    tomadorNome: "",
    tomadorDoc: "",
    codigoServico: "",
    codigoMunicipio: municipio,
    discriminacaoPadrao: "",
    aliquota: 0.02,
    paramFields: DEFAULT_PARAM_FIELDS.map((f) => ({ ...f })),
  };
}
