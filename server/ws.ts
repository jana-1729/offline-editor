import "./env";

import { WebSocketServer, WebSocket } from "ws";
import { createServer, type IncomingMessage } from "node:http";
import { and, eq } from "drizzle-orm";
import * as decoding from "lib0/decoding";
import { verifyWsToken } from "@/lib/auth/ws-token";
import { asService } from "@/lib/db/rls";
import { documentMembers } from "@/lib/db/schema";
import { TokenBucket } from "./rate-limit";
import {
  RoomManager,
  MSG_SYNC,
  MSG_AWARENESS,
  type ServerConn,
} from "./rooms";

// Hosts like Render/Railway/Fly inject the port to bind via PORT.
const PORT = Number(process.env.PORT ?? process.env.WS_PORT ?? 1234);
const MAX_PAYLOAD = 1024 * 1024; // 1 MB — hard cap to prevent OOM from one frame
const RATE_CAPACITY = 400; // burst budget (rapid typing)
const RATE_REFILL_PER_SEC = 200;

const manager = new RoomManager();

// Attach the WS server to an HTTP server so platform health checks (Render,
// Railway, Fly) get a 200 on GET /healthz while WebSocket upgrades still work.
const httpServer = createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/healthz" || req.url === "/")) {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_PAYLOAD });

async function resolveRole(
  documentId: string,
  userId: string,
): Promise<"owner" | "editor" | "viewer" | null> {
  const rows = await asService((tx) =>
    tx
      .select({ role: documentMembers.role })
      .from(documentMembers)
      .where(
        and(
          eq(documentMembers.documentId, documentId),
          eq(documentMembers.userId, userId),
        ),
      )
      .limit(1),
  );
  return rows[0]?.role ?? null;
}

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
  let documentId = "";
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    documentId = url.searchParams.get("room") ?? "";
    const token = url.searchParams.get("token") ?? "";

    const userId = await verifyWsToken(token);
    if (!userId || !documentId) {
      ws.close(4401, "Unauthorized");
      return;
    }

    const role = await resolveRole(documentId, userId);
    if (!role) {
      ws.close(4403, "Forbidden");
      return;
    }

    const conn: ServerConn = {
      userId,
      canWrite: role === "owner" || role === "editor",
      controlledIds: new Set<number>(),
      bucket: new TokenBucket(RATE_CAPACITY, RATE_REFILL_PER_SEC),
      send: (data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      },
    };

    const room = await manager.get(documentId);
    room.addConn(conn);

    ws.on("message", (data: Buffer) => {
      if (!conn.bucket.tryRemove()) return; // rate limited → drop frame
      try {
        const message = new Uint8Array(data);
        const decoder = decoding.createDecoder(message);
        const type = decoding.readVarUint(decoder);
        if (type === MSG_SYNC) {
          const reply = room.handleSync(decoder, conn);
          if (reply) conn.send(reply);
        } else if (type === MSG_AWARENESS) {
          room.handleAwareness(decoding.readVarUint8Array(decoder), conn);
        }
      } catch (err) {
        // Malformed payloads must never crash the server.
        console.warn(`[room ${documentId}] dropped malformed message`, err);
      }
    });

    ws.on("close", () => room.removeConn(conn));
    ws.on("error", () => ws.close());
  } catch (err) {
    console.error("connection error", err);
    ws.close(1011, "Server error");
  }
});

httpServer.listen(PORT, () => {
  console.log(`▸ realtime sync server listening on :${PORT} (ws + /healthz)`);
});

const shutdown = () => {
  console.log("shutting down realtime server…");
  wss.close();
  httpServer.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
