"use client";

import Link from "next/link";
import { useState } from "react";

const FIELD_LABELS: Record<string, string> = {
  infDps: "DPS",
  versao: "Versão",
  tomador: "Tomador",
  prestador: "Prestador",
  intermediario: "Intermediário",
  nome: "Nome",
  cnpj: "CNPJ",
  cpf: "CPF",
  nif: "NIF",
  endereco: "Endereço",
  xLgr: "Logradouro",
  nro: "Número",
  xCpl: "Complemento",
  xBairro: "Bairro",
  cMun: "Município",
  cep: "CEP",
  email: "E-mail",
  telefone: "Telefone",
  inscricaoMunicipal: "Inscrição municipal",
  servico: "Serviço",
  localPrestacao: "Local da prestação",
  cLocPrestacao: "Município da prestação",
  codigoServico: "Código do serviço",
  cServTribNac: "Código nacional",
  cServMun: "Código municipal",
  cNBSPrinc: "NBS",
  xDescServ: "Descrição",
  valores: "Valores",
  vServico: "Valor do serviço",
  vBC: "Base de cálculo",
  vISSQN: "ISSQN",
  vLiq: "Valor líquido",
  pAliq: "Alíquota",
  tributacao: "Tributação",
  issqn: "ISSQN",
  tributacaoIssqn: "Tributação do ISSQN",
  tipoRetencaoIssqn: "Retenção do ISSQN",
  aliquota: "Alíquota",
  federal: "Tributos federais",
  cstPisCofins: "CST PIS/COFINS",
  tipoRetencaoPisCofins: "Retenção PIS/COFINS",
  percentualTotalTributosSN: "Tributos do Simples",
  ibsCbs: "IBS/CBS",
  cIndOp: "Indicador da operação",
  CST: "CST",
  cClassTrib: "Classificação tributária",
  finNFSe: "Finalidade",
  indFinal: "Consumidor final",
  indDest: "Destinatário",
  gIBSCBS: "Classificação IBS/CBS",
  trib: "Tributos",
  dataCompetencia: "Competência",
  dataEmissao: "Emissão",
  numeroDps: "Número do DPS",
  serie: "Série",
  tipoAmbiente: "Ambiente",
  codigoLocalEmissao: "Município de emissão",
  regimeTributario: "Regime tributário",
  opSimpNac: "Simples Nacional",
  regApurSN: "Regime de apuração",
  regEspTrib: "Regime especial",
  id: "Identificador",
};

const ISSQN: Record<string, string> = {
  "1": "Operação tributável",
  "2": "Imunidade",
  "3": "Exportação de serviço",
  "4": "Não incidência",
};

const RETENCAO_ISSQN: Record<string, string> = {
  "1": "Não retido",
  "2": "Retido pelo tomador",
  "3": "Retido pelo intermediário",
};

const SIMPLES: Record<string, string> = {
  "1": "Não optante",
  "2": "Optante do Simples",
  "3": "MEI",
};

function rec(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  return raw ? raw : null;
}

function amount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatDoc(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return value;
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
}

