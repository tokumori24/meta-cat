import type { PlayerId } from '../domain/player.ts';
import type { PlayerEventPublisher, PlayerRepository } from './playerPorts.ts';

export function leavePlayer(
  repository: PlayerRepository,
  publisher: PlayerEventPublisher,
  id: PlayerId,
): void {
  repository.remove(id);
  publisher.broadcastPlayerLeft(id);
}
