import { withApiAuth, json } from "@/lib/api/http";
import { getNotaByChave } from "@/lib/nfse/provider";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ chave: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return withApiAuth(request, async () => {
    const { chave } = await ctx.params;
    const url = new URL(request.url);
    const fetchRemote = url.searchParams.get("remote") === "1";
    const nota = await getNotaByChave(chave, fetchRemote);
    if (!nota) return json({ error: "Nota não encontrada" }, 404);
    return json(nota);
  });
}
