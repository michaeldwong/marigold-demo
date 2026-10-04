import { SupplyChainExplorer } from "@/components/supply-chain/explorer";

type SP = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SupplyChainPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <SupplyChainExplorer componentId={one(sp.component)} bomId={one(sp.bom)} />;
}
