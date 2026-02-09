process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { createRoutes } from "./routes.js";
import { ControllerBridge } from "./controller-bridge.js";
import { CliLauncher } from "./cli-launcher.js";
import { WsBridge } from "./ws-bridge.js";
import type { SocketData } from "./ws-bridge.js";
import type { ServerWebSocket } from "bun";

type WsData = SocketData | { kind: "legacy" };

const port = Number(process.env.PORT) || 3456;
const bridge = new ControllerBridge();
const wsBridge = new WsBridge();
const launcher = new CliLauncher(bridge.ws, port);

const app = new Hono();

app.use("/api/*", cors());
app.route("/api", createRoutes(bridge, launcher, wsBridge));

// In production, serve built frontend
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("/*", serveStatic({ path: "./dist/index.html" }));
}

const server = Bun.serve<WsData>({
  port,
  fetch(req, server) {
    const url = new URL(req.url);

    // ── CLI WebSocket — Claude Code CLI connects here via --sdk-url ────
    const cliMatch = url.pathname.match(/^\/ws\/cli\/([a-f0-9-]+)$/);
    if (cliMatch) {
      const sessionId = cliMatch[1];
      const upgraded = server.upgrade(req, {
        data: { kind: "cli" as const, sessionId },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // ── Browser WebSocket — connects to a specific session ─────────────
    const browserMatch = url.pathname.match(/^\/ws\/browser\/([a-f0-9-]+)$/);
    if (browserMatch) {
      const sessionId = browserMatch[1];
      const upgraded = server.upgrade(req, {
        data: { kind: "browser" as const, sessionId },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // ── Legacy WebSocket — existing controller-bridge UI clients ───────
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: { kind: "legacy" as const },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Hono handles the rest
    return app.fetch(req, server);
  },
  websocket: {
    open(ws: ServerWebSocket<WsData>) {
      const data = ws.data;
      if (data.kind === "cli") {
        wsBridge.handleCLIOpen(ws as ServerWebSocket<SocketData>, data.sessionId);
        // Also notify the launcher that the CLI connected
        launcher.markConnected(data.sessionId);
      } else if (data.kind === "browser") {
        wsBridge.handleBrowserOpen(ws as ServerWebSocket<SocketData>, data.sessionId);
      } else {
        // Legacy /ws path — existing controller-bridge
        bridge.ws.add(ws as ServerWebSocket<unknown>);
        bridge.ws.sendTo(ws as ServerWebSocket<unknown>, {
          type: "snapshot",
          session: bridge.sessionInfo,
          agents: bridge.getAgents(),
          messages: bridge.getMessages(),
          pendingApprovals: bridge.getPendingApprovals(),
        });
      }
    },
    message(ws: ServerWebSocket<WsData>, msg: string | Buffer) {
      const data = ws.data;
      if (data.kind === "cli") {
        wsBridge.handleCLIMessage(ws as ServerWebSocket<SocketData>, msg);
      } else if (data.kind === "browser") {
        wsBridge.handleBrowserMessage(ws as ServerWebSocket<SocketData>, msg);
      }
      // Legacy /ws: no messages expected from client
    },
    close(ws: ServerWebSocket<WsData>) {
      const data = ws.data;
      if (data.kind === "cli") {
        wsBridge.handleCLIClose(ws as ServerWebSocket<SocketData>);
      } else if (data.kind === "browser") {
        wsBridge.handleBrowserClose(ws as ServerWebSocket<SocketData>);
      } else {
        bridge.ws.remove(ws as ServerWebSocket<unknown>);
      }
    },
  },
});

console.log(`Server running on http://localhost:${server.port}`);
console.log(`  CLI WebSocket:     ws://localhost:${server.port}/ws/cli/:sessionId`);
console.log(`  Browser WebSocket: ws://localhost:${server.port}/ws/browser/:sessionId`);
console.log(`  Legacy WebSocket:  ws://localhost:${server.port}/ws`);

// In dev mode, log that Vite should be run separately
if (process.env.NODE_ENV !== "production") {
  console.log("Dev mode: run 'bun run dev:vite' in another terminal for the frontend");
}
