import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { downloadProgressStore, type DownloadProgressSnapshot } from "./downloadProgressStore";

/**
 * Very small WS hub:
 * - Client connects to ws(s)://host/ws
 * - Client sends: { type: "subscribe", downloadId: number }
 * - Server sends: { type: "progress", snapshot: DownloadProgressSnapshot }
 */

export type WsClientMessage =
  | { type: "subscribe"; downloadId: number }
  | { type: "unsubscribe"; downloadId: number };

export type WsServerMessage =
  | { type: "progress"; snapshot: DownloadProgressSnapshot }
  | { type: "error"; message: string };

function safeJsonParse(msg: WebSocket.RawData): any {
  try {
    return JSON.parse(msg.toString());
  } catch {
    return null;
  }
}

export class ProgressWebSocketHub {
  private wss?: WebSocketServer;
  private subscriptions = new Map<WebSocket, Set<number>>();
  private broadcastTimer?: NodeJS.Timeout;

  start(server: HttpServer) {
    if (this.wss) return;

    this.wss = new WebSocketServer({ server, path: "/ws" });

    // Prevent unhandled 'error' events from crashing the whole server.
    this.wss.on("error", (err) => {
      console.error("WebSocket server error:", err);
    });

    this.wss.on("connection", (socket) => {
      this.subscriptions.set(socket, new Set());

      socket.on("message", (raw) => {
        const msg = safeJsonParse(raw) as WsClientMessage | null;
        if (!msg || typeof (msg as any).type !== "string") {
          return this.send(socket, { type: "error", message: "Invalid message" });
        }

        if (msg.type === "subscribe") {
          const id = Number((msg as any).downloadId);
          if (!Number.isFinite(id)) {
            return this.send(socket, { type: "error", message: "Invalid downloadId" });
          }

          this.subscriptions.get(socket)?.add(id);
          const snap =
            downloadProgressStore.get(id) ||
            ({ downloadId: id, stage: "queued", percent: 0, updatedAt: Date.now() } as DownloadProgressSnapshot);
          this.send(socket, { type: "progress", snapshot: snap });
        }

        if (msg.type === "unsubscribe") {
          const id = Number((msg as any).downloadId);
          if (!Number.isFinite(id)) return;
          this.subscriptions.get(socket)?.delete(id);
        }
      });

      socket.on("close", () => {
        this.subscriptions.delete(socket);
      });
    });

    // Poll the in-memory store and push snapshots.
    // We keep this super simple and fast; later we can move to event-driven store.
    this.broadcastTimer = setInterval(() => {
      for (const [socket, ids] of Array.from(this.subscriptions.entries())) {
        if (socket.readyState !== WebSocket.OPEN) continue;
        for (const id of Array.from(ids.values())) {
          const snap = downloadProgressStore.get(id);
          if (!snap) continue;
          this.send(socket, { type: "progress", snapshot: snap });
        }
      }
    }, 350);
  }

  stop() {
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);
    this.broadcastTimer = undefined;
    this.wss?.close();
    this.wss = undefined;
    this.subscriptions.clear();
  }

  private send(socket: WebSocket, message: WsServerMessage) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
  }
}

export const progressWebSocketHub = new ProgressWebSocketHub();