function formatRate(value: number) {
  const percent = value > 0 && value <= 1 ? value * 100 : value;
  return `${percent.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
}

function coded(map: Record<string, string>, value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const label = map[raw];
  return label ? `${label}` : raw;
}

function fieldLabel(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function explainError(raw: string) {
  const match = /^\[([^\]]+)\]\s*([\s\S]*)$/.exec(raw.trim());
  if (!match) return { where: "Validação", message: raw };
  const where = match[1]
    .split(".")
    .filter((part) => part !== "infDps" && !/^\d+$/.test(part))
    .map(fieldLabel)
    .join(" · ");
  return {
    where: where || "Validação",
    message: match[2].trim() || raw,
  };
}

function addressLine(endereco: Record<string, unknown> | null) {
  if (!endereco) return null;
  const parts = [
    [text(endereco.xLgr), text(endereco.nro)].filter(Boolean).join(", "),
    text(endereco.xCpl),
    text(endereco.xBairro),
  ].filter(Boolean);
  const cep = text(endereco.cep);
  const mun = text(endereco.cMun);
  if (cep) parts.push(`CEP ${formatCep(cep)}`);
  if (mun) parts.push(`IBGE ${mun}`);
  return parts.length ? parts.join(" · ") : null;
}

function Fact({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={wide ? "fact fact-wide" : "fact"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function RawJson({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pretty = JSON.stringify(data, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pretty);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="raw-json">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="raw-toggle"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          JSON da resposta
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void copy()}>
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      {open ? <pre>{pretty}</pre> : null}
    </div>
  );
}

function DpsSlip({ dps }: { dps: Record<string, unknown> }) {
  const inf = rec(dps.infDps) ?? dps;
  const tomador = rec(inf.tomador);
  const prestador = rec(inf.prestador);
  const regime = rec(prestador?.regimeTributario);
  const servico = rec(inf.servico);
  const local = rec(servico?.localPrestacao);
  const codigo = rec(servico?.codigoServico);
  const valores = rec(inf.valores);
  const tributacao = rec(inf.tributacao);
  const issqn = rec(tributacao?.issqn);
  const federal = rec(tributacao?.federal);
  const ibs = rec(inf.ibsCbs);
  const ibsValores = rec(ibs?.valores);
  const ibsTrib = rec(ibsValores?.trib);
  const gIbs = rec(ibsTrib?.gIBSCBS);

  const doc = text(tomador?.cnpj) ?? text(tomador?.cpf);
  const prestadorDoc = text(prestador?.cnpj) ?? text(prestador?.cpf);
  const valor = amount(valores?.vServico);
  const aliquota = amount(issqn?.aliquota);
  const percSn = amount(tributacao?.percentualTotalTributosSN);
  const competencia = text(inf.dataCompetencia);
  const ambiente = text(inf.tipoAmbiente);

  return (
    <article className="slip">
      <header className="slip-hero">
        <div>
          <p className="slip-kicker">Valor do serviço</p>
          <p className="slip-amount">{valor != null ? money(valor) : "—"}</p>
        </div>
        <div className="text-right">
          <p className="slip-kicker">Competência</p>
          <p className="mt-1 text-lg font-semibold">
            {competencia ? formatDate(competencia) : "—"}
          </p>
        </div>
      </header>

      <section className="slip-block">
        <h4>Quem</h4>
        <dl className="facts">
          <Fact label="Tomador" value={text(tomador?.nome)} />
          <Fact
            label={doc && doc.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ"}
            value={doc ? formatDoc(doc) : null}
          />
          <Fact
            label="Endereço do tomador"
            value={addressLine(rec(tomador?.endereco))}
            wide
          />
          <Fact
            label="Prestador"
            value={prestadorDoc ? formatDoc(prestadorDoc) : null}
          />
          <Fact
            label="Inscrição municipal"
            value={text(prestador?.inscricaoMunicipal)}
          />
          <Fact
            label="Simples Nacional"
            value={coded(SIMPLES, regime?.opSimpNac)}
          />
        </dl>
      </section>

      <section className="slip-block">
        <h4>Serviço</h4>
        <dl className="facts">
          <Fact label="Descrição" value={text(servico?.xDescServ)} wide />
          <Fact label="Código nacional" value={text(codigo?.cServTribNac)} />
          <Fact label="Código municipal" value={text(codigo?.cServMun)} />
          <Fact label="NBS" value={text(codigo?.cNBSPrinc)} />
          <Fact
            label="Município da prestação"
            value={text(local?.cLocPrestacao)}
          />
        </dl>
      </section>

      <section className="slip-block">
        <h4>Tributos</h4>
        <dl className="facts">
          <Fact
            label="ISSQN"
            value={coded(ISSQN, issqn?.tributacaoIssqn)}
          />
          <Fact
            label="Retenção do ISS"
            value={coded(RETENCAO_ISSQN, issqn?.tipoRetencaoIssqn)}
          />
          <Fact
            label="Alíquota"
            value={aliquota != null ? formatRate(aliquota) : null}
          />
          <Fact
            label="Tributos do Simples"
            value={percSn != null ? formatRate(percSn) : null}
          />
          <Fact label="CST PIS/COFINS" value={text(federal?.cstPisCofins)} />
          <Fact
            label="IBS/CBS"
            value={
              ibs
                ? [
                    text(ibs.cIndOp) ? `operação ${text(ibs.cIndOp)}` : null,
                    text(gIbs?.CST) ? `CST ${text(gIbs?.CST)}` : null,
                    text(gIbs?.cClassTrib)
                      ? `classificação ${text(gIbs?.cClassTrib)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Informado"
                : "Não enviado"
            }
            wide
          />
        </dl>
      </section>

      <section className="slip-block">
        <h4>Documento que seria emitido</h4>
        <dl className="facts">
          <Fact label="Série" value={text(inf.serie)} />
          <Fact label="Número do DPS" value={text(inf.numeroDps)} />
          <Fact
            label="Ambiente"
            value={
              ambiente === "1"
                ? "Produção"
                : ambiente === "2"
                  ? "Homologação"
                  : ambiente
            }
          />
          <Fact
            label="Município de emissão"
            value={text(inf.codigoLocalEmissao)}
          />
          <Fact label="Identificador" value={text(inf.id)} wide />
        </dl>
      </section>
    </article>
  );
}

