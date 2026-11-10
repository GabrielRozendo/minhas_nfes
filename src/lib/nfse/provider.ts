import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import {
  ContribuinteService,
  TipoAmbiente,
  validateDps,
  type DpsData,
} from "nfse-nacional";
import { getEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { adnState, notas, templates } from "@/lib/db/schema";
import { fetchDfeFromNsu } from "./adn-client";
import {
  assertCircuitClosed,
  getCircuitStatus,
  recordGovFailure,
  recordGovSuccess,
} from "./circuit-breaker";
import { getCertificateInfo, getCertificateStatus } from "./certificate";
import { allocateDpsNumber, peekNextDpsNumber } from "./dps-counter";
import {
  beginIdempotency,
  completeIdempotency,
  failIdempotency,
} from "./idempotency";
import { safeErrorMessage } from "./safe-log";
import {
  buildDpsFromTemplate,
  extractNotaMeta,
  type EmitParams,
} from "./template-merge";
import { ensureNotaArtifacts } from "./pdf";

function service() {
  const env = getEnv();
  getCertificateInfo();
  return new ContribuinteService({
    ambiente: env.isProducao ? TipoAmbiente.Producao : TipoAmbiente.Homologacao,
    certificatePath: env.CERT_PATH,
    certificatePassword: env.CERT_PASSWORD,
    codigoMunicipio: env.CODIGO_MUNICIPIO,
  });
}

async function withGov<T>(fn: () => Promise<T>): Promise<T> {
  assertCircuitClosed();
  try {
    const result = await fn();
    recordGovSuccess();
    return result;
  } catch (error) {
    recordGovFailure(error);
    throw error;
  }
}

function serializeNota(row: typeof notas.$inferSelect) {
  return {
    id: row.id,
    chaveAcesso: row.chaveAcesso,
    dpsId: row.dpsId,
    numeroDps: row.numeroDps,
    serie: row.serie,
    status: row.status,
    ambiente: row.ambiente,
    tomadorNome: row.tomadorNome,
    tomadorDoc: row.tomadorDoc,
    valor: row.valor,
    competencia: row.competencia,
    discriminacao: row.discriminacao,
    templateId: row.templateId,
    source: row.source,
    nsu: row.nsu,
    createdAt: row.createdAt,
    hasXml: Boolean(row.xmlNfse || row.xmlPath),
    hasPdf: Boolean(row.pdfPath),
    xmlPath: row.xmlPath,
    pdfPath: row.pdfPath,
    pdfSource: row.pdfSource,
  };
}

export async function listNotas(filters?: {
  q?: string;
  status?: string;
  limit?: number;
}) {
  const db = getDb();
  const rows = db.select().from(notas).orderBy(desc(notas.createdAt)).all();
  let filtered = rows;
  if (filters?.status) {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.chaveAcesso?.toLowerCase().includes(q) ||
        r.tomadorNome?.toLowerCase().includes(q) ||
        r.tomadorDoc?.includes(q) ||
        r.discriminacao?.toLowerCase().includes(q),
    );
  }
  const limit = filters?.limit ?? 100;
  return filtered.slice(0, limit).map(serializeNota);
}

export async function getNotaByChave(chave: string, fetchRemote = false) {
  const db = getDb();
  const local = db
    .select()
    .from(notas)
    .where(eq(notas.chaveAcesso, chave))
    .get();

  if (local?.xmlNfse || !fetchRemote) {
    return local
      ? {
          ...serializeNota(local),
          xmlNfse: local.xmlNfse,
          payloadEnviado: local.payloadEnviado
            ? JSON.parse(local.payloadEnviado)
            : null,
        }
      : null;
  }

  const consulta = await withGov(() => service().consultar(chave));
  const xml =
    typeof consulta === "object" && consulta && "xml" in consulta
      ? String((consulta as { xml?: string }).xml ?? "")
      : JSON.stringify(consulta);

  if (local) {
    db.update(notas)
      .set({ xmlNfse: xml || local.xmlNfse })
      .where(eq(notas.id, local.id))
      .run();
    const updated = db.select().from(notas).where(eq(notas.id, local.id)).get()!;
    return {
      ...serializeNota(updated),
      xmlNfse: updated.xmlNfse,
      payloadEnviado: updated.payloadEnviado
        ? JSON.parse(updated.payloadEnviado)
        : null,
    };
  }

  const id = randomUUID();
  db.insert(notas)
    .values({
      id,
      chaveAcesso: chave,
      status: "autorizada",
      ambiente: getEnv().NFSE_AMBIENTE,
      xmlNfse: xml,
      source: "sefin",
    })
    .run();

  const created = db.select().from(notas).where(eq(notas.id, id)).get()!;
  return {
    ...serializeNota(created),
    xmlNfse: created.xmlNfse,
    payloadEnviado: null,
  };
}

