import { and, eq } from "drizzle-orm";
import { currentUser, roleFor } from "@/lib/api/guard";
import {
  readJson,
  json,
  unauthorized,
  forbidden,
  notFound,
  invalid,
  badRequest,
} from "@/lib/api/http";
import { addMemberSchema, removeMemberSchema } from "@/lib/validation/document";
import { withUser, asService } from "@/lib/db/rls";
import { documentMembers, users } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** List members of a document (any member may view the roster). */
export async function GET(_req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");

  const members = await withUser(user.id, (tx) =>
    tx
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: documentMembers.role,
      })
      .from(documentMembers)
      .innerJoin(users, eq(users.id, documentMembers.userId))
      .where(eq(documentMembers.documentId, id)),
  );

  return json({ members });
}

/** Add or update a collaborator by email. Owner only. */
export async function POST(req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");
  if (role !== "owner") return forbidden();

  const body = await readJson(req);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);

  // Cross-user lookup is privileged (the target may not yet be a co-member),
  // but is authorized here because the caller is the document owner.
  const member = await asService(async (tx) => {
    const [target] = await tx
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);
    if (!target) return null;
    if (target.id === user.id) return "self" as const;

    await tx
      .insert(documentMembers)
      .values({ documentId: id, userId: target.id, role: parsed.data.role })
      .onConflictDoUpdate({
        target: [documentMembers.documentId, documentMembers.userId],
        set: { role: parsed.data.role },
      });
    // Shape matches MemberSummary (userId, not id) so the client list stays
    // consistent and React keys are stable.
    return {
      userId: target.id,
      name: target.name,
      email: target.email,
      role: parsed.data.role,
    };
  });

  if (member === null) return notFound("No user with that email");
  if (member === "self") return badRequest("You already own this document");

  return json({ member }, 201);
}

/** Remove a collaborator. Owner only; the owner cannot be removed. */
export async function DELETE(req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");
  if (role !== "owner") return forbidden();

  const body = await readJson(req);
  const parsed = removeMemberSchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);
  if (parsed.data.userId === user.id) {
    return badRequest("The owner cannot be removed");
  }

  await asService((tx) =>
    tx
      .delete(documentMembers)
      .where(
        and(
          eq(documentMembers.documentId, id),
          eq(documentMembers.userId, parsed.data.userId),
        ),
      ),
  );
  return json({ ok: true });
}
