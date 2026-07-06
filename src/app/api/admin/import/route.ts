import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { importBooks } from "@/lib/importBooks";

export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await importBooks();
  return NextResponse.json(result);
}
