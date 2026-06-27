import { and, desc, eq, sql } from "drizzle-orm";
import { withUser } from "@/lib/db/rls";
import { documents, documentMembers } from "@/lib/db/schema";
import type { DocSummary } from "@/lib/types";

/** Documents the user can access, with role + member count. Used by both the
 * REST route and the dashboard server component. */
export async function listDocumentsFor(userId: string): Promise<DocSummary[]> {
  const rows = await withUser(userId, (tx) =>
    tx
      .select({
        id: documents.id,
        title: documents.title,
        ownerId: documents.ownerId,
        updatedAt: documents.updatedAt,
        role: documentMembers.role,
        memberCount: sql<number>`(
          select count(*)::int from ${documentMembers} m
          where m.document_id = ${documents.id}
        )`,
      })
      .from(documents)
      .innerJoin(
        documentMembers,
        and(
          eq(documentMembers.documentId, documents.id),
          eq(documentMembers.userId, userId),
        ),
      )
      .orderBy(desc(documents.updatedAt)),
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    ownerId: r.ownerId,
    role: r.role,
    memberCount: Number(r.memberCount),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
