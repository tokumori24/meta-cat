import { CLIENT_MESSAGE_TYPE_MOVE, parseClientMessage } from './messages.ts';
import type { PlayerId } from '../../domain/player.ts';
import { joinPlayer } from '../../usecases/joinPlayer.ts';
import { leavePlayer } from '../../usecases/leavePlayer.ts';
import { movePlayer } from '../../usecases/movePlayer.ts';
import type { PlayerEventPublisher, PlayerRepository } from '../../usecases/playerPorts.ts';

export type WsConnectionHandler = {
  onConnect(id: PlayerId): void;
  onMessage(id: PlayerId, raw: string): void;
  onClose(id: PlayerId): void;
};

export function createWsConnectionHandler(
  repository: PlayerRepository,
  publisher: PlayerEventPublisher,
): WsConnectionHandler {
  return {
    onConnect(id) {
      joinPlayer(repository, publisher, id);
    },
    onMessage(id, raw) {
      const message = parseClientMessage(raw);

      if (message?.type === CLIENT_MESSAGE_TYPE_MOVE) {
        movePlayer(repository, publisher, id, { x: message.x, y: message.y });
      }
    },
    onClose(id) {
      leavePlayer(repository, publisher, id);
    },
  };
}
