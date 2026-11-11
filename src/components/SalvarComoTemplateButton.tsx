"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SalvarComoTemplateButton({ chave }: { chave: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onClick() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/v1/notas/${encodeURIComponent(chave)}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar template");
      setMessage(`Template criado: ${data.name}`);
      router.push(`/templates`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className="btn btn-secondary"
        disabled={loading}
        onClick={onClick}
      >
        {loading ? "Salvando…" : "Salvar como template"}
      </button>
      {message ? (
        <span className="text-xs text-[var(--muted)]">{message}</span>
      ) : null}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </span>
  );
}
