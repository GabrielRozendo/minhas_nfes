import { getSystemStatus } from "@/lib/nfse/provider";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const status = getSystemStatus();

  return (
    <div>
      <h2 className="display-title">Status</h2>
      <p className="mt-1 text-[var(--muted)]">
        Ambiente, certificado e salvaguardas da API gov.br.
      </p>

      <dl className="panel grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="label">Ambiente NFS-e</dt>
          <dd className="text-xl font-medium">{status.ambiente}</dd>
        </div>
        <div>
          <dt className="label">Município (IBGE)</dt>
          <dd>{status.codigoMunicipio}</dd>
        </div>
        <div>
          <dt className="label">Auth</dt>
          <dd>{status.authEnabled ? "habilitada" : "desabilitada"}</dd>
        </div>
        <div>
          <dt className="label">Série DPS</dt>
          <dd>{status.dpsSerie}</dd>
        </div>
      </dl>

      <section className="panel">
        <h3 className="text-xl font-medium">Certificado A1</h3>
        {status.certificate.ok ? (
          <ul className="mt-3 space-y-1 text-sm">
            <li>CN: {status.certificate.commonName}</li>
            <li>Expira: {status.certificate.expiresAt}</li>
            <li>Dias restantes: {status.certificate.daysLeft}</li>
          </ul>
        ) : (
          <div className="alert alert-error mt-3">
            {status.certificate.error}
          </div>
        )}
      </section>

      <section className="panel">
        <h3 className="text-xl font-medium">Circuit breaker</h3>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Estado: {status.circuit.open ? "ABERTO" : "fechado"}</li>
          <li>Falhas acumuladas: {status.circuit.failures}</li>
          <li>Aberto até: {status.circuit.openUntil ?? "—"}</li>
          <li>Último erro: {status.circuit.lastError ?? "—"}</li>
        </ul>
      </section>

      <section className="panel">
        <h3 className="text-xl font-medium">ADN sync</h3>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Último NSU: {status.adn.ultimoNsu}</li>
          <li>Último sync: {status.adn.lastSyncAt ?? "—"}</li>
          <li>Próximo permitido: {status.adn.nextAllowedAt ?? "agora"}</li>
          <li>Pode sincronizar: {status.adn.canSyncNow ? "sim" : "não"}</li>
          <li>Último erro: {status.adn.lastError ?? "—"}</li>
        </ul>
      </section>
    </div>
  );
}
