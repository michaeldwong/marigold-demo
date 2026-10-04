import { EvidencePage } from "@/components/evidence/evidence-page";

type SP = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Evidence({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <EvidencePage initialStatus={one(sp.status)} initialTab={one(sp.tab)} />;
}
