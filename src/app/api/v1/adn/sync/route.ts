import { withApiAuth, json } from "@/lib/api/http";
import { getAdnStatus, syncAdn } from "@/lib/nfse/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiAuth(request, async () => json(getAdnStatus()));
}

export async function POST(request: Request) {
  return withApiAuth(request, async () => json(await syncAdn()));
}
