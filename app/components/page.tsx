import { redirect } from "next/navigation";

// The component list lives on the Eligibility page; component detail stays at /components/[id].
export default function ComponentsPage() {
  redirect("/eligibility");
}
