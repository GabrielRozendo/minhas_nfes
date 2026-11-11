import { EmitirClient } from "@/components/EmitirClient";
import { getEnv } from "@/lib/config/env";
import { duplicateNotaDraft, listTemplates } from "@/lib/nfse/provider";

export const dynamic = "force-dynamic";

export default async function EmitirPage({
  searchParams,
}: {
  searchParams: Promise<{
    duplicar?: string;
    template?: string;
    modo?: string;
  }>;
}) {
  const sp = await searchParams;
  const env = getEnv();
  const templates = listTemplates();
  const draft = sp.duplicar ? duplicateNotaDraft(sp.duplicar) : null;
  const initialMode = sp.modo === "avulsa" ? "avulsa" : undefined;
  return (
    <EmitirClient
      templates={templates}
      draft={draft}
      initialTemplateId={sp.template}
      initialMode={initialMode}
      defaultMunicipio={env.CODIGO_MUNICIPIO}
      prestadorDoc={env.CPFCNPJ_PRESTADOR}
      prestadorIm={env.INSCRICAO_MUNICIPAL}
    />
  );
}
