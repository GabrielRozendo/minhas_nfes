import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "@/lib/config/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __nfseDb: ReturnType<typeof createDb> | undefined;
}

function migrate(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      fixed_payload TEXT NOT NULL,
      param_schema TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notas (
      id TEXT PRIMARY KEY,
      chave_acesso TEXT,
      dps_id TEXT,
      numero_dps TEXT,
      serie TEXT,
      status TEXT NOT NULL DEFAULT 'autorizada',
      ambiente TEXT NOT NULL,
      payload_enviado TEXT,
      xml_nfse TEXT,
      xml_path TEXT,
      pdf_path TEXT,
      pdf_source TEXT,
      tomador_nome TEXT,
      tomador_doc TEXT,
      valor REAL,
      competencia TEXT,
      discriminacao TEXT,
      template_id TEXT,
      source TEXT NOT NULL DEFAULT 'local',
      nsu TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notas_chave ON notas(chave_acesso);
    CREATE INDEX IF NOT EXISTS idx_notas_created ON notas(created_at);

    CREATE TABLE IF NOT EXISTS dps_counter (
      serie TEXT PRIMARY KEY,
      next_number INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS adn_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      ultimo_nsu TEXT NOT NULL DEFAULT '0',
      last_sync_at TEXT,
      next_allowed_at TEXT,
      last_error TEXT,
      syncing INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO adn_state (id, ultimo_nsu) VALUES (1, '0');

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      nota_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      response_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS circuit_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      failures INTEGER NOT NULL DEFAULT 0,
      open_until TEXT,
      last_error TEXT
    );

    INSERT OR IGNORE INTO circuit_state (id, failures) VALUES (1, 0);
  `);

  const cols = sqlite.prepare(`PRAGMA table_info(notas)`).all() as Array<{
    name: string;
  }>;
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("xml_path")) sqlite.exec(`ALTER TABLE notas ADD COLUMN xml_path TEXT`);
  if (!names.has("pdf_path")) sqlite.exec(`ALTER TABLE notas ADD COLUMN pdf_path TEXT`);
  if (!names.has("pdf_source"))
    sqlite.exec(`ALTER TABLE notas ADD COLUMN pdf_source TEXT`);
}

function createDb() {
  const env = getEnv();
  const dbPath = path.resolve(env.DATABASE_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  migrate(sqlite);

  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!globalThis.__nfseDb) {
    globalThis.__nfseDb = createDb();
  }
  return globalThis.__nfseDb;
}

export type AppDb = ReturnType<typeof getDb>;
