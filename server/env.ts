import { config } from "dotenv";

// Load local env BEFORE any module that reads process.env (db, auth secret).
// Imported first in server/ws.ts so this runs before db/index.ts is evaluated.
config({ path: ".env.local" });
