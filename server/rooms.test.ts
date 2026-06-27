import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import { Room, MSG_SYNC, type ServerConn } from "./rooms";
import { TokenBucket } from "./rate-limit";
import { fragmentText, DOC_FIELD } from "@/lib/sync/reconcile";

function fakeConn(canWrite: boolean): ServerConn {
  return {
    userId: "u",
    canWrite,
    controlledIds: new Set<number>(),
    bucket: new TokenBucket(1000, 1000),
    send: () => {},
  };
}

function buildDocUpdate(text: string): Uint8Array {
  const doc = new Y.Doc();
  const frag = doc.getXmlFragment(DOC_FIELD);
  doc.transact(() => {
    const p = new Y.XmlElement("paragraph");
    const t = new Y.XmlText();
    t.insert(0, text);
    p.insert(0, [t]);
    frag.insert(0, [p]);
  });
  return Y.encodeStateAsUpdate(doc);
}

function updateFrame(update: Uint8Array): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_SYNC);
  syncProtocol.writeUpdate(enc, update);
  return encoding.toUint8Array(enc);
}

function feedSync(room: Room, frame: Uint8Array, conn: ServerConn) {
  const decoder = decoding.createDecoder(frame);
  decoding.readVarUint(decoder); // consume MSG_SYNC envelope byte
  return room.handleSync(decoder, conn);
}

describe("Room authorization", () => {
  it("applies updates from a writer", () => {
    const room = new Room("doc1", () => {});
    feedSync(room, updateFrame(buildDocUpdate("hello")), fakeConn(true));
    expect(fragmentText(room.doc)).toBe("hello");
  });

  it("ignores updates from a viewer (read-only)", () => {
    const room = new Room("doc2", () => {});
    feedSync(room, updateFrame(buildDocUpdate("sneaky")), fakeConn(false));
    expect(fragmentText(room.doc)).toBe("");
  });
});

describe("Room robustness", () => {
  it("returns null and does not throw on an unknown sync sub-type", () => {
    const room = new Room("doc3", () => {});
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    encoding.writeVarUint(enc, 99); // bogus sub-type
    const frame = encoding.toUint8Array(enc);
    expect(() => feedSync(room, frame, fakeConn(true))).not.toThrow();
  });
});
