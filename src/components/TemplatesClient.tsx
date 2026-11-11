"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DpsFixedFieldsForm } from "@/components/DpsFixedFieldsForm";
import {
  DEFAULT_PARAM_FIELDS,
  buildFixedPayloadFromForm,
  emptyTemplateForm,
  formFromTemplate,
  normalizeParamSchema,
  type ParamFieldType,
  type TemplateFormData,
  type TemplateParamField,
} from "@/lib/templates/types";

type TemplateListItem = {
  id: string;
  name: string;
  description: string;
  paramSchema: unknown;
  createdAt: string;
  updatedAt: string;
};

const FIELD_TYPES: { value: ParamFieldType; label: string }[] = [
  { value: "money", label: "Valor (R$)" },
  { value: "date", label: "Data" },
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Texto longo" },
  { value: "document", label: "CPF/CNPJ" },
];

export function TemplatesClient({
  initialItems,
  defaultMunicipio,
  prestadorDoc,
  prestadorIm,
}: {
  initialItems: TemplateListItem[];
  defaultMunicipio: string;
  prestadorDoc: string;
  prestadorIm: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormData>(() =>
    emptyTemplateForm(defaultMunicipio),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const paramPreview = useMemo(
    () => form.paramFields.map((f) => f.label).join(" · ") || "nenhum",
    [form.paramFields],
  );

  function patchForm(partial: Partial<TemplateFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function updateParamField(
    index: number,
    partial: Partial<TemplateParamField>,
  ) {
    setForm((prev) => ({
      ...prev,
      paramFields: prev.paramFields.map((f, i) =>
        i === index ? { ...f, ...partial } : f,
      ),
    }));
  }

  function addParamField() {
    setForm((prev) => ({
      ...prev,
      paramFields: [
        ...prev.paramFields,
        {
          key: `campo_${prev.paramFields.length + 1}`,
          label: "Novo campo",
          type: "text" as const,
          required: false,
        },
      ],
    }));
  }

  function removeParamField(index: number) {
    setForm((prev) => ({
      ...prev,
      paramFields: prev.paramFields.filter((_, i) => i !== index),
    }));
  }

  function resetDefaultsParams() {
    setForm((prev) => ({
      ...prev,
      paramFields: DEFAULT_PARAM_FIELDS.map((f) => ({ ...f })),
    }));
  }

  async function openEdit(id: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/templates/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar");
      setEditingId(id);
      setForm(
        formFromTemplate({
          name: data.name,
          description: data.description,
          fixedPayload: data.fixedPayload,
          paramSchema: data.paramSchema,
        }),
      );
      setMode("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyTemplateForm(defaultMunicipio));
    setError("");
    setMode("create");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!form.tomadorNome.trim() || !form.tomadorDoc.trim()) {
        throw new Error("Informe nome e CPF/CNPJ do tomador");
      }
      if (!form.codigoServico.trim()) {
        throw new Error("Informe o código de serviço nacional");
      }
      if (form.paramFields.length === 0) {
        throw new Error("Inclua ao menos um parâmetro variável");
      }

      const fixedPayload = buildFixedPayloadFromForm(form, {
        cnpj: prestadorDoc,
        im: prestadorIm,
        municipio: defaultMunicipio,
      });
      const paramSchema = { fields: form.paramFields };
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        fixedPayload,
        paramSchema,
      };

      const res = await fetch(
        mode === "edit" && editingId
          ? `/api/v1/templates/${editingId}`
          : "/api/v1/templates",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");
      setMode("list");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Excluir o template “${name}”?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/templates/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao excluir");
      if (editingId === id) {
        setMode("list");
        setEditingId(null);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (mode === "create" || mode === "edit") {
    return (
      <div className="reveal">
        <button
          type="button"
          className="text-sm text-[var(--muted)] underline-offset-4 hover:underline"
          onClick={() => setMode("list")}
        >
          ← Voltar aos templates
        </button>

        <header className="mt-4 max-w-2xl">
          <p className="eyebrow">Templates</p>
          <h2 className="display-title">
            {mode === "edit" ? "Editar template" : "Novo template"}
          </h2>
          <p className="lead">
            Cadastre tomador, serviço e tributação fixos. Na emissão — dashboard
            ou n8n — você só preenche os parâmetros variáveis (valor, data,
            descrição…).
          </p>
        </header>

        <form onSubmit={onSubmit} className="mt-8 max-w-2xl space-y-8">
          <DpsFixedFieldsForm
            form={form}
            onChange={patchForm}
            showMeta
            defaultMunicipio={defaultMunicipio}
          />

          <section className="surface">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="section-title mb-0">Parâmetros na emissão</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Campos que o dashboard e o n8n preenchem a cada nota.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetDefaultsParams}
                >
                  Padrão (data, valor, descrição)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addParamField}
                >
                  + Campo
                </button>
              </div>
            </div>

            <ul className="space-y-3">
              {form.paramFields.map((field, index) => (
                <li
                  key={`${field.key}-${index}`}
                  className="grid gap-3 border border-[var(--line)] bg-[color-mix(in_oklab,white_70%,transparent)] p-3 sm:grid-cols-[1fr_1fr_8rem_auto]"
                >
                  <div className="field mb-0">
                    <label className="label">Rótulo</label>
                    <input
                      className="input"
                      value={field.label}
                      onChange={(e) =>
                        updateParamField(index, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="field mb-0">
                    <label className="label">Chave (API / n8n)</label>
                    <input
                      className="input font-mono text-sm"
                      value={field.key}
                      onChange={(e) =>
                        updateParamField(index, {
                          key: e.target.value
                            .replace(/\s+/g, "_")
                            .toLowerCase(),
                        })
                      }
                    />
                  </div>
                  <div className="field mb-0">
                    <label className="label">Tipo</label>
                    <select
                      className="select"
                      value={field.type}
                      onChange={(e) =>
                        updateParamField(index, {
                          type: e.target.value as ParamFieldType,
                        })
                      }
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="mb-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) =>
                          updateParamField(index, {
                            required: e.target.checked,
                          })
                        }
                      />
                      Obrig.
                    </label>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeParamField(index)}
                      aria-label="Remover campo"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Preview: {paramPreview}
            </p>
          </section>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <div className="flex flex-wrap gap-2">
            <button className="btn" type="submit" disabled={loading}>
              {loading
                ? "Salvando…"
                : mode === "edit"
                  ? "Salvar alterações"
                  : "Criar template"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMode("list")}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="reveal">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="eyebrow">Recorrência</p>
          <h2 className="display-title">Templates</h2>
          <p className="lead">
            Um template por cliente/serviço. Depois é só passar valor,
            competência e descrição — no painel ou no n8n. Também dá para emitir
            nota avulsa sem template.
          </p>
        </div>
        <button type="button" className="btn" onClick={openCreate}>
          Novo template
        </button>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="mt-8 space-y-3">
        {initialItems.length === 0 ? (
          <div className="surface empty-state">
            <p className="text-lg">Nenhum template ainda.</p>
            <p className="mt-1 text-[var(--muted)]">
              Crie o primeiro para o CNPJ que você fatura com frequência, ou
              emita uma nota avulsa.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={openCreate}>
                Criar template
              </button>
              <Link className="btn btn-secondary" href="/emitir?modo=avulsa">
                Emitir avulsa
              </Link>
            </div>
          </div>
        ) : (
          initialItems.map((t, i) => {
            const fields = normalizeParamSchema(t.paramSchema).fields;
            return (
              <article
                key={t.id}
                className="template-card"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold tracking-tight">
                    {t.name}
                  </h3>
                  {t.description ? (
                    <p className="mt-1 text-[var(--muted)]">{t.description}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fields.map((f) => (
                      <span key={f.key} className="badge">
                        {f.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 font-mono text-xs text-[var(--muted)]">
                    {t.id}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="btn btn-secondary"
                    href={`/emitir?template=${t.id}`}
                  >
                    Emitir
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={loading}
                    onClick={() => openEdit(t.id)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={loading}
                    onClick={() => onDelete(t.id, t.name)}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
