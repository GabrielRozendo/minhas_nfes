import { withApiAuth, json } from "@/lib/api/http";
import { getSystemStatus } from "@/lib/nfse/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiAuth(request, async () => json(getSystemStatus()));
}