function DryRunView({ data }: { data: Record<string, unknown> }) {
  const valid = data.valid === true;
  const errors = Array.isArray(data.errors)
    ? data.errors.map((item) => String(item)).filter(Boolean)
    : [];
  const dps = rec(data.dps);

  return (
    <div className="space-y-4">
      <section className={valid ? "verdict verdict-ok" : "verdict verdict-bad"}>
        <div>
          <p className="eyebrow">{valid ? "Pronta para emitir" : "Ainda não emite"}</p>
          <h3>{valid ? "A nota passou na validação" : "A validação encontrou problemas"}</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            {valid
              ? "A conferência foi só local: estrutura e regras da NFS-e Nacional. Nenhum número foi consumido e a SEFIN não foi chamada. Para emitir, desmarque a validação e envie de novo."
              : "Nada foi enviado à SEFIN. Corrija os pontos abaixo. O rascunho mostra o documento que o sistema montou com os campos atuais."}
          </p>
        </div>
        <span className={valid ? "stamp stamp-ok" : "stamp stamp-bad"}>
          {valid
            ? "Válida"
            : errors.length === 1
              ? "1 pendência"
              : errors.length > 1
                ? `${errors.length} pendências`
                : "Inválida"}
        </span>
      </section>

      {errors.length > 0 ? (
        <section className="surface">
          <h3 className="section-title">O que precisa mudar</h3>
          <div className="issue-list">
            {errors.map((error, index) => {
              const explained = explainError(error);
              return (
                <article key={`${index}-${error}`} className="issue">
                  <p className="issue-where">{explained.where}</p>
                  <p>{explained.message}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {dps ? <DpsSlip dps={dps} /> : null}
      <RawJson data={data} />
    </div>
  );
}

function IssuedView({ data }: { data: Record<string, unknown> }) {
  const nota = rec(data.nota);
  const emissao = rec(data.emissao);
  const chave = text(nota?.chaveAcesso) ?? text(emissao?.chaveAcesso);
  const valor = amount(nota?.valor);
  const competencia = text(nota?.competencia);
  const reused = data.reusedExistingDps === true;
  const idempotent = data.idempotent === true;

  return (
    <div className="space-y-4">
      <section className="verdict verdict-ok">
        <div>
          <p className="eyebrow">SEFIN</p>
          <h3>{reused ? "Essa DPS já existia" : "Nota autorizada"}</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            {idempotent
              ? "Esta Idempotency-Key já tinha sido usada. A resposta é a emissão anterior, sem uma segunda nota."
              : reused
                ? "A SEFIN já tinha uma NFS-e para este DPS. O registro local foi reaproveitado."
                : "A nota foi enviada e autorizada. O resumo abaixo é o que ficou gravado."}
          </p>
        </div>
        <span className="stamp stamp-ok">{text(nota?.status) ?? "Autorizada"}</span>
      </section>

      <article className="slip">
        <header className="slip-hero">
          <div>
            <p className="slip-kicker">Valor</p>
            <p className="slip-amount">{valor != null ? money(valor) : "—"}</p>
          </div>
          <div className="text-right">
            <p className="slip-kicker">Competência</p>
            <p className="mt-1 text-lg font-semibold">
              {competencia ? formatDate(competencia) : "—"}
            </p>
          </div>
        </header>
        <section className="slip-block">
          <h4>Nota</h4>
          <dl className="facts">
            <Fact label="Tomador" value={text(nota?.tomadorNome)} />
            <Fact
              label="Documento"
              value={text(nota?.tomadorDoc) ? formatDoc(text(nota?.tomadorDoc)!) : null}
            />
            <Fact label="Série" value={text(nota?.serie)} />
            <Fact label="Número do DPS" value={text(nota?.numeroDps)} />
            <Fact label="Ambiente" value={text(nota?.ambiente)} />
            <Fact label="Chave de acesso" value={chave} wide />
            <Fact label="Discriminação" value={text(nota?.discriminacao)} wide />
          </dl>
          {chave ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="btn" href={`/notas/${chave}`}>
                Abrir nota
              </Link>
              {nota?.hasPdf ? (
                <a className="btn btn-secondary" href={`/api/v1/notas/${chave}/pdf`}>
                  Baixar PDF
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </article>

      <RawJson data={data} />
    </div>
  );
}

export function EmissaoResult({ data }: { data: unknown }) {
  const record = rec(data);
  if (!record) {
    return (
      <div className="space-y-4">
        <section className="verdict">
          <div>
            <p className="eyebrow">Resposta</p>
            <h3>Não foi possível ler o retorno</h3>
          </div>
        </section>
        <RawJson data={data} />
      </div>
    );
  }

  if (record.dryRun === true) return <DryRunView data={record} />;
  if (record.nota) return <IssuedView data={record} />;

  return (
    <div className="space-y-4">
      <section className="verdict">
        <div>
          <p className="eyebrow">Resposta</p>
          <h3>Retorno recebido</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            O formato não é uma validação nem uma nota autorizada. O JSON completo está abaixo.
          </p>
        </div>
      </section>
      <RawJson data={data} />
    </div>
  );
}
