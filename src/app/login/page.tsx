import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

// A brand-new instance has no accounts to sign in to — send the first visitor
// to the setup wizard instead.
export default async function LoginPage() {
  const users = await prisma.user.count();
  if (users === 0) redirect("/setup");

  return <LoginForm />;
}
