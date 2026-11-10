import { TemplatesClient } from "@/components/TemplatesClient";
import { getEnv } from "@/lib/config/env";
import { listTemplates } from "@/lib/nfse/provider";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const env = getEnv();
  return (
    <TemplatesClient
      initialItems={listTemplates()}
      defaultMunicipio={env.CODIGO_MUNICIPIO}
      prestadorDoc={env.CPFCNPJ_PRESTADOR}
      prestadorIm={env.INSCRICAO_MUNICIPAL}
    />
  );
}
