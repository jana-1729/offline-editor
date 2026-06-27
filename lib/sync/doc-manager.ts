"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { Awareness } from "y-protocols/awareness";
import { WsProvider } from "./ws-provider";
import { ConnectionState } from "./connection-state";
import { colorForId } from "./colors";

export interface PresenceUser {
  id: string;
  name: string;
}

export interface DocHandle {
  doc: Y.Doc;
  awareness: Awareness;
  connection: ConnectionState;
  persistence: IndexeddbPersistence;
  provider: WsProvider;
  /** Resolves once the local IndexedDB copy has loaded (offline-first ready). */
  whenLocalReady: Promise<void>;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1234";

const cache = new Map<string, { handle: DocHandle; refs: number }>();

async function defaultTokenProvider(): Promise<string> {
  const res = await fetch("/api/ws-token", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to mint realtime token");
  const json = (await res.json()) as { token: string };
  return json.token;
}

/**
 * Acquire (or reuse) the live handle for a document. Reference-counted so
 * multiple components on the same page share one Y.Doc / socket. gc is disabled
 * so historical snapshots remain reconstructable for time travel.
 */
export function acquireDoc(docId: string, user: PresenceUser): DocHandle {
  const existing = cache.get(docId);
  if (existing) {
    existing.refs += 1;
    return existing.handle;
  }

  const doc = new Y.Doc({ gc: false });
  const persistence = new IndexeddbPersistence(`synced-doc-${docId}`, doc);
  const connection = new ConnectionState();
  const awareness = new Awareness(doc);
  awareness.setLocalStateField("user", {
    id: user.id,
    name: user.name,
    color: colorForId(user.id),
  });

  const whenLocalReady = new Promise<void>((resolve) => {
    persistence.once("synced", () => resolve());
  });

  const provider = new WsProvider(WS_URL, docId, doc, {
    awareness,
    connection,
    tokenProvider: defaultTokenProvider,
  });

  const handle: DocHandle = {
    doc,
    awareness,
    connection,
    persistence,
    provider,
    whenLocalReady,
  };
  cache.set(docId, { handle, refs: 1 });
  return handle;
}

/** Release a handle; tears everything down when the last consumer leaves. */
export function releaseDoc(docId: string): void {
  const entry = cache.get(docId);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;

  cache.delete(docId);
  entry.handle.provider.destroy();
  entry.handle.awareness.destroy();
  void entry.handle.persistence.destroy();
  entry.handle.doc.destroy();
}
