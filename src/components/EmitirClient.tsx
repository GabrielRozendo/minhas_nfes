"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DpsFixedFieldsForm } from "@/components/DpsFixedFieldsForm";
import { EmissaoResult } from "@/components/EmissaoResult";
import { ParamFieldsInputs } from "@/components/ParamFieldsForm";
import {
  DEFAULT_PARAM_FIELDS,
  buildFixedPayloadFromForm,
  emptyTemplateForm,
  formFromFixedPayload,
  normalizeParamSchema,
  type TemplateFormData,
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
  initialMode,
  defaultMunicipio,
  prestadorDoc,
  prestadorIm,
}: {
  templates: Template[];
  draft?: {
    fromChave?: string;
    suggestedParams?: Record<string, unknown>;
    templateId?: string | null;
    payloadEnviado?: Record<string, unknown> | null;
    suggestedFixedPayload?: Record<string, unknown> | null;
  } | null;
  initialTemplateId?: string;
  initialMode?: "template" | "avulsa";
  defaultMunicipio: string;
  prestadorDoc: string;
  prestadorIm: string;
}) {
  const router = useRouter();

  const defaultMode: "template" | "avulsa" =
    initialMode === "avulsa" ||
    (!initialTemplateId && !draft?.templateId && templates.length === 0) ||
    (draft?.suggestedFixedPayload && !draft?.templateId)
      ? "avulsa"
      : "template";

  const [mode, setMode] = useState<"template" | "avulsa">(defaultMode);
  const [templateId, setTemplateId] = useState(
    initialTemplateId || draft?.templateId || templates[0]?.id || "",
  );
  const [editFixed, setEditFixed] = useState(
    Boolean(draft?.suggestedFixedPayload && !draft?.templateId),
  );
  const [fixedForm, setFixedForm] = useState<TemplateFormData>(() => {
    if (draft?.suggestedFixedPayload) {
      return formFromFixedPayload(draft.suggestedFixedPayload, {
        paramSchema: { fields: DEFAULT_PARAM_FIELDS },
      });
    }
    return emptyTemplateForm(defaultMunicipio);
  });

  const selected = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  const fields = useMemo(() => {
    if (mode === "avulsa") {
      return normalizeParamSchema({ fields: DEFAULT_PARAM_FIELDS }).fields;
    }
    return normalizeParamSchema(selected?.paramSchema).fields;
  }, [mode, selected]);

  const [values, setValues] = useState<Record<string, string | number>>(() =>
    initialValues(
      mode === "avulsa"
        ? DEFAULT_PARAM_FIELDS
        : normalizeParamSchema(
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
  const [loadingFixed, setLoadingFixed] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValues(initialValues(fields, draft?.suggestedParams));
  }, [templateId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!result) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  async function loadTemplateFixed(id: string) {
    setLoadingFixed(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/templates/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar template");
      setFixedForm(
        formFromFixedPayload(data.fixedPayload, {
          name: data.name,
          description: data.description,
          paramSchema: data.paramSchema,
        }),
      );
      setEditFixed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingFixed(false);
    }
  }

  function patchFixed(partial: Partial<TemplateFormData>) {
    setFixedForm((prev) => ({ ...prev, ...partial }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
      setResult(null);
    try {
      if (mode === "template" && !templateId) {
        throw new Error("Selecione um template ou mude para nota avulsa");
      }
      if (mode === "avulsa" || editFixed) {
        if (!fixedForm.tomadorNome.trim() || !fixedForm.tomadorDoc.trim()) {
          throw new Error("Informe nome e CPF/CNPJ do tomador");
        }
        if (!fixedForm.codigoServico.trim()) {
          throw new Error("Informe o código de serviço nacional");
        }
      }

      const params: Record<string, unknown> = { ...values };
      const body: Record<string, unknown> = {
        params,
        dryRun,
      };

      if (mode === "template" && templateId) {
        body.templateId = templateId;
      }

      if (mode === "avulsa" || editFixed) {
        body.fixedPayload = buildFixedPayloadFromForm(fixedForm, {
          cnpj: prestadorDoc,
          im: prestadorIm,
          municipio: defaultMunicipio,
        });
      }

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
      setResult(data);
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
      <header>
        <p className="eyebrow">Emissão</p>
        <h2 className="display-title">Emitir NFS-e</h2>
        <p className="lead">
          Use um template como pré-preenchimento ou emita uma nota avulsa
          preenchendo todos os campos.
        </p>
      </header>

      {draft?.fromChave ? (
        <div className="alert mt-6">
          Rascunho a partir da nota <code>{draft.fromChave}</code>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="form-stack">
        <section className="surface">
          <h3 className="section-title">Modo</h3>
          <div className="segment" role="radiogroup" aria-label="Modo de emissão">
            <label
              className={`segment-item${mode === "template" ? " is-on" : ""}`}
            >
              <input
                type="radio"
                name="modo"
                checked={mode === "template"}
                onChange={() => {
                  setMode("template");
                  setEditFixed(false);
                  if (!templateId && templates[0]) {
                    setTemplateId(templates[0].id);
                  }
                }}
              />
              A partir de template
            </label>
            <label
              className={`segment-item${mode === "avulsa" ? " is-on" : ""}`}
            >
              <input
                type="radio"
                name="modo"
                checked={mode === "avulsa"}
                onChange={() => {
                  setMode("avulsa");
                  setEditFixed(true);
                  if (!draft?.suggestedFixedPayload) {
                    setFixedForm(emptyTemplateForm(defaultMunicipio));
                  }
                }}
              />
              Nota avulsa
            </label>
          </div>
        </section>

        {mode === "template" ? (
          <section className="surface">
            {templates.length === 0 ? (
              <div>
                <p className="text-lg">Nenhum template cadastrado.</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Crie um template ou emita uma nota avulsa.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link className="btn btn-secondary" href="/templates">
                    Ir para templates
                  </Link>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setMode("avulsa");
                      setEditFixed(true);
                    }}
                  >
                    Emitir avulsa
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="field mb-0">
                  <label className="label" htmlFor="template">
                    Template
                  </label>
                  <select
                    id="template"
                    className="select"
                    value={templateId}
                    onChange={(e) => {
                      setTemplateId(e.target.value);
                      setEditFixed(false);
                    }}
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
                <div className="mt-4">
                  {!editFixed ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={!templateId || loadingFixed}
                      onClick={() => loadTemplateFixed(templateId)}
                    >
                      {loadingFixed
                        ? "Carregando…"
                        : "Editar campos fixos desta emissão"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditFixed(false)}
                    >
                      Usar só o template (sem override)
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        ) : null}

        {(mode === "avulsa" || editFixed) &&
        !(mode === "template" && templates.length === 0) ? (
          <DpsFixedFieldsForm
            form={fixedForm}
            onChange={patchFixed}
            showMeta={false}
            defaultMunicipio={defaultMunicipio}
          />
        ) : null}

        {(mode === "avulsa" ||
          (mode === "template" && templates.length > 0)) && (
          <>
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
              <label className="choice-card">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                <span>
                  <strong>Validar sem emitir</strong>
                  <span className="hint">
                    {dryRun
                      ? "Confere a nota neste computador. A SEFIN não é chamada e o número do DPS não é consumido."
                      : "Desmarcado: o envio segue para a SEFIN e emite a nota de verdade."}
                  </span>
                </span>
              </label>
            </section>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Processando…" : dryRun ? "Validar nota" : "Emitir nota"}
              </button>
              <p className="m-0 text-sm text-[var(--muted)]">
                {dryRun
                  ? "O retorno mostra a leitura da nota e o JSON original."
                  : "Isso envia a DPS para a SEFIN."}
              </p>
            </div>
          </>
        )}
      </form>

      {result ? (
        <div ref={resultRef} className="mt-8 scroll-mt-6">
          <EmissaoResult data={result} />
        </div>
      ) : null}
    </div>
  );
}
