import { ClientRedirect } from "@/components/shell/client-redirect";

// The component list lives on the Eligibility page; component detail stays at /components/[id].
export default function ComponentsPage() {
  return <ClientRedirect to="/eligibility" />;
}
