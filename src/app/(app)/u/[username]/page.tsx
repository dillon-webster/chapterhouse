import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProfileData } from "@/lib/profile";
import { ProfileView } from "@/components/ProfileView";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await auth();
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!user) notFound();

  // Your own profile lives at /profile (where you can edit it).
  if (session?.user?.id === user.id) redirect("/profile");

  const data = await getProfileData(user.id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ProfileView data={data} />
    </div>
  );
}
