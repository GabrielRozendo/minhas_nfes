import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { circuitState } from "@/lib/db/schema";

function ensureRow() {
  const db = getDb();
  const row = db.select().from(circuitState).where(eq(circuitState.id, 1)).get();
  if (row) return row;
  db.insert(circuitState).values({ id: 1, failures: 0 }).run();
  return db.select().from(circuitState).where(eq(circuitState.id, 1)).get()!;
}

export function getCircuitStatus() {
  const row = ensureRow();
  const openUntil = row.openUntil ? new Date(row.openUntil) : null;
  const open = Boolean(openUntil && openUntil.getTime() > Date.now());
  return {
    open,
    failures: row.failures,
    openUntil: openUntil?.toISOString() ?? null,
    lastError: row.lastError,
  };
}

export function assertCircuitClosed() {
  const status = getCircuitStatus();
  if (status.open) {
    const err = new Error(
      `Circuit breaker aberto até ${status.openUntil}. Chamadas ao gov.br pausadas.`,
    );
    (err as Error & { code: string }).code = "CIRCUIT_OPEN";
    throw err;
  }
}

export function recordGovSuccess() {
  const db = getDb();
  db.update(circuitState)
    .set({ failures: 0, openUntil: null, lastError: null })
    .where(eq(circuitState.id, 1))
    .run();
}

export function recordGovFailure(error: unknown) {
  const env = getEnv();
  const db = getDb();
  const row = ensureRow();
  const message = error instanceof Error ? error.message : String(error);
  const failures = row.failures + 1;

  const shouldOpen =
    failures >= env.CIRCUIT_BREAKER_THRESHOLD ||
    /429|consumo indevido|656|temporar|timeout|ECONNRESET|ETIMEDOUT/i.test(
      message,
    );

  const openUntil = shouldOpen
    ? new Date(Date.now() + env.CIRCUIT_BREAKER_COOLDOWN_MS).toISOString()
    : row.openUntil;

  db.update(circuitState)
    .set({
      failures: shouldOpen ? 0 : failures,
      openUntil,
      lastError: message.slice(0, 1000),
    })
    .where(eq(circuitState.id, 1))
    .run();
}
