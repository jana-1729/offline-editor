"use client";

import { useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import type { ConnectionState, ConnStatus } from "@/lib/sync/connection-state";

/** Live connection status for the animated status pill. */
export function useConnectionStatus(cs: ConnectionState): ConnStatus {
  const [status, setStatus] = useState<ConnStatus>(() => cs.get());
  useEffect(() => cs.subscribe(setStatus), [cs]);
  return status;
}

export interface RemoteUser {
  clientId: number;
  id: string;
  name: string;
  color: string;
}

/** Live list of remote collaborators (excluding self) from Yjs awareness. */
export function useAwarenessStates(
  awareness: Awareness,
  selfClientId: number,
): RemoteUser[] {
  const [users, setUsers] = useState<RemoteUser[]>([]);
  useEffect(() => {
    const update = () => {
      const arr: RemoteUser[] = [];
      awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: Omit<RemoteUser, "clientId"> }).user;
        if (clientId !== selfClientId && user) {
          arr.push({ clientId, ...user });
        }
      });
      setUsers(arr);
    };
    update();
    awareness.on("change", update);
    return () => awareness.off("change", update);
  }, [awareness, selfClientId]);
  return users;
}
