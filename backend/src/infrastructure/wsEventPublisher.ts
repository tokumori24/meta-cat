import { WebSocket } from 'ws';
import {
  SERVER_MESSAGE_TYPE_PLAYER_JOINED,
  SERVER_MESSAGE_TYPE_PLAYER_LEFT,
  SERVER_MESSAGE_TYPE_PLAYER_MOVED,
  SERVER_MESSAGE_TYPE_WELCOME,
  type ServerMessage,
} from '../adapters/ws/messages.ts';
import type { PlayerId } from '../domain/player.ts';
import type { PlayerEventPublisher } from '../usecases/playerPorts.ts';

export function createWsPlayerEventPublisher(
  clients: ReadonlyMap<PlayerId, WebSocket>,
): PlayerEventPublisher {
  function send(toId: PlayerId, message: ServerMessage): void {
    const client = clients.get(toId);

    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  function broadcast(message: ServerMessage, excludeId: PlayerId | null): void {
    for (const [id, client] of clients) {
      if (id !== excludeId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  }

  return {
    notifyJoined(toId, assignedPlayer, existingPlayers) {
      send(toId, {
        type: SERVER_MESSAGE_TYPE_WELCOME,
        playerId: assignedPlayer.id,
        currentPlayers: existingPlayers.map((player) => ({
          playerId: player.id,
          x: player.position.x,
          y: player.position.y,
        })),
      });
    },
    broadcastPlayerJoined(newPlayer, excludeId) {
      broadcast({
        type: SERVER_MESSAGE_TYPE_PLAYER_JOINED,
        playerId: newPlayer.id,
        x: newPlayer.position.x,
        y: newPlayer.position.y,
      }, excludeId);
    },
    broadcastPlayerMoved(id, position, excludeId) {
      broadcast({
        type: SERVER_MESSAGE_TYPE_PLAYER_MOVED,
        playerId: id,
        x: position.x,
        y: position.y,
      }, excludeId);
    },
    broadcastPlayerLeft(id) {
      broadcast({ type: SERVER_MESSAGE_TYPE_PLAYER_LEFT, playerId: id }, null);
    },
  };
}
