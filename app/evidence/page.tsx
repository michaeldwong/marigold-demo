import { Suspense } from "react";
import { EvidenceRoute } from "@/components/evidence/evidence-page";

export default function Evidence() {
  return (
    <Suspense>
      <EvidenceRoute />
    </Suspense>
  );
}
