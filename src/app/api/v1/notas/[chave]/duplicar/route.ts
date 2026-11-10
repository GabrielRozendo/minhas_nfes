import { withApiAuth, json } from "@/lib/api/http";
import { duplicateNotaDraft } from "@/lib/nfse/provider";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ chave: string }> };

export async function POST(request: Request, ctx: Ctx) {
  return withApiAuth(request, async () => {
    const { chave } = await ctx.params;
    const draft = duplicateNotaDraft(chave);
    if (!draft) return json({ error: "Nota não encontrada" }, 404);
    return json(draft);
  });
}
