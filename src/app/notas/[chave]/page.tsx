import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotaByChave } from "@/lib/nfse/provider";

export const dynamic = "force-dynamic";

export default async function NotaDetailPage({
  params,
}: {
  params: Promise<{ chave: string }>;
}) {
  const { chave } = await params;
  const nota = await getNotaByChave(chave, false);
  if (!nota) notFound();

  return (
    <div>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/">← Notas</Link>
      </p>
      <h2 className="mt-2 text-3xl font-semibold">Nota</h2>
      <p className="mt-1 font-mono text-sm break-all">{nota.chaveAcesso}</p>

      <dl className="panel grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="label">Tomador</dt>
          <dd>{nota.tomadorNome ?? "—"}</dd>
        </div>
        <div>
          <dt className="label">Documento</dt>
          <dd>{nota.tomadorDoc ?? "—"}</dd>
        </div>
        <div>
          <dt className="label">Valor</dt>
          <dd>
            {nota.valor != null
              ? nota.valor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="label">Competência</dt>
          <dd>{nota.competencia ?? "—"}</dd>
        </div>
        <div>
          <dt className="label">Status</dt>
          <dd>{nota.status}</dd>
        </div>
        <div>
          <dt className="label">Origem</dt>
          <dd>{nota.source}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="btn btn-secondary" href={`/emitir?duplicar=${chave}`}>
          Duplicar
        </Link>
        <a className="btn" href={`/api/v1/notas/${chave}/pdf`}>
          Baixar PDF
        </a>
      </div>

      {(nota.pdfPath || nota.xmlPath) && (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Arquivos: {nota.xmlPath ?? "—"} · {nota.pdfPath ?? "—"}
          {nota.pdfSource ? ` (${nota.pdfSource})` : ""}
        </p>
      )}

      {nota.discriminacao ? (
        <div className="panel">
          <h3 className="text-lg font-medium">Discriminação</h3>
          <p className="mt-2 whitespace-pre-wrap">{nota.discriminacao}</p>
        </div>
      ) : null}

      {nota.xmlNfse ? (
        <div className="panel">
          <h3 className="text-lg font-medium">XML</h3>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
            {nota.xmlNfse}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
