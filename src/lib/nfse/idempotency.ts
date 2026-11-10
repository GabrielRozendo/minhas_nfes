import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { idempotencyKeys } from "@/lib/db/schema";

export function getIdempotency(key: string) {
  return getDb()
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .get();
}

export function beginIdempotency(key: string) {
  const existing = getIdempotency(key);
  if (existing) {
    if (existing.status === "completed" && existing.responseJson) {
      return {
        kind: "hit" as const,
        response: JSON.parse(existing.responseJson),
        notaId: existing.notaId,
      };
    }
    if (existing.status === "pending") {
      return { kind: "inflight" as const };
    }
  }

  try {
    getDb()
      .insert(idempotencyKeys)
      .values({ key, status: "pending" })
      .run();
  } catch {
    const again = getIdempotency(key);
    if (again?.status === "completed" && again.responseJson) {
      return {
        kind: "hit" as const,
        response: JSON.parse(again.responseJson),
        notaId: again.notaId,
      };
    }
    return { kind: "inflight" as const };
  }

  return { kind: "miss" as const };
}

export function completeIdempotency(
  key: string,
  notaId: string,
  response: unknown,
) {
  getDb()
    .update(idempotencyKeys)
    .set({
      status: "completed",
      notaId,
      responseJson: JSON.stringify(response),
    })
    .where(eq(idempotencyKeys.key, key))
    .run();
}

export function failIdempotency(key: string) {
  getDb()
    .delete(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .run();
}
