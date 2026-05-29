import { createPlayer, type Player, type PlayerId, type PlayerPosition } from '../domain/player.ts';
import type { PlayerEventPublisher, PlayerRepository } from './playerPorts.ts';

const INITIAL_PLAYER_POSITION: PlayerPosition = { x: 0, y: 0 };

export function joinPlayer(
  repository: PlayerRepository,
  publisher: PlayerEventPublisher,
  id: PlayerId,
): Player {
  const existingPlayers = repository.getAll();
  const player = createPlayer(id, INITIAL_PLAYER_POSITION);

  repository.add(player);
  publisher.notifyJoined(id, player, existingPlayers);
  publisher.broadcastPlayerJoined(player, id);

  return player;
}
