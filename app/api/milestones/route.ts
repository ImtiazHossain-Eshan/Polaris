import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateMilestoneStatus, setMilestoneDeadline, type MilestoneStatus } from "@/lib/db/collections";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { milestoneId, status, deadline } = await req.json();

  if (!milestoneId) {
    return NextResponse.json({ error: "Missing milestoneId" }, { status: 400 });
  }

  if (status) {
    const valid: MilestoneStatus[] = ["pending", "in-progress", "done"];
    if (!valid.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await updateMilestoneStatus(userId, milestoneId, status);
  }

  if (deadline !== undefined) {
    await setMilestoneDeadline(userId, milestoneId, deadline);
  }

  return NextResponse.json({ ok: true });
}
