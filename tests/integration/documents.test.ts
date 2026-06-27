// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock the auth module so route handlers see a controllable session.
const h = vi.hoisted(() => ({
  session: null as { user: { id: string; name: string; email: string } } | null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => h.session }));

import { asService } from "@/lib/db/rls";
import { db, client } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { POST as createDoc, GET as listDocs } from "@/app/api/documents/route";
import { GET as getDoc } from "@/app/api/documents/[id]/route";
import { POST as addMember } from "@/app/api/documents/[id]/members/route";
import { POST as captureVersion } from "@/app/api/documents/[id]/versions/route";

const tag = `api_${Date.now()}`;
let A: { id: string; name: string; email: string };
let B: { id: string; name: string; email: string };
let C: { id: string; name: string; email: string };

function asUser(u: typeof A | null) {
  h.session = u ? { user: u } : null;
}
function req(body?: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function p<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}
function snapshotB64() {
  const doc = new Y.Doc();
  doc.getText("t").insert(0, "hello");
  return Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");
}

beforeAll(async () => {
  const seed = await asService((tx) =>
    tx
      .insert(users)
      .values([
        { email: `${tag}_a@t.dev`, passwordHash: "x", name: "Alice" },
        { email: `${tag}_b@t.dev`, passwordHash: "x", name: "Bob" },
        { email: `${tag}_c@t.dev`, passwordHash: "x", name: "Cara" },
      ])
      .returning(),
  );
  [A, B, C] = seed.map((u) => ({ id: u.id, name: u.name, email: u.email })) as [
    typeof A,
    typeof B,
    typeof C,
  ];
});

afterAll(async () => {
  await asService((tx) =>
    tx.delete(users).where(eq(users.email, A.email)),
  );
  await asService((tx) => tx.delete(users).where(eq(users.email, B.email)));
  await asService((tx) => tx.delete(users).where(eq(users.email, C.email)));
  await client.end({ timeout: 5 });
});

describe("documents API", () => {
  let docId: string;

  it("creates a document and makes the caller owner", async () => {
    asUser(A);
    const res = await createDoc(req({ title: "Spec" }));
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.document.role).toBe("owner");
    docId = j.document.id;
  });

  it("lists the doc for the owner but not for a stranger", async () => {
    asUser(A);
    const mine = await (await listDocs()).json();
    expect(mine.documents.map((d: { id: string }) => d.id)).toContain(docId);

    asUser(B);
    const theirs = await (await listDocs()).json();
    expect(theirs.documents.map((d: { id: string }) => d.id)).not.toContain(
      docId,
    );
  });

  it("hides a non-member's access to a document (404)", async () => {
    asUser(B);
    const res = await getDoc(req(), p({ id: docId }));
    expect(res.status).toBe(404);
  });

  it("blocks a stranger from capturing a version (404)", async () => {
    asUser(B);
    const res = await captureVersion(
      req({ label: "v1", snapshot: snapshotB64() }),
      p({ id: docId }),
    );
    expect(res.status).toBe(404);
  });

  it("owner adds an editor by email", async () => {
    asUser(A);
    const res = await addMember(
      req({ email: B.email, role: "editor" }),
      p({ id: docId }),
    );
    expect(res.status).toBe(201);

    asUser(B);
    const theirs = await (await listDocs()).json();
    expect(theirs.documents.map((d: { id: string }) => d.id)).toContain(docId);
  });

  it("editor can capture a version", async () => {
    asUser(B);
    const res = await captureVersion(
      req({ label: "by editor", snapshot: snapshotB64() }),
      p({ id: docId }),
    );
    expect(res.status).toBe(201);
  });

  it("editor cannot manage members (403)", async () => {
    asUser(B);
    const res = await addMember(
      req({ email: C.email, role: "viewer" }),
      p({ id: docId }),
    );
    expect(res.status).toBe(403);
  });

  it("viewer cannot capture a version (403)", async () => {
    asUser(A);
    await addMember(req({ email: C.email, role: "viewer" }), p({ id: docId }));
    asUser(C);
    const res = await captureVersion(
      req({ label: "sneaky", snapshot: snapshotB64() }),
      p({ id: docId }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects an unauthenticated caller (401)", async () => {
    asUser(null);
    const res = await createDoc(req({ title: "x" }));
    expect(res.status).toBe(401);
  });
});

void db;
