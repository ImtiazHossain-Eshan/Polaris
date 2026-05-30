import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";
import type { StudentProfile } from "@/lib/profile";
import type { RoadmapMilestone, RoadmapResponse } from "@/lib/llm/gemini";

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
