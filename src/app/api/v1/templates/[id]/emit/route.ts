import { withApiAuth, json, requireIdempotencyKey } from "@/lib/api/http";
import { emitNota } from "@/lib/nfse/provider";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  return withApiAuth(request, async () => {
    const { id } = await ctx.params;
    const idempotencyKey = requireIdempotencyKey(request);
    const body = (await request.json().catch(() => ({}))) as {
      params?: Record<string, unknown>;
      dryRun?: boolean;
    };

    const result = await emitNota({
      idempotencyKey,
      templateId: id,
      params: body.params,
      dryRun: body.dryRun,
    });

    return json(result, 201);
  });
}
