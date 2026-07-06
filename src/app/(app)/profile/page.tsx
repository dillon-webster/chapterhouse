import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfileData } from "@/lib/profile";
import { ProfileView } from "@/components/ProfileView";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ThemePicker } from "@/components/ThemePicker";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const data = await getProfileData(session.user.id);
  if (!data) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex justify-end">
        <ProfileEditor displayName={data.user.displayName} bio={data.user.bio} />
      </div>
      <ProfileView data={data} />
      <ThemePicker current={data.user.theme} />
    </div>
  );
}
