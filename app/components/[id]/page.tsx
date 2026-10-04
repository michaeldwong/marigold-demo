import { ComponentWorkspace } from "@/components/eligibility/component-workspace";

export default async function ComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ComponentWorkspace id={id} />;
}
