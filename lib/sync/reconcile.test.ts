import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import {
  encodeState,
  encodeStateVector,
  diffUpdate,
  applyUpdate,
  restoreToSnapshot,
  fragmentText,
  DOC_FIELD,
} from "./reconcile";

/** Replace the document body with a single paragraph of `text`. */
function setParagraph(doc: Y.Doc, text: string) {
  const frag = doc.getXmlFragment(DOC_FIELD);
  doc.transact(() => {
    if (frag.length) frag.delete(0, frag.length);
    const p = new Y.XmlElement("paragraph");
    const t = new Y.XmlText();
    t.insert(0, text);
    p.insert(0, [t]);
    frag.insert(0, [p]);
  });
}

/** Append a paragraph without clearing existing content. */
function addParagraph(doc: Y.Doc, text: string) {
  const frag = doc.getXmlFragment(DOC_FIELD);
  doc.transact(() => {
    const p = new Y.XmlElement("paragraph");
    const t = new Y.XmlText();
    t.insert(0, text);
    p.insert(0, [t]);
    frag.insert(frag.length, [p]);
  });
}

describe("encode / apply", () => {
  it("round-trips full state to a fresh doc", () => {
    const a = new Y.Doc();
    setParagraph(a, "hello world");
    const b = new Y.Doc();
    applyUpdate(b, encodeState(a));
    expect(fragmentText(b)).toBe("hello world");
  });
});

describe("conflict-free convergence", () => {
  it("merges concurrent edits with no data loss", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    // Concurrent, independent edits.
    addParagraph(a, "from-A");
    addParagraph(b, "from-B");

    // Exchange only the missing updates in both directions.
    applyUpdate(b, diffUpdate(a, encodeStateVector(b)));
    applyUpdate(a, diffUpdate(b, encodeStateVector(a)));

    const textA = fragmentText(a);
    const textB = fragmentText(b);

    // Deterministic convergence: identical on both replicas.
    expect(textA).toBe(textB);
    // No data loss: both contributions survive.
    expect(textA).toContain("from-A");
    expect(textA).toContain("from-B");
  });
});

describe("restoreToSnapshot", () => {
  it("restores body content to the snapshot state", () => {
    const doc = new Y.Doc({ gc: false });
    setParagraph(doc, "version one");
    const snap = encodeState(doc);

    setParagraph(doc, "version two");
    expect(fragmentText(doc)).toBe("version two");

    const update = restoreToSnapshot(doc, snap);
    expect(fragmentText(doc)).toBe("version one");
    expect(update.length).toBeGreaterThan(0);
  });

  it("propagates the restore to peers as a forward update (no reset)", () => {
    const doc = new Y.Doc({ gc: false });
    setParagraph(doc, "v1");
    const snap = encodeState(doc);
    setParagraph(doc, "v2");

    // A peer that is in sync at v2.
    const peer = new Y.Doc({ gc: false });
    applyUpdate(peer, encodeState(doc));
    expect(fragmentText(peer)).toBe("v2");

    const update = restoreToSnapshot(doc, snap);
    applyUpdate(peer, update);

    expect(fragmentText(peer)).toBe("v1");
    expect(fragmentText(peer)).toBe(fragmentText(doc));
  });

  it("leaves the document editable after a restore", () => {
    const doc = new Y.Doc({ gc: false });
    setParagraph(doc, "v1");
    const snap = encodeState(doc);
    setParagraph(doc, "v2");
    restoreToSnapshot(doc, snap);

    setParagraph(doc, "v3");
    expect(fragmentText(doc)).toBe("v3");
  });
});
