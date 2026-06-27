import { eq } from "drizzle-orm";
import { currentUser, roleFor, canWrite } from "@/lib/api/guard";
import {
  readJson,
  json,
  unauthorized,
  forbidden,
  notFound,
  invalid,
} from "@/lib/api/http";
import { renameDocumentSchema } from "@/lib/validation/document";
import { withUser } from "@/lib/db/rls";
import { documents } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");

  const [doc] = await withUser(user.id, (tx) =>
    tx.select().from(documents).where(eq(documents.id, id)).limit(1),
  );
  if (!doc) return notFound("Document not found");

  return json({ document: { ...doc, role } });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");
  if (!canWrite(role)) return forbidden();

  const body = await readJson(req);
  const parsed = renameDocumentSchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);

  const [doc] = await withUser(user.id, (tx) =>
    tx
      .update(documents)
      .set({ title: parsed.data.title, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning(),
  );
  return json({ document: { ...doc, role } });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");
  if (role !== "owner") return forbidden();

  await withUser(user.id, (tx) =>
    tx.delete(documents).where(eq(documents.id, id)),
  );
  return json({ ok: true });
}
