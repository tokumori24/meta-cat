import type { PlayerId, PlayerPosition } from '../domain/player.ts';
import type { PlayerEventPublisher, PlayerRepository } from './playerPorts.ts';

export function movePlayer(
  repository: PlayerRepository,
  publisher: PlayerEventPublisher,
  id: PlayerId,
  position: PlayerPosition,
): void {
  repository.update(id, position);
  publisher.broadcastPlayerMoved(id, position, id);
}
