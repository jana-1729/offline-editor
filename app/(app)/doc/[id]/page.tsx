import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { currentUser, roleFor } from "@/lib/api/guard";
import { withUser } from "@/lib/db/rls";
import { documents, versions, users } from "@/lib/db/schema";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import type { VersionSummary } from "@/lib/types";

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const role = await roleFor(user.id, id);
  if (!role) notFound();

  const [doc] = await withUser(user.id, (tx) =>
    tx.select().from(documents).where(eq(documents.id, id)).limit(1),
  );
  if (!doc) notFound();

  const vrows = await withUser(user.id, (tx) =>
    tx
      .select({
        id: versions.id,
        label: versions.label,
        createdAt: versions.createdAt,
        authorName: users.name,
      })
      .from(versions)
      .leftJoin(users, eq(users.id, versions.createdBy))
      .where(eq(versions.documentId, id))
      .orderBy(desc(versions.createdAt)),
  );

  const initialVersions: VersionSummary[] = vrows.map((v) => ({
    id: v.id,
    label: v.label,
    createdAt: v.createdAt.toISOString(),
    authorName: v.authorName,
  }));

  return (
    <EditorWorkspace
      docId={id}
      initialTitle={doc.title}
      role={role}
      user={{ id: user.id, name: user.name }}
      initialVersions={initialVersions}
    />
  );
}
