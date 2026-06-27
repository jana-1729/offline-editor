// @vitest-environment node
import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { POST } from "@/app/api/register/route";
import { asService } from "@/lib/db/rls";
import { db, client } from "@/lib/db";
import { users } from "@/lib/db/schema";

const email = `reg_${Date.now()}@test.dev`;

function req(body: unknown) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  await asService((tx) => tx.delete(users).where(eq(users.email, email)));
  await client.end({ timeout: 5 });
});

describe("POST /api/register", () => {
  it("creates a user on valid input", async () => {
    const res = await POST(req({ name: "Reg", email, password: "supersecret" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.user.email).toBe(email);
    expect(json.user).not.toHaveProperty("passwordHash");
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await POST(req({ name: "Reg2", email, password: "supersecret" }));
    expect(res.status).toBe(409);
  });

  it("rejects invalid input with 422", async () => {
    const res = await POST(req({ name: "X", email: "bad", password: "x" }));
    expect(res.status).toBe(422);
  });

  it("stores a hashed password, never plaintext", async () => {
    const [row] = await asService((tx) =>
      tx.select().from(users).where(eq(users.email, email)).limit(1),
    );
    expect(row.passwordHash).not.toBe("supersecret");
    expect(row.passwordHash.length).toBeGreaterThan(20);
  });
});

// touch db import so it is initialised for the suite
void db;
