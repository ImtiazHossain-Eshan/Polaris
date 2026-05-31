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

/** Update mutable account fields (name / password hash). */
export async function updateUser(
  userId: string,
  fields: Partial<Pick<DbUser, "name" | "password">>,
) {
  const db = await getDb();
  await db
    .collection<DbUser>("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: fields });
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

/* ─── Admin ─── */

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: Plan;
  createdAt: Date;
};

export async function listUsers(): Promise<AdminUserRow[]> {
  const db = await getDb();
  const users = await db
    .collection<DbUser>("users")
    .find({}, { projection: { password: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  return users.map((u) => ({
    id: u._id!.toString(),
    name: u.name,
    email: u.email,
    role: u.role ?? "student",
    plan: u.plan ?? "free",
    createdAt: u.createdAt,
  }));
}

/** Delete a user and all their associated data. */
export async function deleteUserCascade(userId: string) {
  const db = await getDb();
  if (!ObjectId.isValid(userId)) return;
  await Promise.all([
    db.collection("users").deleteOne({ _id: new ObjectId(userId) }),
    db.collection("profiles").deleteMany({ userId }),
    db.collection("roadmaps").deleteMany({ userId }),
    db.collection("links").deleteMany({ studentId: userId }),
  ]);
}

export async function getPlatformStats() {
  const db = await getDb();
  const users = db.collection<DbUser>("users");
  const [
    totalUsers,
    free,
    pro,
    elite,
    students,
    parents,
    partners,
    admins,
    roadmaps,
    links,
    profiles,
  ] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ plan: "free" }),
    users.countDocuments({ plan: "pro" }),
    users.countDocuments({ plan: "elite" }),
    users.countDocuments({ role: "student" }),
    users.countDocuments({ role: "parent" }),
    users.countDocuments({ role: "partner" }),
    users.countDocuments({ role: "admin" }),
    db.collection("roadmaps").countDocuments({}),
    db.collection("links").countDocuments({}),
    db.collection("profiles").countDocuments({}),
  ]);
  return {
    totalUsers,
    plans: { free, pro, elite },
    roles: { student: students, parent: parents, partner: partners, admin: admins },
    roadmaps,
    links,
    profiles,
  };
}

export type AdminRoadmapRow = {
  id: string;
  userId: string;
  userEmail: string;
  version: number;
  source: string;
  milestones: number;
  done: number;
  summary: string;
  createdAt: Date;
};

export async function listRoadmaps(): Promise<AdminRoadmapRow[]> {
  const db = await getDb();
  const roadmaps = await db
    .collection<DbRoadmap>("roadmaps")
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  // Resolve emails in one batch.
  const userIds = [...new Set(roadmaps.map((r) => r.userId))].filter((id) =>
    ObjectId.isValid(id),
  );
  const users = await db
    .collection<DbUser>("users")
    .find(
      { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
      { projection: { email: 1 } },
    )
    .toArray();
  const emailById = new Map(users.map((u) => [u._id!.toString(), u.email]));

  return roadmaps.map((r) => ({
    id: r._id!.toString(),
    userId: r.userId,
    userEmail: emailById.get(r.userId) ?? "(unknown)",
    version: r.version,
    source: r.source,
    milestones: r.roadmap.milestones.length,
    done: r.roadmap.milestones.filter((m) => m.status === "done").length,
    summary: r.roadmap.summary,
    createdAt: r.createdAt,
  }));
}

export async function deleteRoadmap(roadmapId: string) {
  const db = await getDb();
  if (!ObjectId.isValid(roadmapId)) return;
  await db.collection("roadmaps").deleteOne({ _id: new ObjectId(roadmapId) });
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
