import { EmitirClient } from "@/components/EmitirClient";
import { duplicateNotaDraft, listTemplates } from "@/lib/nfse/provider";

export const dynamic = "force-dynamic";

export default async function EmitirPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicar?: string }>;
}) {
  const sp = await searchParams;
  const templates = listTemplates();
  const draft = sp.duplicar ? duplicateNotaDraft(sp.duplicar) : null;
  return <EmitirClient templates={templates} draft={draft} />;
}
