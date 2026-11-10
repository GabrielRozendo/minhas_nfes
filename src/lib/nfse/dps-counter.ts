import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { dpsCounter } from "@/lib/db/schema";

export function allocateDpsNumber(serieInput?: string) {
  const env = getEnv();
  const serie = String(serieInput || env.DPS_SERIE || "1");
  const db = getDb();

  const existing = db
    .select()
    .from(dpsCounter)
    .where(eq(dpsCounter.serie, serie))
    .get();

  if (!existing) {
    db.insert(dpsCounter).values({ serie, nextNumber: 2 }).run();
    return { serie, numero: "1" };
  }

  const numero = existing.nextNumber;
  db.update(dpsCounter)
    .set({ nextNumber: numero + 1 })
    .where(eq(dpsCounter.serie, serie))
    .run();

  return { serie, numero: String(numero) };
}

export function peekNextDpsNumber(serieInput?: string) {
  const env = getEnv();
  const serie = serieInput || env.DPS_SERIE || "1";
  const db = getDb();
  const existing = db
    .select()
    .from(dpsCounter)
    .where(eq(dpsCounter.serie, serie))
    .get();
  return { serie, numero: String(existing?.nextNumber ?? 1) };
}
