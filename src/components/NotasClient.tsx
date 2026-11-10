"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Nota = {
  id: string;
  chaveAcesso: string | null;
  tomadorNome: string | null;
  valor: number | null;
  competencia: string | null;
  status: string;
  source: string;
  createdAt: string;
  hasPdf?: boolean;
};

export function NotasClient({
  initialItems,
  adn,
}: {
  initialItems: Nota[];
  adn: {
    canSyncNow: boolean;
    nextAllowedAt: string | null;
    ultimoNsu: string;
  };
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filtered = initialItems.filter((n) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      n.chaveAcesso?.toLowerCase().includes(needle) ||
      n.tomadorNome?.toLowerCase().includes(needle) ||
      n.competencia?.includes(needle)
    );
  });

  async function syncAdn() {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/v1/adn/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no sync");
      setMessage(
        `Sync ok: ${data.synced} novas. Próximo: ${data.nextAllowedAt ?? "agora"}`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="reveal">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="eyebrow">Histórico</p>
          <h2 className="display-title">Notas</h2>
          <p className="lead">
            Local + ADN sob demanda. Sem polling — cooldown de 1h quando não há
            documentos novos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-secondary" href="/emitir">
            Emitir
          </Link>
          <button
            className="btn"
            type="button"
            disabled={syncing || !adn.canSyncNow}
            onClick={syncAdn}
            title={
              adn.canSyncNow
                ? "Sincronizar ADN"
                : `Cooldownoldownown até ${adn.nextAllowedAt}`
            }
          >
            {syncing ? "Sincronizando…" : "Sync ADN"}
          </button>
        </div>
      </header>

      <p className="mt-3 text-sm text-[var(--muted)]">
        Último NSU: <code className="font-mono">{adn.ultimoNsu}</code>
        {!adn.canSyncNow && adn.nextAllowedAt
          ? ` · cooldown até ${adn.nextAllowedAt}`
          : null}
      </p>

      {message ? <div className="alert">{message}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="field mt-6 max-w-md">
        <label className="label" htmlFor="q">
          Buscar
        </label>
        <input
          id="q"
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="chave, tomador, competência…"
        />
      </div>

      <div className="surface mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Competência</th>
              <th>Tomador</th>
              <th>Valor</th>
              <th>Origem</th>
              <th>Chave</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhuma nota ainda. Crie um template e emita a primeira.
                </td>
              </tr>
            ) : (
              filtered.map((n) => (
                <tr key={n.id}>
                  <td>{n.competencia ?? "—"}</td>
                  <td>{n.tomadorNome ?? "—"}</td>
                  <td>
                    {n.valor != null
                      ? n.valor.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "—"}
                  </td>
                  <td>
                    <span className="badge">{n.source}</span>
                  </td>
                  <td className="font-mono text-xs">
                    {n.chaveAcesso ? (
                      <Link href={`/notas/${n.chaveAcesso}`}>
                        {n.chaveAcesso}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {n.chaveAcesso ? (
                      <>
                        <Link
                          className="text-sm underline underline-offset-2"
                          href={`/emitir?duplicar=${n.chaveAcesso}`}
                        >
                          Duplicar
                        </Link>
                        {n.hasPdf ? (
                          <>
                            {" · "}
                            <a
                              className="text-sm underline underline-offset-2"
                              href={`/api/v1/notas/${n.chaveAcesso}/pdf`}
                            >
                              PDF
                            </a>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
