import http from "node:http";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.SIGNAL_PORT ?? 3001);

/** @type {Map<string, { host: import('ws').WebSocket | null, viewers: Map<string, import('ws').WebSocket> }>} */
const rooms = new Map();

function roomFor(name) {
  let r = rooms.get(name);
  if (!r) {
    r = { host: null, viewers: new Map() };
    rooms.set(name, r);
  }
  return r;
}

function parseQuery(req) {
  const u = new URL(req.url ?? "/", `http://127.0.0.1`);
  return u.searchParams;
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Snap lens stream signaling — use WebSocket\n");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const q = parseQuery(req);
  const role = q.get("role");
  const roomName = q.get("room")?.trim() || "default";

  if (role !== "host" && role !== "viewer") {
    ws.close(4000, "role must be host or viewer");
    return;
  }

  const room = roomFor(roomName);
  /** @type {string | null} */
  let viewerId = null;

  if (role === "host") {
    if (room.host) {
      try {
        room.host.close(4001, "replaced by new host");
      } catch {
        /* ignore */
      }
    }
    room.host = ws;
    ws.send(JSON.stringify({ type: "host-ready", room: roomName }));
    for (const id of room.viewers.keys()) {
      ws.send(JSON.stringify({ type: "viewer-joined", viewerId: id }));
    }
  } else {
    viewerId = randomUUID();
    room.viewers.set(viewerId, ws);
    ws.send(JSON.stringify({ type: "registered", viewerId, room: roomName }));
    if (room.host && room.host.readyState === 1) {
      room.host.send(JSON.stringify({ type: "viewer-joined", viewerId }));
    }
  }

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (role === "host") {
      if (msg.type === "offer" && msg.viewerId && msg.sdp) {
        const v = room.viewers.get(msg.viewerId);
        if (v && v.readyState === 1) {
          v.send(JSON.stringify({ type: "offer", sdp: msg.sdp }));
        }
      }
      if (msg.type === "ice" && msg.viewerId && msg.candidate) {
        const v = room.viewers.get(msg.viewerId);
        if (v && v.readyState === 1) {
          v.send(JSON.stringify({ type: "ice", candidate: msg.candidate }));
        }
      }
    }

    if (role === "viewer" && viewerId) {
      if (msg.type === "answer" && msg.sdp && room.host && room.host.readyState === 1) {
        room.host.send(JSON.stringify({ type: "answer", viewerId, sdp: msg.sdp }));
      }
      if (msg.type === "ice" && msg.candidate && room.host && room.host.readyState === 1) {
        room.host.send(JSON.stringify({ type: "ice", viewerId, candidate: msg.candidate }));
      }
    }
  });

  ws.on("close", () => {
    if (role === "host" && room.host === ws) {
      room.host = null;
    }
    if (role === "viewer" && viewerId) {
      room.viewers.delete(viewerId);
      if (room.host && room.host.readyState === 1) {
        room.host.send(JSON.stringify({ type: "viewer-left", viewerId }));
      }
    }
    if (!room.host && room.viewers.size === 0) {
      rooms.delete(roomName);
    }
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} in use. Stop the old process or run: SIGNAL_PORT=3002 node server/signal.mjs`,
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`Signaling server ws://localhost:${PORT}`);
});
