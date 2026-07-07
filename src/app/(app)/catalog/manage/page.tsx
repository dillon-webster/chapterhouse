import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SeriesManager } from "@/components/SeriesManager";

export const dynamic = "force-dynamic";

// Admin-only screen for organizing the catalog into series. EPUBs carry no
// series metadata, so this is where an admin assigns it — in bulk, with a
// title-parsing assist.
export default async function ManageCatalogPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/catalog");

  const books = await prisma.book.findMany({
    where: { source: "EPUB" },
    select: { id: true, title: true, author: true, series: true, seriesIndex: true },
    orderBy: { title: "asc" },
  });

  return <SeriesManager books={books} />;
}
