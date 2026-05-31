import type { Db } from "mongodb";

/**
 * Idempotent index creation. Runs once per process (guarded by a global flag).
 * createIndex is a no-op if the index already exists, so this is safe to call
 * on every cold start.
 */

let ensured = false;

export async function ensureIndexes(db: Db): Promise<void> {
  if (ensured) return;
  ensured = true;

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("profiles").createIndex({ userId: 1 }, { unique: true }),
    db.collection("roadmaps").createIndex({ userId: 1, version: -1 }),
    db.collection("links").createIndex({ studentId: 1 }),
    db.collection("links").createIndex({ viewerEmail: 1 }),
    db.collection("links").createIndex({ inviteToken: 1 }, { unique: true }),
  ]).catch((err) => {
    // Don't crash the app if index creation races; log and continue.
    console.error("[db] ensureIndexes failed:", err);
    ensured = false;
  });
}
