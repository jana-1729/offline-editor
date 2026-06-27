import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Load local env so integration tests can reach Postgres.
config({ path: ".env.local" });

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // Integration tests that hit Postgres live under tests/integration and are
    // opt-in (they require a running DB). Unit tests run everywhere.
    include: ["lib/**/*.test.ts", "server/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
