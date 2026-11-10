import { withApiAuth, json, requireIdempotencyKey } from "@/lib/api/http";
import { emitNota, listNotas } from "@/lib/nfse/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiAuth(request, async () => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? "100");
    return json({ items: await listNotas({ q, status, limit }) });
  });
}

export async function POST(request: Request) {
  return withApiAuth(request, async () => {
    const idempotencyKey = requireIdempotencyKey(request);
    const body = (await request.json()) as {
      template_id?: string;
      templateId?: string;
      params?: Record<string, unknown>;
      fixedPayload?: Record<string, unknown>;
      dryRun?: boolean;
    };

    const result = await emitNota({
      idempotencyKey,
      templateId: body.template_id ?? body.templateId,
      params: body.params,
      fixedPayload: body.fixedPayload,
      dryRun: body.dryRun,
    });

    return json(result, 201);
  });
}
