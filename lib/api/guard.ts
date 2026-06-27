import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { withUser } from "@/lib/db/rls";
import { documentMembers } from "@/lib/db/schema";
import type { Role } from "@/lib/db/schema";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

/** Resolve the authenticated user from the session, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
  };
}

/** The caller's role on a document (RLS-scoped), or null if not a member. */
export async function roleFor(
  userId: string,
  documentId: string,
): Promise<Role | null> {
  const rows = await withUser(userId, (tx) =>
    tx
      .select({ role: documentMembers.role })
      .from(documentMembers)
      .where(
        and(
          eq(documentMembers.documentId, documentId),
          eq(documentMembers.userId, userId),
        ),
      )
      .limit(1),
  );
  return rows[0]?.role ?? null;
}

export function canWrite(role: Role | null): boolean {
  return role === "owner" || role === "editor";
}
