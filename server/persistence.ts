import { eq } from "drizzle-orm";
import * as Y from "yjs";
import { asService } from "@/lib/db/rls";
import { docState, documents } from "@/lib/db/schema";
import { encodeState, encodeStateVector } from "@/lib/sync/reconcile";

/**
 * Server-side document persistence. The realtime server owns the canonical
 * squashed snapshot in `doc_state`; it is loaded to seed a room and rewritten
 * (debounced) as edits arrive. Runs as the service role (RLS bypass) because
 * access was already authorized at the socket handshake.
 */

export async function loadState(documentId: string): Promise<Uint8Array | null> {
  const rows = await asService((tx) =>
    tx
      .select({ snapshot: docState.snapshot })
      .from(docState)
      .where(eq(docState.documentId, documentId))
      .limit(1),
  );
  return rows[0]?.snapshot ?? null;
}

export async function saveState(documentId: string, doc: Y.Doc): Promise<void> {
  const snapshot = encodeState(doc);
  const stateVector = encodeStateVector(doc);
  await asService(async (tx) => {
    await tx
      .insert(docState)
      .values({ documentId, snapshot, stateVector })
      .onConflictDoUpdate({
        target: docState.documentId,
        set: { snapshot, stateVector, updatedAt: new Date() },
      });
    await tx
      .update(documents)
      .set({ updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  });
}
