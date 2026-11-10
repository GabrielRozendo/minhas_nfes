import { withApiAuth, json } from "@/lib/api/http";
import { ensureNotaArtifacts } from "@/lib/nfse/pdf";
import { getNotaByChave } from "@/lib/nfse/provider";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ chave: string }> };

export async function POST(request: Request, ctx: Ctx) {
  return withApiAuth(request, async () => {
    const { chave } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      generatePdf?: boolean;
    };
    let nota = await getNotaByChave(chave, false);
    if (!nota) return json({ error: "Nota não encontrada" }, 404);

    if (!nota.xmlNfse && !nota.hasXml) {
      nota = await getNotaByChave(chave, true);
    }

    const artifacts = await ensureNotaArtifacts({
      chave,
      xml: nota?.xmlNfse ?? null,
      generatePdf: body.generatePdf !== false,
    });

    return json({
      chave,
      ...artifacts,
      downloadPdfUrl: `/api/v1/notas/${chave}/pdf`,
    });
  });
}
