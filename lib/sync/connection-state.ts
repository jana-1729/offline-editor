/**
 * Connection state machine for the realtime sync engine.
 *
 * The reducer `nextStatus` is a pure function (easy to test exhaustively); the
 * `ConnectionState` class wraps it with a tiny pub/sub so React components can
 * subscribe to live status changes and render the animated status pill.
 */

export type ConnStatus =
  | "offline"
  | "connecting"
  | "syncing"
  | "online"
  | "error";

export type ConnEvent =
  | "CONNECT" // we initiated a connection attempt
  | "OPEN" // socket opened, beginning initial sync
  | "SYNCED" // initial sync handshake completed
  | "CLOSE" // socket closed / network lost
  | "ERROR" // unrecoverable error
  | "OFFLINE"; // browser reports offline

/** Pure transition function. Unknown transitions leave the status unchanged. */
export function nextStatus(current: ConnStatus, event: ConnEvent): ConnStatus {
  switch (event) {
    case "OFFLINE":
      return "offline";
    case "CONNECT":
      return current === "offline" || current === "error"
        ? "connecting"
        : current;
    case "OPEN":
      // Reopening always restarts the sync handshake.
      return "syncing";
    case "SYNCED":
      return current === "syncing" || current === "online" ? "online" : current;
    case "CLOSE":
      return "offline";
    case "ERROR":
      return "error";
    default:
      return current;
  }
}

export type Listener = (status: ConnStatus) => void;

export class ConnectionState {
  private status: ConnStatus;
  private listeners = new Set<Listener>();

  constructor(initial: ConnStatus = "offline") {
    this.status = initial;
  }

  get(): ConnStatus {
    return this.status;
  }

  /** Subscribe to changes. The callback fires immediately with current state. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Apply an event through the reducer; emits only on an actual change. */
  dispatch(event: ConnEvent): ConnStatus {
    const next = nextStatus(this.status, event);
    if (next !== this.status) {
      this.status = next;
      for (const l of this.listeners) l(next);
    }
    return this.status;
  }
}
