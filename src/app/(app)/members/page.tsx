import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const session = await auth();

  const users = await prisma.user.findMany({
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      shelfEntries: {
        where: { status: "CURRENTLY_READING" },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { book: { select: { title: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-5 text-xl font-bold text-ink">Members</h1>
      <ul className="space-y-2">
        {users.map((u) => {
          const isSelf = u.id === session?.user?.id;
          const reading = u.shelfEntries[0]?.book.title;
          return (
            <li key={u.id}>
              <Link
                href={isSelf ? "/profile" : `/u/${u.username}`}
                className="flex items-center gap-3 rounded-lg border border-accent/15 bg-surface/40 px-3 py-3 transition-colors hover:border-accent/40"
              >
                <Avatar
                  userId={u.id}
                  name={u.displayName}
                  hasAvatar={!!u.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {u.displayName}
                    {isSelf && <span className="ml-1.5 text-xs font-normal text-ink/40">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-ink/50">
                    {reading ? (
                      <>
                        Reading <span className="italic">{reading}</span>
                      </>
                    ) : (
                      "Not reading anything right now"
                    )}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
