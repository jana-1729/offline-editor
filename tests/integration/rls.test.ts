// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { client } from "@/lib/db";
import { users, documents, documentMembers } from "@/lib/db/schema";
import { withUser, asService } from "@/lib/db/rls";

/**
 * Tenant-isolation tests. These hit a real Postgres with RLS enabled and the
 * app connecting as the restricted app_user role. They prove that withUser(A)
 * cannot read user B's documents even with a deliberately unscoped query.
 */
const tag = `rls_${Date.now()}`;
let userA: string;
let userB: string;
let docA: string;
let docB: string;

beforeAll(async () => {
  await asService(async (tx) => {
    const [a] = await tx
      .insert(users)
      .values({ email: `${tag}_a@test.dev`, passwordHash: "x", name: "A" })
      .returning();
    const [b] = await tx
      .insert(users)
      .values({ email: `${tag}_b@test.dev`, passwordHash: "x", name: "B" })
      .returning();
    userA = a.id;
    userB = b.id;

    const [dA] = await tx
      .insert(documents)
      .values({ title: "A doc", ownerId: userA })
      .returning();
    const [dB] = await tx
      .insert(documents)
      .values({ title: "B doc", ownerId: userB })
      .returning();
    docA = dA.id;
    docB = dB.id;

    await tx.insert(documentMembers).values([
      { documentId: docA, userId: userA, role: "owner" },
      { documentId: docB, userId: userB, role: "owner" },
    ]);
  });
});

afterAll(async () => {
  await asService(async (tx) => {
    await tx.delete(users).where(eq(users.id, userA));
    await tx.delete(users).where(eq(users.id, userB));
  });
  await client.end({ timeout: 5 });
});

describe("RLS tenant isolation", () => {
  it("A sees only A's documents in an unscoped select", async () => {
    const rows = await withUser(userA, (tx) => tx.select().from(documents));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(docA);
    expect(ids).not.toContain(docB);
  });

  it("B sees only B's documents", async () => {
    const rows = await withUser(userB, (tx) => tx.select().from(documents));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(docB);
    expect(ids).not.toContain(docA);
  });

  it("A cannot fetch B's document by id", async () => {
    const rows = await withUser(userA, (tx) =>
      tx.select().from(documents).where(eq(documents.id, docB)),
    );
    expect(rows).toHaveLength(0);
  });

  it("A cannot see B's user row (no shared document)", async () => {
    const rows = await withUser(userA, (tx) =>
      tx.select().from(users).where(eq(users.id, userB)),
    );
    expect(rows).toHaveLength(0);
  });

  it("service role bypasses RLS and sees both documents", async () => {
    const rows = await asService((tx) => tx.select().from(documents));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(docA);
    expect(ids).toContain(docB);
  });
});
