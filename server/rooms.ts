import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { loadState, saveState } from "./persistence";
import type { TokenBucket } from "./rate-limit";

export const MSG_SYNC = 0;
export const MSG_AWARENESS = 1;

const SAVE_DEBOUNCE_MS = 1500;
// Keep an empty room warm briefly so a quick reopen (second tab/browser, or
// hopping between docs) reuses the populated doc instead of cold-loading.
const EVICT_GRACE_MS = 30_000;

export interface ServerConn {
  readonly userId: string;
  readonly canWrite: boolean;
  controlledIds: Set<number>;
  bucket: TokenBucket;
  send(data: Uint8Array): void;
}

/** Build a MSG_SYNC frame carrying a SyncStep1 (state request). */
export function syncStep1Message(doc: Y.Doc): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_SYNC);
  syncProtocol.writeSyncStep1(enc, doc);
  return encoding.toUint8Array(enc);
}

/** Build a MSG_SYNC frame carrying an incremental update. */
function syncUpdateMessage(update: Uint8Array): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_SYNC);
  syncProtocol.writeUpdate(enc, update);
  return encoding.toUint8Array(enc);
}

function awarenessMessage(
  awareness: awarenessProtocol.Awareness,
  clients: number[],
): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_AWARENESS);
  encoding.writeVarUint8Array(
    enc,
    awarenessProtocol.encodeAwarenessUpdate(awareness, clients),
  );
  return encoding.toUint8Array(enc);
}

export class Room {
  readonly doc = new Y.Doc({ gc: false });
  readonly awareness = new awarenessProtocol.Awareness(this.doc);
  readonly conns = new Set<ServerConn>();
  private loaded = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private evictTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly docId: string,
    private readonly onEmpty: (docId: string) => void,
  ) {
    // Server is a relay, not a peer: it holds no local awareness state.
    this.awareness.setLocalState(null);
    this.doc.on("update", this.handleDocUpdate);
    this.awareness.on("update", this.handleAwarenessUpdate);
  }

  async ensureLoaded() {
    if (this.loaded) return;
    const state = await loadState(this.docId);
    if (state) Y.applyUpdate(this.doc, state, "persistence");
    this.loaded = true;
  }

  addConn(conn: ServerConn) {
    // A client (re)joined — cancel any pending eviction so we keep the warm,
    // already-populated doc instead of tearing it down underneath them.
    if (this.evictTimer) {
      clearTimeout(this.evictTimer);
      this.evictTimer = null;
    }
    this.conns.add(conn);
    // Solicit the client's state and share existing presence.
    conn.send(syncStep1Message(this.doc));
    const states = this.awareness.getStates();
    if (states.size > 0) {
      conn.send(awarenessMessage(this.awareness, Array.from(states.keys())));
    }
  }

  removeConn(conn: ServerConn) {
    this.conns.delete(conn);
    if (conn.controlledIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        Array.from(conn.controlledIds),
        null,
      );
    }
    if (this.conns.size === 0) {
      // Persist immediately so a cold reload is current, but keep the room
      // (and its populated doc) warm for a short grace period. This avoids a
      // teardown race where a quick reopen would otherwise attach to a doc
      // that was being destroyed and see empty content.
      void this.flushSave();
      this.scheduleEvict();
    }
  }

  private scheduleEvict() {
    if (this.evictTimer) return;
    this.evictTimer = setTimeout(() => {
      this.evictTimer = null;
      if (this.conns.size === 0) {
        this.onEmpty(this.docId);
        this.destroy();
      }
    }, EVICT_GRACE_MS);
  }

  /**
   * Process an inbound MSG_SYNC frame. Returns reply bytes (or null). Write
   * operations (Step2 / Update) are silently dropped for read-only (viewer)
   * connections — this is the server-side authorization enforcement that a
   * tampered client cannot bypass.
   */
  handleSync(decoder: decoding.Decoder, conn: ServerConn): Uint8Array | null {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case syncProtocol.messageYjsSyncStep1:
        syncProtocol.readSyncStep1(decoder, encoder, this.doc);
        break;
      case syncProtocol.messageYjsSyncStep2:
        if (conn.canWrite) syncProtocol.readSyncStep2(decoder, this.doc, conn);
        break;
      case syncProtocol.messageYjsUpdate:
        if (conn.canWrite) syncProtocol.readUpdate(decoder, this.doc, conn);
        break;
      default:
        return null;
    }
    return encoding.length(encoder) > 1
      ? encoding.toUint8Array(encoder)
      : null;
  }

  handleAwareness(update: Uint8Array, conn: ServerConn) {
    // Only writers broadcast presence (viewers may still appear; allow all to
    // show read-only collaborators). Track which client ids this conn owns.
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, conn);
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "persistence") return;
    const message = syncUpdateMessage(update);
    for (const conn of this.conns) {
      if (conn !== origin) conn.send(message);
    }
    this.scheduleSave();
  };

  private handleAwarenessUpdate = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    const changed = added.concat(updated, removed);
    if (origin && typeof origin === "object" && "controlledIds" in origin) {
      const conn = origin as ServerConn;
      for (const id of added.concat(updated)) conn.controlledIds.add(id);
      for (const id of removed) conn.controlledIds.delete(id);
    }
    const message = awarenessMessage(this.awareness, changed);
    for (const conn of this.conns) {
      if (conn !== origin) conn.send(message);
    }
  };

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flushSave();
    }, SAVE_DEBOUNCE_MS);
  }

  private async flushSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      await saveState(this.docId, this.doc);
    } catch (err) {
      console.error(`[room ${this.docId}] save failed`, err);
    }
  }

  private destroy() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.evictTimer) clearTimeout(this.evictTimer);
    this.doc.off("update", this.handleDocUpdate);
    this.awareness.off("update", this.handleAwarenessUpdate);
    this.awareness.destroy();
    this.doc.destroy();
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  async get(docId: string): Promise<Room> {
    let room = this.rooms.get(docId);
    if (!room) {
      room = new Room(docId, (id) => this.rooms.delete(id));
      this.rooms.set(docId, room);
      await room.ensureLoaded();
    }
    return room;
  }

  get size() {
    return this.rooms.size;
  }
}
