import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  fixedPayload: text("fixed_payload").notNull(),
  paramSchema: text("param_schema").notNull().default("{}"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const notas = sqliteTable("notas", {
  id: text("id").primaryKey(),
  chaveAcesso: text("chave_acesso"),
  dpsId: text("dps_id"),
  numeroDps: text("numero_dps"),
  serie: text("serie"),
  status: text("status").notNull().default("autorizada"),
  ambiente: text("ambiente").notNull(),
  payloadEnviado: text("payload_enviado"),
  xmlNfse: text("xml_nfse"),
  xmlPath: text("xml_path"),
  pdfPath: text("pdf_path"),
  pdfSource: text("pdf_source"),
  tomadorNome: text("tomador_nome"),
  tomadorDoc: text("tomador_doc"),
  valor: real("valor"),
  competencia: text("competencia"),
  discriminacao: text("discriminacao"),
  templateId: text("template_id"),
  source: text("source").notNull().default("local"),
  nsu: text("nsu"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const dpsCounter = sqliteTable("dps_counter", {
  serie: text("serie").primaryKey(),
  nextNumber: integer("next_number").notNull().default(1),
});

export const adnState = sqliteTable("adn_state", {
  id: integer("id").primaryKey().default(1),
  ultimoNsu: text("ultimo_nsu").notNull().default("0"),
  lastSyncAt: text("last_sync_at"),
  nextAllowedAt: text("next_allowed_at"),
  lastError: text("last_error"),
  syncing: integer("syncing").notNull().default(0),
});

export const idempotencyKeys = sqliteTable("idempotency_keys", {
  key: text("key").primaryKey(),
  notaId: text("nota_id"),
  status: text("status").notNull().default("pending"),
  responseJson: text("response_json"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const circuitState = sqliteTable("circuit_state", {
  id: integer("id").primaryKey().default(1),
  failures: integer("failures").notNull().default(0),
  openUntil: text("open_until"),
  lastError: text("last_error"),
});
