import { withPosition, type Player, type PlayerId, type PlayerPosition } from '../domain/player.ts';
import type { PlayerRepository } from '../usecases/playerPorts.ts';

export function createInMemoryPlayerRepository(): PlayerRepository {
  const players = new Map<PlayerId, Player>();

  return {
    add(player) {
      players.set(player.id, player);
    },
    remove(id) {
      players.delete(id);
    },
    update(id, position) {
      const existingPlayer = players.get(id);

      if (!existingPlayer) {
        throw new Error(`Player not found: ${id}`);
      }

      players.set(id, withPosition(existingPlayer, position));
    },
    getAll() {
      return [...players.values()];
    },
  };
}
