import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

declare global {
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

/**
 * Reuse one postgres-js pool across hot reloads in dev to avoid exhausting
 * connections. `max` is intentionally modest for local development.
 */
const client =
  global.__pgClient ??
  postgres(connectionString, { max: 10, prepare: false });

if (process.env.NODE_ENV !== "production") {
  global.__pgClient = client;
}

export const db = drizzle(client, { schema });
export { client, schema };
export type DB = typeof db;
