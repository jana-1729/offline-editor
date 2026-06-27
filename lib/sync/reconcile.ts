import * as Y from "yjs";

/**
 * CRDT reconciliation helpers shared by the client, the realtime server, and
 * the version-restore flow. Kept free of any browser/Node-only dependency so
 * the logic is unit-testable in isolation.
 */

/** Field name TipTap's Collaboration extension uses for the document body. */
export const DOC_FIELD = "default";

/** Full document state as a single Yjs update (used for snapshots/seeding). */
export function encodeState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

/** State vector — the compact "what I already have" descriptor for diffing. */
export function encodeStateVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc);
}

/** Only the updates `doc` has that the holder of `stateVector` is missing. */
export function diffUpdate(doc: Y.Doc, stateVector: Uint8Array): Uint8Array {
  return Y.encodeStateAsUpdate(doc, stateVector);
}

export function applyUpdate(doc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(doc, update);
}

/** Squash many updates into one equivalent update (log compaction). */
export function mergeUpdates(updates: Uint8Array[]): Uint8Array {
  return Y.mergeUpdates(updates);
}

/** Reconstruct a fresh doc from a snapshot/state update. */
export function docFromState(state: Uint8Array): Y.Doc {
  const doc = new Y.Doc({ gc: false });
  Y.applyUpdate(doc, state);
  return doc;
}

type XmlNode = Y.XmlElement | Y.XmlText;

/**
 * Deep-clone an XML node into brand-new Yjs structures. Yjs items cannot be
 * moved between documents, so restoring content from a snapshot requires
 * cloning it node-by-node into the live document. (TipTap documents are built
 * from XmlElement/XmlText only; XmlHook is not used.)
 */
export function cloneXmlNode(node: XmlNode): XmlNode {
  if (node instanceof Y.XmlText) {
    const text = new Y.XmlText();
    text.applyDelta(node.toDelta());
    return text;
  }
  const el = new Y.XmlElement(node.nodeName);
  const attrs = node.getAttributes();
  for (const key of Object.keys(attrs)) {
    const value = attrs[key];
    if (value !== undefined) el.setAttribute(key, value as string);
  }
  el.insert(
    0,
    node.toArray().map((child) => cloneXmlNode(child as XmlNode)),
  );
  return el;
}

/**
 * Restore `doc`'s body to the content captured in `snapshotState` as a
 * FORWARD, non-destructive operation: it replaces the current content within a
 * single transaction using the live doc's own client id. The resulting Yjs
 * update propagates to every collaborator like any normal edit — no hard reset,
 * no history corruption, and concurrent editors converge deterministically.
 *
 * @returns the encoded update produced by the restore transaction.
 */
export function restoreToSnapshot(
  doc: Y.Doc,
  snapshotState: Uint8Array,
  field: string = DOC_FIELD,
): Uint8Array {
  const snapshotDoc = docFromState(snapshotState);
  const source = snapshotDoc.getXmlFragment(field);
  const target = doc.getXmlFragment(field);

  let produced: Uint8Array = new Uint8Array();
  const captureUpdate = (update: Uint8Array) => {
    produced = update;
  };
  doc.on("update", captureUpdate);
  try {
    doc.transact(() => {
      if (target.length > 0) target.delete(0, target.length);
      const clones = source.toArray().map((n) => cloneXmlNode(n as XmlNode));
      if (clones.length > 0) target.insert(0, clones);
    });
  } finally {
    doc.off("update", captureUpdate);
  }
  snapshotDoc.destroy();
  return produced;
}

/** Plain-text extraction of an XML fragment, for tests and previews. */
export function fragmentText(doc: Y.Doc, field: string = DOC_FIELD): string {
  const frag = doc.getXmlFragment(field);
  const walk = (node: unknown): string => {
    if (node instanceof Y.XmlText) return node.toString();
    if (node instanceof Y.XmlElement) {
      return node
        .toArray()
        .map((c) => walk(c))
        .join("");
    }
    return "";
  };
  return frag
    .toArray()
    .map((n) => walk(n))
    .join("\n");
}
