import { auth } from "@/auth";
import { SignOutButton } from "./SignOutButton";
import { NavDrawer } from "./NavDrawer";
import { APP_VERSION } from "@/lib/version";

export async function NavShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const displayName = session?.user?.name ?? "Reader";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-accent/20 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <NavDrawer />
            <span className="text-lg font-bold text-accent-dark">Chapterhouse</span>
            <span className="text-[11px] font-semibold text-ink/40">{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-paper">
              {initials}
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
