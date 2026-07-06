import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecentActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// Polled by the dashboard's ActivityFeed to refresh the global feed live.
export async function GET() {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const events = await getRecentActivity(15);
  return NextResponse.json({ events });
}
