import { and, eq } from "drizzle-orm";
import { currentUser, roleFor } from "@/lib/api/guard";
import {
  json,
  unauthorized,
  forbidden,
  notFound,
  toBase64,
} from "@/lib/api/http";
import { withUser } from "@/lib/db/rls";
import { versions } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string; versionId: string }> };

/** Fetch a version's snapshot blob (base64) so the client can restore it. */
export async function GET(_req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id, versionId } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");

  const [row] = await withUser(user.id, (tx) =>
    tx
      .select({ snapshot: versions.snapshot })
      .from(versions)
      .where(and(eq(versions.id, versionId), eq(versions.documentId, id)))
      .limit(1),
  );
  if (!row) return notFound("Version not found");

  return json({ snapshot: toBase64(row.snapshot) });
}

/** Delete a version. Owner only. */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id, versionId } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");
  if (role !== "owner") return forbidden();

  await withUser(user.id, (tx) =>
    tx
      .delete(versions)
      .where(and(eq(versions.id, versionId), eq(versions.documentId, id))),
  );
  return json({ ok: true });
}
