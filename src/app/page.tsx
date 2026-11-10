import { NotasClient } from "@/components/NotasClient";
import { getAdnStatus, listNotas } from "@/lib/nfse/provider";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [items, adn] = await Promise.all([listNotas({ limit: 200 }), Promise.resolve(getAdnStatus())]);
  return <NotasClient initialItems={items} adn={adn} />;
}
