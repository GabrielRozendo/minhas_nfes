"use client";

import type { TemplateFormData } from "@/lib/templates/types";

type Props = {
  form: TemplateFormData;
  onChange: (partial: Partial<TemplateFormData>) => void;
  /** Quando false, oculta nome/descrição do template. */
  showMeta?: boolean;
  defaultMunicipio?: string;
};

export function DpsFixedFieldsForm({
  form,
  onChange,
  showMeta = true,
  defaultMunicipio = "",
}: Props) {
  return (
    <>
      {showMeta ? (
        <section className="surface">
          <h3 className="section-title">Identificação</h3>
          <div className="field">
            <label className="label" htmlFor="name">
              Nome *
            </label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Ex.: Mensalidade Cliente X"
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="description">
              Descrição interna
            </label>
            <input
              id="description"
              className="input"
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Opcional — só para você se organizar"
            />
          </div>
        </section>
      ) : null}

      <section className="surface">
        <h3 className="section-title">Tomador</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label className="label" htmlFor="tomadorNome">
              Razão social / nome *
            </label>
            <input
              id="tomadorNome"
              className="input"
              value={form.tomadorNome}
              onChange={(e) => onChange({ tomadorNome: e.target.value })}
              required
            />
          </div>
          <div className="field sm:col-span-2">
            <label className="label" htmlFor="tomadorDoc">
              CPF ou CNPJ *
            </label>
            <input
              id="tomadorDoc"
              className="input font-mono"
              value={form.tomadorDoc}
              onChange={(e) => onChange({ tomadorDoc: e.target.value })}
              placeholder="Somente números"
              required
            />
          </div>
          <div className="field sm:col-span-2">
            <label className="label" htmlFor="tomadorLogradouro">
              Logradouro
            </label>
            <input
              id="tomadorLogradouro"
              className="input"
              value={form.tomadorLogradouro}
              onChange={(e) => onChange({ tomadorLogradouro: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="tomadorNumero">
              Número
            </label>
            <input
              id="tomadorNumero"
              className="input"
              value={form.tomadorNumero}
              onChange={(e) => onChange({ tomadorNumero: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="tomadorComplemento">
              Complemento
            </label>
            <input
              id="tomadorComplemento"
              className="input"
              value={form.tomadorComplemento}
              onChange={(e) =>
                onChange({ tomadorComplemento: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="tomadorBairro">
              Bairro
            </label>
            <input
              id="tomadorBairro"
              className="input"
              value={form.tomadorBairro}
              onChange={(e) => onChange({ tomadorBairro: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="tomadorMunicipio">
              Município IBGE (tomador)
            </label>
            <input
              id="tomadorMunicipio"
              className="input font-mono"
              value={form.tomadorMunicipio}
              onChange={(e) => onChange({ tomadorMunicipio: e.target.value })}
              placeholder="7 dígitos"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="tomadorCep">
              CEP
            </label>
            <input
              id="tomadorCep"
              className="input font-mono"
              value={form.tomadorCep}
              onChange={(e) => onChange({ tomadorCep: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="surface">
        <h3 className="section-title">Serviço</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="codigoServico">
              Código serviço nacional *
            </label>
            <input
              id="codigoServico"
              className="input font-mono"
              value={form.codigoServico}
              onChange={(e) => onChange({ codigoServico: e.target.value })}
              placeholder="Ex.: 010301"
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="codigoServicoMun">
              Código tributação municipal
            </label>
            <input
              id="codigoServicoMun"
              className="input font-mono"
              value={form.codigoServicoMun}
              onChange={(e) => onChange({ codigoServicoMun: e.target.value })}
              placeholder="3 dígitos — ex.: 099"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="codigoNbs">
              Código NBS
            </label>
            <input
              id="codigoNbs"
              className="input font-mono"
              value={form.codigoNbs}
              onChange={(e) => onChange({ codigoNbs: e.target.value })}
              placeholder="9 dígitos — ex.: 115090000"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="codigoMunicipio">
              Município prestação (IBGE)
            </label>
            <input
              id="codigoMunicipio"
              className="input font-mono"
              value={form.codigoMunicipio}
              onChange={(e) => onChange({ codigoMunicipio: e.target.value })}
              placeholder={defaultMunicipio}
            />
          </div>
          <div className="field sm:col-span-2">
            <label className="label" htmlFor="discPadrao">
              Descrição padrão do serviço
            </label>
            <textarea
              id="discPadrao"
              className="textarea min-h-24 font-[family-name:var(--font-display)] text-base"
              value={form.discriminacaoPadrao}
              onChange={(e) =>
                onChange({ discriminacaoPadrao: e.target.value })
              }
              placeholder="Usada se o parâmetro de descrição não for enviado"
            />
          </div>
        </div>
      </section>

      <section className="surface">
        <h3 className="section-title">Tributação</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="tributacaoIssqn">
              Tributação ISSQN
            </label>
            <select
              id="tributacaoIssqn"
              className="select"
              value={form.tributacaoIssqn}
              onChange={(e) =>
                onChange({ tributacaoIssqn: Number(e.target.value) })
              }
            >
              <option value={1}>1 — Operação tributável</option>
              <option value={2}>2 — Imunidade</option>
              <option value={3}>3 — Exportação</option>
              <option value={4}>4 — Não incidência</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="tipoRetencaoIssqn">
              Retenção ISSQN
            </label>
            <select
              id="tipoRetencaoIssqn"
              className="select"
              value={form.tipoRetencaoIssqn}
              onChange={(e) =>
                onChange({ tipoRetencaoIssqn: Number(e.target.value) })
              }
            >
              <option value={1}>1 — Não retido</option>
              <option value={2}>2 — Retido pelo tomador</option>
              <option value={3}>3 — Retido pelo intermediário</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="aliquota">
              Alíquota ISS (decimal, opcional)
            </label>
            <input
              id="aliquota"
              className="input"
              type="text"
              inputMode="decimal"
              value={form.aliquota}
              onChange={(e) => onChange({ aliquota: e.target.value })}
              placeholder="Deixe vazio se não informar"
            />
            <p className="hint">Ex.: 0.02 = 2%. Vazio = não envia pAliq.</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="percentualTotalTributosSN">
              % total tributos SN
            </label>
            <input
              id="percentualTotalTributosSN"
              className="input"
              type="text"
              inputMode="decimal"
              value={form.percentualTotalTributosSN}
              onChange={(e) =>
                onChange({ percentualTotalTributosSN: e.target.value })
              }
              placeholder="Ex.: 6"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="cstPisCofins">
              CST PIS/COFINS
            </label>
            <input
              id="cstPisCofins"
              className="input font-mono"
              value={form.cstPisCofins}
              onChange={(e) => onChange({ cstPisCofins: e.target.value })}
              placeholder="Ex.: 00"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="tipoRetencaoPisCofins">
              Retenção PIS/COFINS
            </label>
            <input
              id="tipoRetencaoPisCofins"
              className="input"
              type="number"
              min={0}
              value={form.tipoRetencaoPisCofins}
              onChange={(e) =>
                onChange({ tipoRetencaoPisCofins: Number(e.target.value) })
              }
            />
          </div>
        </div>
      </section>

      <section className="surface">
        <h3 className="section-title">IBS / CBS</h3>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Preencha os três códigos principais para incluir o bloco. Deixe vazio
          para omitir.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="ibsCIndOp">
              cIndOp
            </label>
            <input
              id="ibsCIndOp"
              className="input font-mono"
              value={form.ibsCIndOp}
              onChange={(e) => onChange({ ibsCIndOp: e.target.value })}
              placeholder="Ex.: 100301"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="ibsCst">
              CST
            </label>
            <input
              id="ibsCst"
              className="input font-mono"
              value={form.ibsCst}
              onChange={(e) => onChange({ ibsCst: e.target.value })}
              placeholder="Ex.: 000"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="ibsClassTrib">
              cClassTrib
            </label>
            <input
              id="ibsClassTrib"
              className="input font-mono"
              value={form.ibsClassTrib}
              onChange={(e) => onChange({ ibsClassTrib: e.target.value })}
              placeholder="Ex.: 000001"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="ibsFinNfse">
              finNFSe
            </label>
            <input
              id="ibsFinNfse"
              className="input font-mono"
              value={form.ibsFinNfse}
              onChange={(e) => onChange({ ibsFinNfse: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="ibsIndFinal">
              indFinal
            </label>
            <input
              id="ibsIndFinal"
              className="input font-mono"
              value={form.ibsIndFinal}
              onChange={(e) => onChange({ ibsIndFinal: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="ibsIndDest">
              indDest
            </label>
            <input
              id="ibsIndDest"
              className="input font-mono"
              value={form.ibsIndDest}
              onChange={(e) => onChange({ ibsIndDest: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="surface">
        <h3 className="section-title">Regime do prestador</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="field">
            <label className="label" htmlFor="opSimpNac">
              opSimpNac
            </label>
            <input
              id="opSimpNac"
              className="input"
              type="number"
              min={1}
              value={form.opSimpNac}
              onChange={(e) => onChange({ opSimpNac: Number(e.target.value) })}
            />
            <p className="hint">1 não optante · 2 optante · 3 MEI (EmissorWeb)</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="regApurSN">
              regApurSN
            </label>
            <input
              id="regApurSN"
              className="input"
              value={form.regApurSN}
              onChange={(e) => onChange({ regApurSN: e.target.value })}
              placeholder="Opcional — 1 competência"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="regEspTrib">
              regEspTrib
            </label>
            <input
              id="regEspTrib"
              className="input"
              type="number"
              min={0}
              value={form.regEspTrib}
              onChange={(e) => onChange({ regEspTrib: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>
    </>
  );
}
