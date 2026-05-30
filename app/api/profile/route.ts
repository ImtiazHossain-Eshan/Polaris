import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { upsertProfile, getProfile } from "@/lib/db/collections";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const profile = await getProfile(userId);
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { profile } = await req.json();
  if (!profile) {
    return NextResponse.json({ error: "Missing profile" }, { status: 400 });
  }
  await upsertProfile(userId, profile);
  return NextResponse.json({ ok: true });
}
