import { currentUser } from "@/lib/api/guard";
import { readJson, json, unauthorized, invalid } from "@/lib/api/http";
import { createDocumentSchema } from "@/lib/validation/document";
import { withUser } from "@/lib/db/rls";
import { documents, documentMembers } from "@/lib/db/schema";
import { listDocumentsFor } from "@/lib/api/documents-query";

/** List documents the user can access, with their role and member count. */
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const docs = await listDocumentsFor(user.id);
  return json({ documents: docs });
}

/** Create a new document, making the caller its owner. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  const parsed = createDocumentSchema.safeParse(body ?? {});
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);

  const title = parsed.data.title ?? "Untitled document";

  const doc = await withUser(user.id, async (tx) => {
    const [created] = await tx
      .insert(documents)
      .values({ title, ownerId: user.id })
      .returning();
    await tx
      .insert(documentMembers)
      .values({ documentId: created.id, userId: user.id, role: "owner" });
    return created;
  });

  return json({ document: { ...doc, role: "owner" } }, 201);
}
