import { ComponentWorkspace } from "@/components/eligibility/component-workspace";
import { seedDataset } from "@/lib/data/mock-manufacturer";

// Pre-render every component page so the site can be exported as static files.
export const dynamicParams = false;

export function generateStaticParams() {
  return seedDataset.components.map((c) => ({ id: c.id }));
}

export default async function ComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ComponentWorkspace id={id} />;
}
