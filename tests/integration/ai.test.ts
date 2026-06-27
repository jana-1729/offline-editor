// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  session: null as { user: { id: string; name: string; email: string } } | null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => h.session }));

import { POST } from "@/app/api/ai/route";
import { buildPrompt, aiAvailable } from "@/lib/ai/gemini";

function req(body: unknown) {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  h.session = null;
});

describe("POST /api/ai", () => {
  it("requires authentication", async () => {
    h.session = null;
    vi.stubEnv("GOOGLE_API_KEY", "k");
    const res = await POST(req({ action: "summarize", text: "hi" }));
    expect(res.status).toBe(401);
  });

  it("returns 503 with a friendly message when no key is configured", async () => {
    h.session = { user: { id: "u", name: "U", email: "u@t.dev" } };
    vi.stubEnv("GOOGLE_API_KEY", "");
    const res = await POST(req({ action: "summarize", text: "hi" }));
    expect(res.status).toBe(503);
    const j = await res.json();
    expect(j.error).toMatch(/not configured/i);
  });

  it("validates the action with 422", async () => {
    h.session = { user: { id: "u", name: "U", email: "u@t.dev" } };
    vi.stubEnv("GOOGLE_API_KEY", "test-key");
    const res = await POST(req({ action: "destroy", text: "hi" }));
    expect(res.status).toBe(422);
  });
});

describe("buildPrompt", () => {
  it("embeds the source text", () => {
    expect(buildPrompt("summarize", "hello world")).toContain("hello world");
    expect(buildPrompt("improve", "x")).toMatch(/improve/i);
    expect(buildPrompt("suggestTitle", "x")).toMatch(/title/i);
  });

  it("aiAvailable reflects the env key", () => {
    vi.stubEnv("GOOGLE_API_KEY", "");
    expect(aiAvailable()).toBe(false);
    vi.stubEnv("GOOGLE_API_KEY", "abc");
    expect(aiAvailable()).toBe(true);
  });
});
