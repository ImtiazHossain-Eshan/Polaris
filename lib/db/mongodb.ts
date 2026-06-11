import { MongoClient } from "mongodb";
import { ensureIndexes } from "./indexes";

let clientPromise: Promise<MongoClient> | undefined;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Lazily create (and cache) the Mongo connection on first use. The client
 * must NOT be constructed at module scope: Next evaluates route modules at
 * build time ("Collecting page data"), and a missing MONGODB_URI would crash
 * the whole build inside the driver's connection-string parser instead of
 * surfacing as a clear runtime error.
 */
function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (local) or the project's environment variables (Vercel).",
    );
  }

  if (process.env.NODE_ENV === "development") {
    // Reuse the connection across HMR reloads in dev.
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  const db = client.db("polaris");
  await ensureIndexes(db);
  return db;
}
