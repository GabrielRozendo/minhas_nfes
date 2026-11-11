/**
 * One-shot: cria o template Transfacil a partir do XML anexo da NFS-e.
 *
 * Uso:
 *   npx tsx scripts/seed-transfacil.ts [caminho-xml]
 */
import fs from "node:fs";
import path from "node:path";

// Prefer local SQLite when .env aponta para path Docker (/data/...).
if (
  !process.env.DATABASE_PATH ||
  process.env.DATABASE_PATH.startsWith("/data")
) {
  process.env.DATABASE_PATH = path.resolve("data/nfse.db");
}

async function main() {
  const { createTemplateFromXml, listTemplates } = await import(
    "../src/lib/nfse/provider"
  );

  const DEFAULT_XML = path.resolve(
    process.env.HOME || "",
    ".cursor/projects/Users-rozendo-Projects-minhas-nfes/attachments/b157c1a2-6c16-42f6-b0ef-848dd543762f/2026-11_Transfacil_NF_001.xml",
  );

  const xmlPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_XML;

  if (!fs.existsSync(xmlPath)) {
    console.error(`XML não encontrado: ${xmlPath}`);
    process.exit(1);
  }

  const name = "Transfacil — BHBUS+";
  const existing = listTemplates().find((t) => t.name === name);
  if (existing) {
    console.log(`Template já existe: ${existing.id} (${existing.name})`);
    process.exit(0);
  }

  const xml = fs.readFileSync(xmlPath, "utf-8");
  const tpl = createTemplateFromXml(xml, {
    name,
    description:
      "Consórcio Transfacil / BHBUS+ — serviço 010301, NBS 115090000, IBS/CBS, SN sem alíquota ISS",
  });

  console.log("Template criado:");
  console.log("  id  :", tpl?.id);
  console.log("  name:", tpl?.name);
  const inf = (tpl?.fixedPayload as { infDps?: Record<string, unknown> })
    ?.infDps;
  console.log("  fixed keys:", Object.keys(inf ?? {}).join(", "));
  const servico = inf?.servico as Record<string, unknown> | undefined;
  const codigo = servico?.codigoServico as Record<string, unknown> | undefined;
  console.log("  cServTribNac:", codigo?.cServTribNac);
  console.log("  cServMun:", codigo?.cServMun);
  console.log("  cNBSPrinc:", codigo?.cNBSPrinc);
  const trib = inf?.tributacao as Record<string, unknown> | undefined;
  const issqn = trib?.issqn as Record<string, unknown> | undefined;
  console.log("  aliquota ISS:", issqn?.aliquota ?? "(omitida)");
  console.log("  pTotTribSN:", trib?.percentualTotalTributosSN);
  console.log("  ibsCbs:", inf?.ibsCbs ? "sim" : "não");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
