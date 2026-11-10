import { withApiAuth } from "@/lib/api/http";
import { getNotaPdfBuffer } from "@/lib/nfse/pdf";
import { getNotaByChave } from "@/lib/nfse/provider";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ chave: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return withApiAuth(request, async () => {
    const { chave } = await ctx.params;
    const nota = await getNotaByChave(chave, false);
    if (!nota) {
      return Response.json({ error: "Nota não encontrada" }, { status: 404 });
    }

    // Garante XML em disco/DB antes de gerar PDF
    if (!nota.xmlNfse && !nota.hasXml) {
      await getNotaByChave(chave, true);
    }

    const { buffer, source } = await getNotaPdfBuffer(chave);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nfse-${chave}.pdf"`,
        "X-Pdf-Source": source,
        "Cache-Control": "private, max-age=3600",
      },
    });
  });
}
