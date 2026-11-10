"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Template = {
  id: string;
  name: string;
  description: string;
  paramSchema: Record<string, unknown>;
};

const SAMPLE_FIXED = {
  infDps: {
    prestador: {
      cnpj: "00000000000000",
      inscricaoMunicipal: "12345",
      nome: "MINHA EMPRESA LTDA",
      regimeTributario: { opSimpNac: 2, regEspTrib: 0 },
    },
    tomador: {
      cnpj: "11111111000191",
      nome: "CLIENTE EXEMPLO LTDA",
    },
    servico: {
      localPrestacao: { cLocPrestacao: "3550308" },
      codigoServico: { cServTribNac: "010701188" },
      xDescServ: "Prestação de serviços de consultoria",
    },
    valores: { vServico: 1000 },
    tributacao: {
      issqn: { tributacaoIssqn: 1, tipoRetencaoIssqn: 1, aliquota: 0.02 },
    },
  },
};

export function EmitirClient({
  templates,
  draft,
}: {
  templates: Template[];
  draft?: {
    fromChave?: string;
    suggestedParams?: Record<string, unknown>;
    templateId?: string | null;
    payloadEnviado?: Record<string, unknown> | null;
  } | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"template" | "livre">(
    draft?.templateId || templates[0] ? "template" : "livre",
  );
  const [templateId, setTemplateId] = useState(
    draft?.templateId || templates[0]?.id || "",
  );
  const [paramsJson, setParamsJson] = useState(
    JSON.stringify(
      draft?.suggestedParams ?? {
        competencia: new Date().toISOString().slice(0, 7) + "-01",
        valor: 1000,
        discriminacao: "Serviços do período",
      },
      null,
      2,
    ),
  );
  const [fixedJson, setFixedJson] = useState(
    JSON.stringify(draft?.payloadEnviado ?? SAMPLE_FIXED, null, 2),
  );
  const [idempotencyKey, setIdempotencyKey] = useState(
    `ui-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");
    try {
      const params = JSON.parse(paramsJson);
      const body =
        mode === "template"
          ? { templateId, params, dryRun }
          : { fixedPayload: JSON.parse(fixedJson), params, dryRun };

      const res = await fetch("/api/v1/notas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na emissão");
      setResult(JSON.stringify(data, null, 2));
      if (!dryRun) {
        setIdempotencyKey(
          `ui-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`,
        );
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-3xl font-semibold">Emitir NFS-e</h2>
      <p className="mt-1 text-[var(--muted)]">
        Sempre valide com dry-run antes de enviar à SEFIN. Idempotency-Key evita
        duplicar nota.
      </p>
      {draft?.fromChave ? (
        <div className="alert">
          Rascunho a partir da nota <code>{draft.fromChave}</code>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn ${mode === "template" ? "" : "btn-secondary"}`}
            onClick={() => setMode("template")}
          >
            Por template
          </button>
          <button
            type="button"
            className={`btn ${mode === "livre" ? "" : "btn-secondary"}`}
            onClick={() => setMode("livre")}
          >
            Payload livre
          </button>
        </div>

        {mode === "template" ? (
          <div className="field mt-4">
            <label className="label" htmlFor="template">
              Template
            </label>
            <select
              id="template"
              className="select"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              required
            >
              {templates.length === 0 ? (
                <option value="">Nenhum template cadastrado</option>
              ) : (
                templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
            {selected?.description ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                {selected.description}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="field mt-4">
            <label className="label" htmlFor="fixed">
              fixedPayload (JSON)
            </label>
            <textarea
              id="fixed"
              className="textarea"
              value={fixedJson}
              onChange={(e) => setFixedJson(e.target.value)}
              required
            />
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="params">
            params (JSON)
          </label>
          <textarea
            id="params"
            className="textarea"
            value={paramsJson}
            onChange={(e) => setParamsJson(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="idem">
            Idempotency-Key
          </label>
          <input
            id="idem"
            className="input"
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            required
          />
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          Dry-run (valida localmente, não chama SEFIN)
        </label>

        <div className="flex flex-wrap gap-2">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Processando…" : dryRun ? "Validar" : "Emitir"}
          </button>
        </div>
      </form>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {result ? (
        <pre className="panel overflow-x-auto whitespace-pre-wrap font-mono text-xs">
          {result}
        </pre>
      ) : null}
    </div>
  );
}
