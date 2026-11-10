import { TemplatesClient } from "@/components/TemplatesClient";
import { listTemplates } from "@/lib/nfse/provider";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  return <TemplatesClient initialItems={listTemplates()} />;
}
