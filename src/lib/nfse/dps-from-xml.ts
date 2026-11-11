import { XMLParser } from "fast-xml-parser";
import type { DpsData } from "nfse-nacional";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

function rec(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : undefined;
}

function str(v: unknown): string | undefined {
  return v != null && v !== "" ? String(v) : undefined;
}

function numOpt(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

/** Extrai o primeiro `<DPS …>…</DPS>` do XML (NFS-e completa ou DPS avulso). */
export function extractDpsXml(xml: string): string | undefined {
  const m = xml.match(/<DPS[\s>][\s\S]*?<\/DPS>/);
  return m?.[0];
}

function parseEndereco(end: Record<string, unknown> | undefined) {
  if (!end) return undefined;
  const endNac = rec(end["endNac"]);
  return {
    cMun: String(endNac?.["cMun"] ?? end["cMun"] ?? ""),
    cep: str(endNac?.["CEP"] ?? end["CEP"]),
    xLgr: str(end["xLgr"]),
    nro: str(end["nro"]),
    xCpl: str(end["xCpl"]),
    xBairro: str(end["xBairro"]),
  };
}

function parsePrestador(
  prest: Record<string, unknown> | undefined,
): DpsData["infDps"]["prestador"] {
  if (!prest) throw new Error("DPS sem <prest>.");
  const regTrib = rec(prest["regTrib"]);
  return {
    cnpj: str(prest["CNPJ"]),
    cpf: str(prest["CPF"]),
    nif: str(prest["NIF"]),
    codigoNaoNif: str(prest["cNaoNIF"]),
    caepf: str(prest["CAEPF"]),
    inscricaoMunicipal: str(prest["IM"]),
    nome: str(prest["xNome"]),
    endereco: parseEndereco(rec(prest["end"])),
    telefone: str(prest["fone"]),
    email: str(prest["email"]),
    regimeTributario: regTrib
      ? {
          opSimpNac: Number(regTrib["opSimpNac"] ?? 1),
          regApurSN: numOpt(regTrib["regApTribSN"]),
          regEspTrib: Number(regTrib["regEspTrib"] ?? 0),
        }
      : undefined,
  } as DpsData["infDps"]["prestador"];
}

function parseTomador(
  toma: Record<string, unknown>,
): NonNullable<DpsData["infDps"]["tomador"]> {
  return {
    cnpj: str(toma["CNPJ"]),
    cpf: str(toma["CPF"]),
    nif: str(toma["NIF"]),
    codigoNaoNif: str(toma["cNaoNIF"]) as
      | NonNullable<DpsData["infDps"]["tomador"]>["codigoNaoNif"]
      | undefined,
    inscricaoMunicipal: str(toma["IM"]),
    nome: String(toma["xNome"] ?? ""),
    endereco: parseEndereco(rec(toma["end"])),
    telefone: str(toma["fone"]),
    email: str(toma["email"]),
  };
}

function parseIntermediario(
  interm: Record<string, unknown>,
): NonNullable<DpsData["infDps"]["intermediario"]> {
  return {
    cnpj: str(interm["CNPJ"]),
    cpf: str(interm["CPF"]),
    inscricaoMunicipal: str(interm["IM"]),
    nome: String(interm["xNome"] ?? ""),
  };
}

function parseServico(
  serv: Record<string, unknown> | undefined,
): DpsData["infDps"]["servico"] {
  if (!serv) throw new Error("DPS sem <serv>.");
  const locPrest = rec(serv["locPrest"]) ?? {};
  const cServ = rec(serv["cServ"]) ?? {};
  const obra = rec(serv["obra"]);
  const infoCompl = rec(serv["infoCompl"]);
  return {
    localPrestacao: {
      cLocPrestacao: String(locPrest["cLocPrestacao"] ?? ""),
      cPaisPrestacao: str(locPrest["cPaisPrestacao"]),
    },
    codigoServico: {
      cServTribNac: String(cServ["cTribNac"] ?? ""),
      cServMun: str(cServ["cTribMun"]),
      cNBSPrinc: str(cServ["cNBS"]),
      cIntContrib: str(cServ["cIntContrib"]),
    },
    xDescServ: String(cServ["xDescServ"] ?? ""),
    obra: obra
      ? {
          inscImobFisc: str(obra["inscImobFisc"]),
          cObra: str(obra["cObra"]),
        }
      : undefined,
    informacaoComplemento: infoCompl
      ? {
          idDocTec: str(infoCompl["idDocTec"]),
          docRef: str(infoCompl["docRef"]),
          xPed: str(infoCompl["xPed"]),
          xInfComp: str(infoCompl["xInfComp"]),
        }
      : undefined,
  };
}

function parseValores(
  valRaw: Record<string, unknown> | undefined,
): DpsData["infDps"]["valores"] {
  const vServPrest = rec(valRaw?.["vServPrest"]) ?? {};
  const descCondInc = rec(valRaw?.["vDescCondIncond"]);
  return {
    vServico: Number(vServPrest["vServ"] ?? 0),
    vReceb: numOpt(vServPrest["vReceb"]),
    vDescIncondicionado: numOpt(descCondInc?.["vDescIncond"]),
    vDescCondicionado: numOpt(descCondInc?.["vDescCond"]),
  };
}

function parseTributacao(
  valRaw: Record<string, unknown> | undefined,
): DpsData["infDps"]["tributacao"] {
  const trib = rec(valRaw?.["trib"]);
  if (!trib) return undefined;
  const tribMun = rec(trib["tribMun"]);
  const tribFed = rec(trib["tribFed"]);
  const piscof = tribFed ? rec(tribFed["piscofins"]) : undefined;
  const exig = tribMun ? rec(tribMun["exigSusp"]) : undefined;
  const totTrib = rec(trib["totTrib"]);
  const pTot = totTrib ? rec(totTrib["pTotTrib"]) : undefined;
  const vTot = totTrib ? rec(totTrib["vTotTrib"]) : undefined;

  const result: NonNullable<DpsData["infDps"]["tributacao"]> = {};

  if (tribMun) {
    result.issqn = {
      tributacaoIssqn: numOpt(tribMun["tribISSQN"]),
      tipoImunidade: numOpt(tribMun["tpImunidade"]),
      tipoSuspensao: numOpt(exig?.["tpSusp"]),
      numeroProcessoSuspensao: str(exig?.["nProcesso"]),
      tipoRetencaoIssqn: numOpt(tribMun["tpRetISSQN"]),
      aliquota:
        tribMun["pAliq"] != null ? Number(tribMun["pAliq"]) / 100 : undefined,
    };
  }

  if (tribFed) {
    result.federal = {
      cstPisCofins: str(piscof?.["CST"]),
      baseCalculoPisCofins: numOpt(piscof?.["vBCPisCofins"]),
      aliquotaPis:
        piscof?.["pAliqPis"] != null
          ? Number(piscof["pAliqPis"]) / 100
          : undefined,
      aliquotaCofins:
        piscof?.["pAliqCofins"] != null
          ? Number(piscof["pAliqCofins"]) / 100
          : undefined,
      valorPis: numOpt(piscof?.["vPis"]),
      valorCofins: numOpt(piscof?.["vCofins"]),
      tipoRetencaoPisCofins: numOpt(piscof?.["tpRetPisCofins"]),
      valorRetidoIrrf: numOpt(tribFed["vRetIRRF"]),
      valorRetidoCsll: numOpt(tribFed["vRetCSLL"]),
    };
  }

  if (pTot) {
    result.percentualTotalTributosFederais = Number(pTot["pTotTribFed"] ?? 0);
    result.percentualTotalTributosEstaduais = Number(pTot["pTotTribEst"] ?? 0);
    result.percentualTotalTributosMunicipais = Number(pTot["pTotTribMun"] ?? 0);
  } else if (vTot) {
    result.valorTotalTributosFederais = numOpt(vTot["vTotTribFed"]);
    result.valorTotalTributosEstaduais = numOpt(vTot["vTotTribEst"]);
    result.valorTotalTributosMunicipais = numOpt(vTot["vTotTribMun"]);
  } else if (totTrib?.["pTotTribSN"] != null) {
    result.percentualTotalTributosSN = Number(totTrib["pTotTribSN"]);
  } else if (totTrib?.["indTotTrib"] != null) {
    result.indicadorTotalTributos = Number(totTrib["indTotTrib"]);
  }

  return result;
}

function parseIbsCbs(
  ibs: Record<string, unknown> | undefined,
): DpsData["infDps"]["ibsCbs"] {
  if (!ibs) return undefined;
  const valores = rec(ibs["valores"]);
  const tribInner = valores ? rec(valores["trib"]) : undefined;
  const gi = tribInner ? rec(tribInner["gIBSCBS"]) : undefined;
  if (!gi) return undefined;
  return {
    finNFSe: String(ibs["finNFSe"] ?? "0"),
    indFinal: str(ibs["indFinal"]),
    cIndOp: String(ibs["cIndOp"] ?? ""),
    tpOper: str(ibs["tpOper"]),
    indDest: String(ibs["indDest"] ?? "0"),
    valores: {
      trib: {
        gIBSCBS: {
          CST: String(gi["CST"] ?? ""),
          cClassTrib: String(gi["cClassTrib"] ?? ""),
          cCredPres: str(gi["cCredPres"]),
        },
      },
    },
  } as DpsData["infDps"]["ibsCbs"];
}

/** Converte XML de DPS (ou NFS-e contendo DPS) em `DpsData`. */
export function parseDpsXmlToDpsData(xml: string): DpsData {
  const dpsXml = extractDpsXml(xml) ?? xml;
  const parsed = xmlParser.parse(dpsXml);
  const dpsRoot = rec(parsed["DPS"]);
  const infDps = rec(dpsRoot?.["infDPS"]);
  if (!infDps) throw new Error("XML não contém <DPS><infDPS>.");

  const prest = rec(infDps["prest"]);
  const toma = rec(infDps["toma"]);
  const interm = rec(infDps["interm"]);
  const serv = rec(infDps["serv"]);
  const valRaw = rec(infDps["valores"]);

  return {
    versao: str(dpsRoot?.["@_versao"]),
    infDps: {
      id: String(infDps["@_Id"] ?? ""),
      tipoAmbiente: Number(infDps["tpAmb"]),
      dataEmissao: String(infDps["dhEmi"] ?? ""),
      versaoAplicativo: str(infDps["verAplic"]),
      serie: str(infDps["serie"]),
      numeroDps: String(infDps["nDPS"] ?? ""),
      dataCompetencia: String(infDps["dCompet"] ?? ""),
      tipoEmitente: Number(infDps["tpEmit"]),
      codigoLocalEmissao: String(infDps["cLocEmi"] ?? ""),
      motivoEmissao: numOpt(infDps["cMotivoEmisTI"]),
      chaveNfseRejeitada: str(infDps["chNFSeRej"]),
      prestador: parsePrestador(prest),
      tomador: toma ? parseTomador(toma) : undefined,
      intermediario: interm ? parseIntermediario(interm) : undefined,
      servico: parseServico(serv),
      valores: parseValores(valRaw),
      tributacao: parseTributacao(valRaw),
      ibsCbs: parseIbsCbs(rec(infDps["IBSCBS"])),
    },
  };
}

const EMIT_ONLY_KEYS = new Set([
  "id",
  "numeroDps",
  "dataEmissao",
  "serie",
  "tipoAmbiente",
  "versaoAplicativo",
]);

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

/**
 * Converte um `DpsData` (ou payload enviado) em `fixedPayload` de template:
 * remove identidade de emissão e zera `vServico` (vira parâmetro).
 */
export function toFixedPayload(
  source: DpsData | Record<string, unknown>,
): Record<string, unknown> {
  const raw = source as Record<string, unknown>;
  const inf =
    (raw.infDps as Record<string, unknown> | undefined) ??
    (raw as Record<string, unknown>);

  const fixedInf: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(inf)) {
    if (EMIT_ONLY_KEYS.has(key)) continue;
    fixedInf[key] = value;
  }

  const valores = {
    ...((fixedInf.valores as Record<string, unknown>) ?? {}),
  };
  delete valores.vServico;
  const valoresLimpos = stripUndefined(valores) as Record<string, unknown>;
  if (Object.keys(valoresLimpos).length > 0) fixedInf.valores = valoresLimpos;
  else delete fixedInf.valores;

  const out: Record<string, unknown> = {
    infDps: stripUndefined(fixedInf),
  };
  if (raw.versao) out.versao = raw.versao;
  return out;
}

/** Preferência: payloadEnviado JSON → senão XML da NFS-e. */
export function fixedPayloadFromNotaSources(options: {
  payloadEnviado?: Record<string, unknown> | string | null;
  xmlNfse?: string | null;
}): Record<string, unknown> {
  if (options.payloadEnviado) {
    const parsed =
      typeof options.payloadEnviado === "string"
        ? (JSON.parse(options.payloadEnviado) as Record<string, unknown>)
        : options.payloadEnviado;
    return toFixedPayload(parsed);
  }
  if (options.xmlNfse?.trim()) {
    return toFixedPayload(parseDpsXmlToDpsData(options.xmlNfse));
  }
  throw new Error(
    "Nota sem payload_enviado nem xml_nfse — não é possível montar o template",
  );
}
