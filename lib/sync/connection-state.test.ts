import { describe, it, expect, vi } from "vitest";
import { nextStatus, ConnectionState } from "./connection-state";

describe("nextStatus reducer", () => {
  it("starts the handshake from offline on CONNECT", () => {
    expect(nextStatus("offline", "CONNECT")).toBe("connecting");
    expect(nextStatus("error", "CONNECT")).toBe("connecting");
  });

  it("ignores CONNECT when already connected", () => {
    expect(nextStatus("online", "CONNECT")).toBe("online");
    expect(nextStatus("syncing", "CONNECT")).toBe("syncing");
  });

  it("moves connecting → syncing on OPEN", () => {
    expect(nextStatus("connecting", "OPEN")).toBe("syncing");
  });

  it("completes with SYNCED only from syncing/online", () => {
    expect(nextStatus("syncing", "SYNCED")).toBe("online");
    expect(nextStatus("online", "SYNCED")).toBe("online");
    expect(nextStatus("connecting", "SYNCED")).toBe("connecting");
  });

  it("CLOSE and OFFLINE always drop to offline", () => {
    for (const s of ["online", "syncing", "connecting", "error"] as const) {
      expect(nextStatus(s, "CLOSE")).toBe("offline");
      expect(nextStatus(s, "OFFLINE")).toBe("offline");
    }
  });

  it("ERROR always moves to error", () => {
    expect(nextStatus("online", "ERROR")).toBe("error");
  });
});

describe("ConnectionState", () => {
  it("defaults to offline and notifies subscribers immediately", () => {
    const cs = new ConnectionState();
    const seen: string[] = [];
    cs.subscribe((s) => seen.push(s));
    expect(seen).toEqual(["offline"]);
  });

  it("emits only on actual change", () => {
    const cs = new ConnectionState();
    const fn = vi.fn();
    cs.subscribe(fn);
    fn.mockClear();
    cs.dispatch("CONNECT"); // offline -> connecting
    cs.dispatch("CONNECT"); // no change
    cs.dispatch("OPEN"); // -> syncing
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("syncing");
  });

  it("stops notifying after unsubscribe", () => {
    const cs = new ConnectionState();
    const fn = vi.fn();
    const off = cs.subscribe(fn);
    off();
    fn.mockClear();
    cs.dispatch("CONNECT");
    expect(fn).not.toHaveBeenCalled();
  });

  it("drives a full lifecycle", () => {
    const cs = new ConnectionState();
    cs.dispatch("CONNECT");
    expect(cs.get()).toBe("connecting");
    cs.dispatch("OPEN");
    expect(cs.get()).toBe("syncing");
    cs.dispatch("SYNCED");
    expect(cs.get()).toBe("online");
    cs.dispatch("CLOSE");
    expect(cs.get()).toBe("offline");
  });
});
