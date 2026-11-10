"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Template = {
  id: string;
  name: string;
  description: string;
  fixedPayload?: Record<string, unknown>;
  paramSchema: Record<string, unknown>;
  createdAt: string;
};

const DEFAULT_FIXED = {
  infDps: {
    prestador: {
      cnpj: "00000000000000",
      inscricaoMunicipal: "12345",
      nome: "MINHA EMPRESA LTDA",
      regimeTributario: { opSimpNac: 2, regEspTrib: 0 },
    },
    servico: {
      localPrestacao: { cLocPrestacao: "3550308" },
      codigoServico: { cServTribNac: "010701188" },
      xDescServ: "Serviço padrão do template",
    },
    valores: { vServico: 1000 },
    tributacao: {
      issqn: { tributacaoIssqn: 1, tipoRetencaoIssqn: 1, aliquota: 0.02 },
    },
  },
};

export function TemplatesClient({ initialItems }: { initialItems: Template[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fixedJson, setFixedJson] = useState(
    JSON.stringify(DEFAULT_FIXED, null, 2),
  );
  const [paramSchemaJson, setParamSchemaJson] = useState(
    JSON.stringify(
      {
        type: "object",
        properties: {
          competencia: { type: "string" },
          valor: { type: "number" },
          discriminacao: { type: "string" },
          tomadorNome: { type: "string" },
          tomadorDoc: { type: "string" },
        },
      },
      null,
      2,
    ),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Template | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          fixedPayload: JSON.parse(fixedJson),
          paramSchema: JSON.parse(paramSchemaJson),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar");
      setName("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplate(id: string) {
    const res = await fetch(`/api/v1/templates/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Falha ao carregar");
      return;
    }
    setSelected(data);
  }

  return (
    <div>
      <h2 className="text-3xl font-semibold">Templates</h2>
      <p className="mt-1 text-[var(--muted)]">
        Campos fixos + parâmetros variáveis para emissão via dashboard ou n8n.
      </p>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Criado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {initialItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  Nenhum template.
                </td>
              </tr>
            ) : (
              initialItems.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.description || "—"}</td>
                  <td className="text-sm">{t.createdAt}</td>
                  <td>
                    <button
                      type="button"
                      className="text-sm underline"
                      onClick={() => loadTemplate(t.id)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="panel">
          <h3 className="text-xl font-medium">{selected.name}</h3>
          <p className="muted text-sm">{selected.id}</p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
            {JSON.stringify(selected, null, 2)}
          </pre>
        </div>
      ) : null}

      <form onSubmit={onCreate} className="panel">
        <h3 className="mb-4 text-xl font-medium">Novo template</h3>
        <div className="field">
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="description">
            Descrição
          </label>
          <input
            id="description"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="fixed">
            fixedPayload
          </label>
          <textarea
            id="fixed"
            className="textarea"
            value={fixedJson}
            onChange={(e) => setFixedJson(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="schema">
            paramSchema
          </label>
          <textarea
            id="schema"
            className="textarea"
            value={paramSchemaJson}
            onChange={(e) => setParamSchemaJson(e.target.value)}
            required
          />
        </div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Salvando…" : "Criar template"}
        </button>
      </form>
    </div>
  );
}
