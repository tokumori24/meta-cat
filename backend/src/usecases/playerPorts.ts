import type { Player, PlayerId, PlayerPosition } from '../domain/player.ts';

export type PlayerRepository = {
  add(player: Player): void;
  remove(id: PlayerId): void;
  update(id: PlayerId, position: PlayerPosition): void;
  getAll(): readonly Player[];
};

export type PlayerEventPublisher = {
  notifyJoined(toId: PlayerId, assignedPlayer: Player, existingPlayers: readonly Player[]): void;
  broadcastPlayerJoined(newPlayer: Player, excludeId: PlayerId): void;
  broadcastPlayerMoved(id: PlayerId, position: PlayerPosition, excludeId: PlayerId): void;
  broadcastPlayerLeft(id: PlayerId): void;
};
