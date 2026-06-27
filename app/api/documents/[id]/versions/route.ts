import { desc, eq } from "drizzle-orm";
import { currentUser, roleFor, canWrite } from "@/lib/api/guard";
import {
  readJson,
  json,
  unauthorized,
  forbidden,
  notFound,
  invalid,
  fromBase64,
} from "@/lib/api/http";
import { captureVersionSchema } from "@/lib/validation/document";
import { withUser } from "@/lib/db/rls";
import { versions, users } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** List version snapshots (metadata only — not the binary blobs). */
export async function GET(_req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");

  const list = await withUser(user.id, (tx) =>
    tx
      .select({
        id: versions.id,
        label: versions.label,
        createdAt: versions.createdAt,
        createdBy: versions.createdBy,
        authorName: users.name,
      })
      .from(versions)
      .leftJoin(users, eq(users.id, versions.createdBy))
      .where(eq(versions.documentId, id))
      .orderBy(desc(versions.createdAt)),
  );

  return json({ versions: list });
}

/** Capture a new named snapshot of the current document state. */
export async function POST(req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const role = await roleFor(user.id, id);
  if (!role) return notFound("Document not found");
  if (!canWrite(role)) return forbidden();

  const body = await readJson(req);
  const parsed = captureVersionSchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);

  const snapshot = fromBase64(parsed.data.snapshot);

  const [version] = await withUser(user.id, (tx) =>
    tx
      .insert(versions)
      .values({
        documentId: id,
        label: parsed.data.label,
        snapshot,
        createdBy: user.id,
      })
      .returning({
        id: versions.id,
        label: versions.label,
        createdAt: versions.createdAt,
      }),
  );

  return json({ version }, 201);
}
