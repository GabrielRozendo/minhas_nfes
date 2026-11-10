import { withApiAuth, json } from "@/lib/api/http";
import { createTemplate, listTemplates } from "@/lib/nfse/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiAuth(request, async () => json({ items: listTemplates() }));
}

export async function POST(request: Request) {
  return withApiAuth(request, async () => {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      fixedPayload?: Record<string, unknown>;
      fixed_payload?: Record<string, unknown>;
      paramSchema?: Record<string, unknown>;
      param_schema?: Record<string, unknown>;
    };

    if (!body.name?.trim()) {
      return json({ error: "name é obrigatório" }, 400);
    }
    const fixedPayload = body.fixedPayload ?? body.fixed_payload;
    if (!fixedPayload || typeof fixedPayload !== "object") {
      return json({ error: "fixedPayload é obrigatório" }, 400);
    }

    const tpl = createTemplate({
      name: body.name.trim(),
      description: body.description,
      fixedPayload,
      paramSchema: body.paramSchema ?? body.param_schema,
    });
    return json(tpl, 201);
  });
}
