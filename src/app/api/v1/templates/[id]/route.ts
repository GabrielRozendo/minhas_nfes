import { withApiAuth, json } from "@/lib/api/http";
import { getTemplate, updateTemplate } from "@/lib/nfse/provider";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return withApiAuth(request, async () => {
    const { id } = await ctx.params;
    const tpl = getTemplate(id);
    if (!tpl) return json({ error: "Template não encontrado" }, 404);
    return json(tpl);
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  return withApiAuth(request, async () => {
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      fixedPayload?: Record<string, unknown>;
      paramSchema?: Record<string, unknown>;
    };
    const tpl = updateTemplate(id, body);
    if (!tpl) return json({ error: "Template não encontrado" }, 404);
    return json(tpl);
  });
}
