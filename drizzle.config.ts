import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations run as the admin/owner role; the app runs as the restricted
    // app_user role so RLS is enforced at runtime.
    url:
      process.env.DATABASE_ADMIN_URL ??
      process.env.DATABASE_URL ??
      "postgres://localhost:5432/synced_docs",
  },
  // Postgres extensions/policies are managed manually in migrations.
  verbose: true,
  strict: true,
});
