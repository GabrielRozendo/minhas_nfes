import { withApiAuth, json } from "@/lib/api/http";
import { createTemplateFromNota } from "@/lib/nfse/provider";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ chave: string }> };

export async function POST(request: Request, ctx: Ctx) {
  return withApiAuth(request, async () => {
    const { chave } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
    };

    try {
      const tpl = createTemplateFromNota(chave, {
        name: body.name,
        description: body.description,
      });
      return json(tpl, 201);
    } catch (error) {
      const status =
        (error as Error & { status?: number }).status ?? 500;
      return json(
        {
          error:
            error instanceof Error ? error.message : "Falha ao criar template",
        },
        status,
      );
    }
  });
}
