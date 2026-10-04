import { Suspense } from "react";
import { SupplyChainRoute } from "@/components/supply-chain/explorer";

export default function SupplyChainPage() {
  return (
    <Suspense>
      <SupplyChainRoute />
    </Suspense>
  );
}
