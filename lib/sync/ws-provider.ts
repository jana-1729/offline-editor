"use client";

import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { ConnectionState } from "./connection-state";

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

export interface WsProviderOptions {
  awareness: awarenessProtocol.Awareness;
  connection: ConnectionState;
  /** Mints a short-lived JWT the realtime server can verify on connect. */
  tokenProvider: () => Promise<string>;
  maxBackoffMs?: number;
}

/**
 * Minimal Yjs WebSocket provider implementing the y-websocket sync + awareness
 * protocol with token auth and exponential-backoff reconnect. Drives the
 * ConnectionState machine so the UI can reflect offline/syncing/online live.
 *
 * It is deliberately resilient: a closed socket never throws, offline edits
 * accumulate in the Y.Doc (and IndexedDB via the persistence layer), and on
 * reconnect the sync protocol exchanges only the missing updates — so offline
 * work is merged, never overwritten.
 */
export class WsProvider {
  ws: WebSocket | null = null;
  private shouldConnect = true;
  private synced = false;
  private backoff = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly maxBackoff: number;
  private readonly awareness: awarenessProtocol.Awareness;
  private readonly connection: ConnectionState;
  private readonly tokenProvider: () => Promise<string>;

  constructor(
    private readonly url: string,
    private readonly room: string,
    private readonly doc: Y.Doc,
    opts: WsProviderOptions,
  ) {
    this.awareness = opts.awareness;
    this.connection = opts.connection;
    this.tokenProvider = opts.tokenProvider;
    this.maxBackoff = opts.maxBackoffMs ?? 15000;

    this.doc.on("update", this.handleDocUpdate);
    this.awareness.on("update", this.handleAwarenessUpdate);

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
      if (navigator.onLine) this.connect();
      else this.connection.dispatch("OFFLINE");
    }
  }

  private send(data: Uint8Array) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  async connect() {
    if (!this.shouldConnect || this.ws) return;
    this.connection.dispatch("CONNECT");
    let token: string;
    try {
      token = await this.tokenProvider();
    } catch {
      this.scheduleReconnect();
      return;
    }
    if (!this.shouldConnect) return;

    const sep = this.url.includes("?") ? "&" : "?";
    const ws = new WebSocket(
      `${this.url}${sep}room=${encodeURIComponent(this.room)}&token=${encodeURIComponent(token)}`,
    );
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    ws.onopen = () => {
      this.backoff = 1000;
      this.connection.dispatch("OPEN");
      // Step 1: ask the server for everything we're missing.
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      syncProtocol.writeSyncStep1(enc, this.doc);
      this.send(encoding.toUint8Array(enc));
      // Announce our presence.
      if (this.awareness.getLocalState() !== null) {
        const aenc = encoding.createEncoder();
        encoding.writeVarUint(aenc, MSG_AWARENESS);
        encoding.writeVarUint8Array(
          aenc,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
            this.doc.clientID,
          ]),
        );
        this.send(encoding.toUint8Array(aenc));
      }
    };

    ws.onmessage = (event) => this.handleMessage(new Uint8Array(event.data));

    ws.onerror = () => this.connection.dispatch("ERROR");

    ws.onclose = () => {
      this.ws = null;
      this.synced = false;
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        Array.from(this.awareness.getStates().keys()).filter(
          (id) => id !== this.doc.clientID,
        ),
        this,
      );
      this.connection.dispatch("CLOSE");
      this.scheduleReconnect();
    };
  }

  private handleMessage(buf: Uint8Array) {
    const decoder = decoding.createDecoder(buf);
    const type = decoding.readVarUint(decoder);
    switch (type) {
      case MSG_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_SYNC);
        const syncType = syncProtocol.readSyncMessage(
          decoder,
          encoder,
          this.doc,
          this,
        );
        if (encoding.length(encoder) > 1) {
          this.send(encoding.toUint8Array(encoder));
        }
        if (
          syncType === syncProtocol.messageYjsSyncStep2 &&
          !this.synced
        ) {
          this.synced = true;
          this.connection.dispatch("SYNCED");
        }
        break;
      }
      case MSG_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          this,
        );
        break;
      }
    }
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return; // came from the network; don't echo
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    this.send(encoding.toUint8Array(encoder));
  };

  private handleAwarenessUpdate = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this) return;
    const changed = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
    );
    this.send(encoding.toUint8Array(encoder));
  };

  private handleOnline = () => {
    this.shouldConnect = true;
    this.connect();
  };

  private handleOffline = () => {
    this.connection.dispatch("OFFLINE");
    this.ws?.close();
  };

  private scheduleReconnect() {
    if (!this.shouldConnect || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 1.5, this.maxBackoff);
  }

  destroy() {
    this.shouldConnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.doc.off("update", this.handleDocUpdate);
    this.awareness.off("update", this.handleAwarenessUpdate);
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      this,
    );
    this.ws?.close();
    this.ws = null;
  }
}
