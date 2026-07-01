const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.WS_PORT || 8081);
const rooms = new Map();

function roomClients(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function safeSend(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcastPresence(roomId) {
  const clients = roomClients(roomId);
  const users = Array.from(clients.values()).map((client) => ({
    clientId: client.clientId,
    author: client.author,
  }));

  const payload = {
    type: 'presence',
    roomId,
    users,
    count: users.length,
    serverTime: new Date().toISOString(),
  };

  for (const socket of clients.keys()) {
    safeSend(socket, payload);
  }
}

function broadcastToRoom(roomId, senderSocket, payload) {
  const clients = roomClients(roomId);

  for (const socket of clients.keys()) {
    if (socket !== senderSocket) {
      safeSend(socket, payload);
    }
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      service: 'video-shield-websocket-server',
      status: 'ok',
      rooms: Array.from(rooms.keys()),
    }),
  );
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket, request) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const roomId = url.searchParams.get('roomId') || 'demo-review-video';
  const clientId = url.searchParams.get('clientId') || randomUUID();
  const author = url.searchParams.get('author') || `Reviewer-${clientId.slice(0, 4)}`;

  const clients = roomClients(roomId);
  clients.set(socket, { clientId, author });

  console.log(`[ws] connected room=${roomId} client=${clientId} author=${author}`);

  safeSend(socket, {
    type: 'welcome',
    roomId,
    clientId,
    author,
    serverTime: new Date().toISOString(),
  });
  broadcastPresence(roomId);

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      safeSend(socket, {
        type: 'error',
        message: 'Invalid JSON message',
        serverTime: new Date().toISOString(),
      });
      return;
    }

    if (!message || typeof message.type !== 'string') return;

    const enriched = {
      ...message,
      roomId,
      clientId,
      author,
      serverTime: new Date().toISOString(),
    };

    if (
      message.type === 'annotation:upsert' ||
      message.type === 'annotation:delete' ||
      message.type === 'comment:update'
    ) {
      broadcastToRoom(roomId, socket, enriched);
      return;
    }

    if (message.type === 'hello') {
      safeSend(socket, {
        type: 'hello:ack',
        roomId,
        clientId,
        author,
        serverTime: new Date().toISOString(),
      });
    }
  });

  socket.on('close', () => {
    const clients = roomClients(roomId);
    clients.delete(socket);
    if (clients.size === 0) rooms.delete(roomId);
    console.log(`[ws] disconnected room=${roomId} client=${clientId}`);
    broadcastPresence(roomId);
  });
});

server.listen(PORT, () => {
  console.log(`[ws] Video Shield WebSocket server running on ws://localhost:${PORT}`);
});