export function duplicateNotaDraft(chave: string) {
  const db = getDb();
  const local = db
    .select()
    .from(notas)
    .where(eq(notas.chaveAcesso, chave))
    .get();
  if (!local) return null;

  const payload = local.payloadEnviado
    ? JSON.parse(local.payloadEnviado)
    : null;

  return {
    fromChave: chave,
    suggestedParams: {
      tomadorNome: local.tomadorNome,
      tomadorDoc: local.tomadorDoc,
      valor: local.valor,
      competencia: local.competencia,
      discriminacao: local.discriminacao,
    },
    templateId: local.templateId,
    payloadEnviado: payload,
  };
}

async function emitPreparedDps(options: {
  dps: DpsData;
  idempotencyKey: string;
  templateId?: string | null;
}) {
  const started = beginIdempotency(options.idempotencyKey);
  if (started.kind === "hit") {
    return { ...started.response, idempotent: true };
  }
  if (started.kind === "inflight") {
    const err = new Error("Emissão com esta Idempotency-Key ainda em andamento");
    (err as Error & { status: number }).status = 409;
    throw err;
  }

  const validation = validateDps(options.dps);
  if (!validation.isValid) {
    failIdempotency(options.idempotencyKey);
    const err = new Error(
      `DPS inválida: ${validation.errors.join("; ")}`,
    );
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  try {
    const exists = await withGov(() =>
      service().verificarDps(options.dps.infDps.id),
    );
    if (exists) {
      const existing = await withGov(() =>
        service().consultarDps(options.dps.infDps.id),
      );
      const chave =
        typeof existing === "object" && existing && "chaveAcesso" in existing
          ? String((existing as { chaveAcesso?: string }).chaveAcesso ?? "")
          : "";

      const db = getDb();
      let nota = chave
        ? db.select().from(notas).where(eq(notas.chaveAcesso, chave)).get()
        : null;

      if (!nota) {
        const id = randomUUID();
        const meta = extractNotaMeta(options.dps);
        db.insert(notas)
          .values({
            id,
            chaveAcesso: chave || null,
            dpsId: meta.dpsId,
            numeroDps: meta.numeroDps,
            serie: meta.serie,
            status: "autorizada",
            ambiente: getEnv().NFSE_AMBIENTE,
            payloadEnviado: JSON.stringify(options.dps),
            tomadorNome: meta.tomadorNome,
            tomadorDoc: meta.tomadorDoc,
            valor: meta.valor,
            competencia: meta.competencia,
            discriminacao: meta.discriminacao,
            templateId: options.templateId ?? null,
            source: "local",
          })
          .run();
        nota = db.select().from(notas).where(eq(notas.id, id)).get()!;
      }

      const response = { nota: serializeNota(nota), reusedExistingDps: true };
      completeIdempotency(options.idempotencyKey, nota.id, response);
      return response;
    }

    const emissao = await withGov(() => service().emitir(options.dps));
    const chave =
      (emissao as { chaveAcesso?: string; chNFSe?: string }).chaveAcesso ??
      (emissao as { chNFSe?: string }).chNFSe ??
      null;
    const xml =
      (emissao as { xml?: string; xmlNfse?: string }).xml ??
      (emissao as { xmlNfse?: string }).xmlNfse ??
      null;

    const id = randomUUID();
    const meta = extractNotaMeta(options.dps);
    const db = getDb();
    db.insert(notas)
      .values({
        id,
        chaveAcesso: chave,
        dpsId: meta.dpsId,
        numeroDps: meta.numeroDps,
        serie: meta.serie,
        status: "autorizada",
        ambiente: getEnv().NFSE_AMBIENTE,
        payloadEnviado: JSON.stringify(options.dps),
        xmlNfse: xml,
        tomadorNome: meta.tomadorNome,
        tomadorDoc: meta.tomadorDoc,
        valor: meta.valor,
        competencia: meta.competencia,
        discriminacao: meta.discriminacao,
        templateId: options.templateId ?? null,
        source: "local",
      })
      .run();

    let nota = db.select().from(notas).where(eq(notas.id, id)).get()!;
    if (chave && xml) {
      try {
        await ensureNotaArtifacts({
          chave,
          xml,
          generatePdf: true,
        });
        nota = db.select().from(notas).where(eq(notas.id, id)).get()!;
      } catch {
        // emissão já autorizada; PDF pode ser gerado depois via endpoint
      }
    }

    const response = {
      nota: serializeNota(nota),
      emissao: {
        chaveAcesso: chave,
      },
      files: {
        xmlPath: nota.xmlPath,
        pdfPath: nota.pdfPath,
        pdfSource: nota.pdfSource,
      },
    };
    completeIdempotency(options.idempotencyKey, nota.id, response);
    return response;
  } catch (error) {
    failIdempotency(options.idempotencyKey);
    throw error;
  }
}

export async function emitNota(input: {
  idempotencyKey: string;
  templateId?: string;
  params?: EmitParams;
  fixedPayload?: Record<string, unknown>;
  dryRun?: boolean;
}) {
  const db = getDb();
  let fixed = input.fixedPayload ?? {};
  let templateId = input.templateId ?? null;

  if (input.templateId) {
    const tpl = db
      .select()
      .from(templates)
      .where(eq(templates.id, input.templateId))
      .get();
    if (!tpl) {
      const err = new Error("Template não encontrado");
      (err as Error & { status: number }).status = 404;
      throw err;
    }
    fixed = JSON.parse(tpl.fixedPayload);
    templateId = tpl.id;
  }

  if (input.dryRun) {
    const peeked = peekNextDpsNumber();
    const dps = buildDpsFromTemplate({
      fixedPayload: fixed,
      params: input.params,
      serie: peeked.serie,
      numeroDps: peeked.numero,
    });
    const validation = validateDps(dps);
    return {
      dryRun: true,
      valid: validation.isValid,
      errors: validation.errors,
      dps,
    };
  }

  const { serie, numero } = allocateDpsNumber();
  const dps = buildDpsFromTemplate({
    fixedPayload: fixed,
    params: input.params,
    serie,
    numeroDps: numero,
  });

  return emitPreparedDps({
    dps,
    idempotencyKey: input.idempotencyKey,
    templateId,
  });
}

function ensureAdnState() {
  const db = getDb();
  let row = db.select().from(adnState).where(eq(adnState.id, 1)).get();
  if (!row) {
    db.insert(adnState).values({ id: 1, ultimoNsu: "0" }).run();
    row = db.select().from(adnState).where(eq(adnState.id, 1)).get()!;
  }
  return row;
}

export function getAdnStatus() {
  const row = ensureAdnState();
  return {
    ultimoNsu: row.ultimoNsu,
    lastSyncAt: row.lastSyncAt,
    nextAllowedAt: row.nextAllowedAt,
    lastError: row.lastError,
    syncing: Boolean(row.syncing),
    canSyncNow:
      !row.syncing &&
      (!row.nextAllowedAt || new Date(row.nextAllowedAt).getTime() <= Date.now()),
  };
}

export async function syncAdn() {
  const env = getEnv();
  const db = getDb();
  const state = ensureAdnState();

  if (state.syncing) {
    const err = new Error("Sync ADN já em andamento");
    (err as Error & { status: number }).status = 409;
    throw err;
  }

  if (state.nextAllowedAt && new Date(state.nextAllowedAt).getTime() > Date.now()) {
    const err = new Error(
      `Sync ADN em cooldown até ${state.nextAllowedAt} (mín. 1h sem documentos novos)`,
    );
    (err as Error & { status: number }).status = 429;
    throw err;
  }

  db.update(adnState)
    .set({ syncing: 1, lastError: null })
    .where(eq(adnState.id, 1))
    .run();

  let synced = 0;
  let currentNsu = state.ultimoNsu || "0";
  let nextAllowedAt: string | null = null;

  try {
    // Drain while documents keep arriving. Stop and cool down when empty.
    for (let batch = 0; batch < 100; batch++) {
      const page = await withGov(() => fetchDfeFromNsu(currentNsu));

      if (page.empty || page.items.length === 0) {
        nextAllowedAt = new Date(
          Date.now() + env.ADN_SYNC_MIN_INTERVAL_MS,
        ).toISOString();
        break;
      }

      for (const item of page.items) {
        if (item.chaveAcesso) {
          const existing = db
            .select()
            .from(notas)
            .where(eq(notas.chaveAcesso, item.chaveAcesso))
            .get();
          if (existing) {
            if (item.xml && !existing.xmlNfse) {
              db.update(notas)
                .set({ xmlNfse: item.xml, nsu: item.nsu, source: existing.source })
                .where(eq(notas.id, existing.id))
                .run();
            }
            if (item.xml) {
              await ensureNotaArtifacts({
                chave: item.chaveAcesso,
                xml: item.xml,
                generatePdf: false,
              });
            }
          } else {
            db.insert(notas)
              .values({
                id: randomUUID(),
                chaveAcesso: item.chaveAcesso,
                status: "autorizada",
                ambiente: env.NFSE_AMBIENTE,
                xmlNfse: item.xml ?? null,
                source: "adn",
                nsu: item.nsu,
              })
              .run();
            if (item.xml) {
              await ensureNotaArtifacts({
                chave: item.chaveAcesso,
                xml: item.xml,
                generatePdf: false,
              });
            }
            synced += 1;
          }
        }
        currentNsu = item.nsu;
      }

      if (page.maxNsu && page.maxNsu !== currentNsu) {
        currentNsu = page.maxNsu;
      }

      if (page.items.length < 50) {
        // Likely caught up; enforce cooldown before next poll.
        nextAllowedAt = new Date(
          Date.now() + env.ADN_SYNC_MIN_INTERVAL_MS,
        ).toISOString();
        break;
      }
    }

    db.update(adnState)
      .set({
        ultimoNsu: currentNsu,
        lastSyncAt: new Date().toISOString(),
        nextAllowedAt,
        syncing: 0,
        lastError: null,
      })
      .where(eq(adnState.id, 1))
      .run();

    return {
      synced,
      ultimoNsu: currentNsu,
      nextAllowedAt,
    };
  } catch (error) {
    db.update(adnState)
      .set({
        syncing: 0,
        lastError: safeErrorMessage(error),
      })
      .where(eq(adnState.id, 1))
      .run();
    throw error;
  }
}

export function listTemplates() {
  return getDb()
    .select()
    .from(templates)
    .orderBy(desc(templates.createdAt))
    .all()
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      paramSchema: JSON.parse(t.paramSchema || "{}"),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
}

export function getTemplate(id: string) {
  const t = getDb().select().from(templates).where(eq(templates.id, id)).get();
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    fixedPayload: JSON.parse(t.fixedPayload),
    paramSchema: JSON.parse(t.paramSchema || "{}"),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function createTemplate(input: {
  name: string;
  description?: string;
  fixedPayload: Record<string, unknown>;
  paramSchema?: Record<string, unknown>;
}) {
  const id = randomUUID();
  getDb()
    .insert(templates)
    .values({
      id,
      name: input.name,
      description: input.description ?? "",
      fixedPayload: JSON.stringify(input.fixedPayload),
      paramSchema: JSON.stringify(input.paramSchema ?? {}),
    })
    .run();
  return getTemplate(id);
}

export function updateTemplate(
  id: string,
  input: {
    name?: string;
    description?: string;
    fixedPayload?: Record<string, unknown>;
    paramSchema?: Record<string, unknown>;
  },
) {
  const existing = getTemplate(id);
  if (!existing) return null;
  getDb()
    .update(templates)
    .set({
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      fixedPayload: JSON.stringify(input.fixedPayload ?? existing.fixedPayload),
      paramSchema: JSON.stringify(input.paramSchema ?? existing.paramSchema),
      updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
    })
    .where(eq(templates.id, id))
    .run();
  return getTemplate(id);
}

export function getSystemStatus() {
  const env = getEnv();
  return {
    ambiente: env.NFSE_AMBIENTE,
    codigoMunicipio: env.CODIGO_MUNICIPIO,
    authEnabled: env.authRequired,
    certificate: getCertificateStatus(),
    circuit: getCircuitStatus(),
    adn: getAdnStatus(),
    dpsSerie: env.DPS_SERIE,
  };
}
