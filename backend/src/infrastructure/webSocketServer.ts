import crypto from 'node:crypto';
import type http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { createWsConnectionHandler } from '../adapters/ws/wsConnectionHandler.ts';
import type { PlayerId } from '../domain/player.ts';
import type { PlayerRepository } from '../usecases/playerPorts.ts';
import { createWsPlayerEventPublisher } from './wsEventPublisher.ts';

export function attachWebSocketServer(
  httpServer: http.Server,
  playerRepository: PlayerRepository,
): WebSocketServer {
  const clients = new Map<PlayerId, WebSocket>();
  const publisher = createWsPlayerEventPublisher(clients);
  const handler = createWsConnectionHandler(playerRepository, publisher);
  const webSocketServer = new WebSocketServer({ server: httpServer });

  webSocketServer.on('connection', (socket) => {
    const id = crypto.randomUUID();

    clients.set(id, socket);
    handler.onConnect(id);

    socket.on('message', (data) => {
      handler.onMessage(id, data.toString());
    });

    socket.on('close', () => {
      clients.delete(id);
      handler.onClose(id);
    });
  });

  return webSocketServer;
}
