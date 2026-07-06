import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "@/components/SetupForm";

export const dynamic = "force-dynamic";

// First-run wizard: shown only while the instance has zero users; the API
// enforces the same guard, so this page is safe even if reached stale.
export default async function SetupPage() {
  const users = await prisma.user.count();
  if (users > 0) redirect("/login");

  return <SetupForm />;
}
