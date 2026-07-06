import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SignupForm } from "@/components/SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const users = await prisma.user.count();
  if (users === 0) redirect("/setup");

  return <SignupForm />;
}
