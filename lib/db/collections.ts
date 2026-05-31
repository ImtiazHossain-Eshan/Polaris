import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";
import type { StudentProfile } from "@/lib/profile";
import type { RoadmapMilestone, RoadmapResponse } from "@/lib/llm/gemini";

export type UserRole = "student" | "parent" | "partner" | "admin";
export type Plan = "free" | "pro" | "elite";

export type Subscription = {
  lsCustomerId?: string;
  lsSubscriptionId?: string;
  variantId?: string;
  status?: string; // active, cancelled, expired, past_due, etc.
  renewsAt?: string;
};

export type DbUser = {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  plan: Plan;
  subscription?: Subscription;
  createdAt: Date;
};

export type DbProfile = StudentProfile & {
  _id?: ObjectId;
  userId: string;
  updatedAt: Date;
};

export type MilestoneStatus = "pending" | "in-progress" | "done";

export type DbMilestone = RoadmapMilestone & {
  id: string;
  status: MilestoneStatus;
  completedAt?: Date;
  deadline?: string;
};

export type DbRoadmap = {
  _id?: ObjectId;
  userId: string;
  roadmap: Omit<RoadmapResponse, "milestones"> & { milestones: DbMilestone[] };
  retrieved: Array<{ id: string; title: string; source: string; score: number }>;
  source: "gemini" | "fallback";
  version: number;
  createdAt: Date;
};

function milestoneId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function toDbMilestones(milestones: RoadmapMilestone[]): DbMilestone[] {
  return milestones.map((m) => ({
    ...m,
    id: milestoneId(),
    status: "pending" as MilestoneStatus,
  }));
}

export async function upsertProfile(userId: string, profile: StudentProfile) {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...safeProfile } = profile as StudentProfile & { _id?: unknown };
  await db.collection<DbProfile>("profiles").updateOne(
    { userId },
    { $set: { ...safeProfile, userId, updatedAt: new Date() } },
    { upsert: true },
  );
}

export async function getProfile(userId: string): Promise<DbProfile | null> {
  const db = await getDb();
  return db.collection<DbProfile>("profiles").findOne({ userId });
}

export async function saveRoadmap(userId: string, data: Omit<DbRoadmap, "_id" | "userId" | "version" | "createdAt">) {
  const db = await getDb();
  const existing = await db.collection<DbRoadmap>("roadmaps").findOne(
    { userId },
    { sort: { version: -1 }, projection: { version: 1 } },
  );
  const version = existing ? existing.version + 1 : 1;
  await db.collection<DbRoadmap>("roadmaps").insertOne({
    ...data,
    userId,
    version,
    createdAt: new Date(),
  });
}

export async function getLatestRoadmap(userId: string): Promise<DbRoadmap | null> {
  const db = await getDb();
  return db.collection<DbRoadmap>("roadmaps").findOne(
    { userId },
    { sort: { version: -1 } },
  );
}

export async function updateMilestoneStatus(
  userId: string,
  milestoneId: string,
  status: MilestoneStatus,
) {
  const db = await getDb();
  const update: Record<string, unknown> = {
    "roadmap.milestones.$.status": status,
  };
  if (status === "done") {
    update["roadmap.milestones.$.completedAt"] = new Date();
  }
  await db.collection<DbRoadmap>("roadmaps").updateOne(
    { userId, "roadmap.milestones.id": milestoneId },
    { $set: update },
    { sort: { version: -1 } } as any,
  );
}

export async function setMilestoneDeadline(
  userId: string,
  milestoneId: string,
  deadline: string,
) {
  const db = await getDb();
  await db.collection<DbRoadmap>("roadmaps").updateOne(
    { userId, "roadmap.milestones.id": milestoneId },
    { $set: { "roadmap.milestones.$.deadline": deadline } },
    { sort: { version: -1 } } as any,
  );
}

/* ─── Users ─── */

export async function getUserById(userId: string): Promise<DbUser | null> {
  const db = await getDb();
  if (!ObjectId.isValid(userId)) return null;
  return db.collection<DbUser>("users").findOne({ _id: new ObjectId(userId) });
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const db = await getDb();
  return db.collection<DbUser>("users").findOne({ email: email.toLowerCase() });
}

export async function setUserPlan(
  userId: string,
  plan: Plan,
  subscription?: Subscription,
) {
  const db = await getDb();
  const update: Record<string, unknown> = { plan };
  if (subscription) update.subscription = subscription;
  await db
    .collection<DbUser>("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: update });
}

export async function setUserRole(userId: string, role: UserRole) {
  const db = await getDb();
  await db
    .collection<DbUser>("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: { role } });
}

/** Find a user by their LemonSqueezy subscription id (for update/cancel webhooks). */
export async function getUserBySubscriptionId(
  lsSubscriptionId: string,
): Promise<DbUser | null> {
  const db = await getDb();
  return db
    .collection<DbUser>("users")
    .findOne({ "subscription.lsSubscriptionId": lsSubscriptionId });
}

/* ─── Parent/partner links ─── */

export type LinkRelationship = "parent" | "partner";
export type LinkStatus = "pending" | "accepted";

export type DbLink = {
  _id?: ObjectId;
  studentId: string;
  studentName?: string;
  viewerEmail: string;
  viewerId?: string;
  relationship: LinkRelationship;
  status: LinkStatus;
  inviteToken: string;
  createdAt: Date;
  acceptedAt?: Date;
};

function token(): string {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

export async function createLink(
  studentId: string,
  studentName: string | undefined,
  viewerEmail: string,
  relationship: LinkRelationship,
): Promise<DbLink> {
  const db = await getDb();
  const link: DbLink = {
    studentId,
    studentName,
    viewerEmail: viewerEmail.toLowerCase(),
    relationship,
    status: "pending",
    inviteToken: token(),
    createdAt: new Date(),
  };
  await db.collection<DbLink>("links").insertOne(link);
  return link;
}

export async function getLinksForStudent(studentId: string): Promise<DbLink[]> {
  const db = await getDb();
  return db.collection<DbLink>("links").find({ studentId }).toArray();
}

/** Accepted links where this user is the viewer (parent/partner side). */
export async function getLinksForViewer(
  viewerEmail: string,
): Promise<DbLink[]> {
  const db = await getDb();
  return db
    .collection<DbLink>("links")
    .find({ viewerEmail: viewerEmail.toLowerCase(), status: "accepted" })
    .toArray();
}

export async function acceptLink(
  inviteToken: string,
  viewerId: string,
  viewerEmail: string,
): Promise<boolean> {
  const db = await getDb();
  const res = await db.collection<DbLink>("links").updateOne(
    { inviteToken, viewerEmail: viewerEmail.toLowerCase(), status: "pending" },
    { $set: { status: "accepted", viewerId, acceptedAt: new Date() } },
  );
  return res.modifiedCount > 0;
}
