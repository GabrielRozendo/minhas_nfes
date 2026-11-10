"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ParamFieldsInputs } from "@/components/ParamFieldsForm";
import {
  normalizeParamSchema,
  type TemplateParamField,
} from "@/lib/templates/types";

type Template = {
  id: string;
  name: string;
  description: string;
  paramSchema: unknown;
};

function initialValues(
  fields: TemplateParamField[],
  suggested?: Record<string, unknown> | null,
) {
  const values: Record<string, string | number> = {};
  for (const field of fields) {
    if (suggested && suggested[field.key] !== undefined) {
      values[field.key] = suggested[field.key] as string | number;
      continue;
    }
    if (field.key === "competencia" && field.type === "date") {
      values[field.key] = new Date().toISOString().slice(0, 10);
      continue;
    }
    if (field.defaultValue !== undefined) {
      values[field.key] = field.defaultValue;
      continue;
    }
    values[field.key] = field.type === "money" ? 0 : "";
  }
  return values;
}

export function EmitirClient({
  templates,
  draft,
  initialTemplateId,
}: {
  templates: Template[];
  draft?: {
    fromChave?: string;
    suggestedParams?: Record<string, unknown>;
    templateId?: string | null;
    payloadEnviado?: Record<string, unknown> | null;
  } | null;
  initialTemplateId?: string;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(
    initialTemplateId ||
      draft?.templateId ||
      templates[0]?.id ||
      "",
  );
  const selected = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  const fields = useMemo(
    () => normalizeParamSchema(selected?.paramSchema).fields,
    [selected],
  );
  const [values, setValues] = useState<Record<string, string | number>>(() =>
    initialValues(
      normalizeParamSchema(
        templates.find(
          (t) =>
            t.id ===
            (initialTemplateId || draft?.templateId || templates[0]?.id),
        )?.paramSchema,
      ).fields,
      draft?.suggestedParams,
    ),
  );
  const [idempotencyKey, setIdempotencyKey] = useState(
    `ui-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setValues(initialValues(fields, draft?.suggestedParams));
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!templateId) {
      setError("Selecione um template");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    try {
      const params: Record<string, unknown> = { ...values };
      const res = await fetch("/api/v1/notas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          templateId,
          params,
          dryRun,
        }),
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
    <div className="reveal">
      <header className="max-w-2xl">
        <p className="eyebrow">Emissão</p>
        <h2 className="display-title">Emitir NFS-e</h2>
        <p className="lead">
          Escolha o template do cliente e preencha só o que muda — valor, data e
          descrição, em geral.
        </p>
      </header>

      {draft?.fromChave ? (
        <div className="alert mt-6">
          Rascunho a partir da nota <code>{draft.fromChave}</code>
        </div>
      ) : null}

      {templates.length === 0 ? (
        <div className="surface empty-state mt-8">
          <p className="text-lg">Crie um template antes de emitir.</p>
          <a className="btn mt-4 inline-flex" href="/templates">
            Ir para templates
          </a>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 max-w-2xl space-y-6">
          <section className="surface">
            <div className="field mb-0">
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
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {selected?.description ? (
                <p className="hint">{selected.description}</p>
              ) : null}
            </div>
          </section>

          <section className="surface">
            <h3 className="section-title">Parâmetros</h3>
            <ParamFieldsInputs
              fields={fields}
              values={values}
              onChange={(key, value) =>
                setValues((prev) => ({ ...prev, [key]: value }))
              }
            />
          </section>

          <section className="surface">
            <div className="field">
              <label className="label" htmlFor="idem">
                Idempotency-Key
              </label>
              <input
                id="idem"
                className="input font-mono text-sm"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                required
              />
              <p className="hint">
                No n8n use uma chave estável por período (ex.: mensal-2026-11)
                para não emitir em dobro.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Dry-run (valida localmente, não chama a SEFIN)
            </label>
          </section>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Processando…" : dryRun ? "Validar" : "Emitir nota"}
          </button>
        </form>
      )}

      {result ? (
        <pre className="surface mt-6 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
          {result}
        </pre>
      ) : null}
    </div>
  );
}
