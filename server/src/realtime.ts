import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from './config';
import type { RealtimeEvent } from './types';

type ClientSocket = WebSocket & {
  userId?: string;
  presenceChannels?: Set<string>;
};

let websocketServer: WebSocketServer | null = null;

export function attachRealtimeServer(server: Server) {
  websocketServer = new WebSocketServer({ server, path: '/ws' });

  websocketServer.on('connection', (socket: ClientSocket, request) => {
    const url = new URL(request.url ?? '/ws', config.publicApiUrl);
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
        if (typeof payload.sub === 'string') socket.userId = payload.sub;
      } catch {
        socket.close(1008, 'Invalid token');
        return;
      }
    }
    socket.presenceChannels = new Set();

    socket.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString()) as Record<string, unknown>;
        if (payload.type === 'presence') {
          const channel = typeof payload.channel === 'string' ? payload.channel : '';
          if (!socket.userId || !channel.includes(socket.userId)) return;
          socket.presenceChannels?.add(channel);
          broadcastPresence(channel, {
            type: 'presence',
            userId: socket.userId,
            channel,
            state: payload.state,
          });
        }
      } catch {
        // Ignore malformed realtime frames rather than taking down the socket.
      }
    });
  });

  return websocketServer;
}

function broadcastPresence(channel: string, payload: Record<string, unknown>) {
  if (!websocketServer) return;
  const frame = JSON.stringify(payload);
  for (const rawClient of websocketServer.clients) {
    const client = rawClient as ClientSocket;
    if (
      client.readyState === WebSocket.OPEN &&
      client.presenceChannels?.has(channel)
    ) {
      client.send(frame);
    }
  }
}

export function broadcast(payload: RealtimeEvent | Record<string, unknown>) {
  if (!websocketServer) return;
  const frame = JSON.stringify(payload);
  for (const rawClient of websocketServer.clients) {
    const client = rawClient as ClientSocket;
    if (client.readyState !== WebSocket.OPEN) continue;

    if ('table' in payload && ['messages', 'shared_books', 'wishlist'].includes(String(payload.table))) {
      const record =
        ('new' in payload && payload.new) || ('old' in payload && payload.old);
      const scopedRecord = record as Record<string, unknown> | null;
      const permitted =
        payload.table === 'wishlist'
          ? scopedRecord?.user_id === client.userId
          : scopedRecord?.sender_id === client.userId ||
            scopedRecord?.recipient_id === client.userId;
      if (!permitted) continue;
    }

    client.send(frame);
  }
}
