import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player, PlayerId, PlayerPosition } from '../../src/domain/player.ts';
import { joinPlayer } from '../../src/usecases/joinPlayer.ts';
import { leavePlayer } from '../../src/usecases/leavePlayer.ts';
import { movePlayer } from '../../src/usecases/movePlayer.ts';
import type { PlayerEventPublisher, PlayerRepository } from '../../src/usecases/playerPorts.ts';

test('joinPlayer adds the new player and publishes join events', () => {
  const calls: string[] = [];
  const existingPlayers: Player[] = [{ id: 'existing', position: { x: 1, y: 2 } }];
  const repository = createRepository({
    getAll: () => existingPlayers,
    add: (player) => calls.push(`add:${player.id}:${player.position.x}:${player.position.y}`),
  });
  const publisher = createPublisher({
    notifyJoined: (toId, player, players) => calls.push(`welcome:${toId}:${player.id}:${players.length}`),
    broadcastPlayerJoined: (player, excludeId) => calls.push(`joined:${player.id}:${excludeId}`),
  });

  const player = joinPlayer(repository, publisher, 'new-player');

  assert.deepEqual(player, { id: 'new-player', position: { x: 0, y: 0 } });
  assert.deepEqual(calls, [
    'add:new-player:0:0',
    'welcome:new-player:new-player:1',
    'joined:new-player:new-player',
  ]);
});

test('movePlayer updates the player and broadcasts movement excluding the sender', () => {
  const calls: string[] = [];
  const repository = createRepository({
    update: (id, position) => calls.push(`update:${id}:${position.x}:${position.y}`),
  });
  const publisher = createPublisher({
    broadcastPlayerMoved: (id, position, excludeId) => calls.push(`moved:${id}:${position.x}:${position.y}:${excludeId}`),
  });

  movePlayer(repository, publisher, 'player-1', { x: 11, y: 22 });

  assert.deepEqual(calls, ['update:player-1:11:22', 'moved:player-1:11:22:player-1']);
});

test('leavePlayer removes the player and broadcasts departure', () => {
  const calls: string[] = [];
  const repository = createRepository({
    remove: (id) => calls.push(`remove:${id}`),
  });
  const publisher = createPublisher({
    broadcastPlayerLeft: (id) => calls.push(`left:${id}`),
  });

  leavePlayer(repository, publisher, 'player-1');

  assert.deepEqual(calls, ['remove:player-1', 'left:player-1']);
});

function createRepository(overrides: Partial<PlayerRepository>): PlayerRepository {
  return {
    add(player) {
      overrides.add?.(player);
    },
    remove(id) {
      overrides.remove?.(id);
    },
    update(id, position) {
      overrides.update?.(id, position);
    },
    getAll() {
      if (!overrides.getAll) {
        throw new Error('getAll override is required');
      }

      return overrides.getAll();
    },
  };
}

function createPublisher(overrides: Partial<PlayerEventPublisher>): PlayerEventPublisher {
  return {
    notifyJoined(toId, assignedPlayer, existingPlayers) {
      overrides.notifyJoined?.(toId, assignedPlayer, existingPlayers);
    },
    broadcastPlayerJoined(newPlayer, excludeId) {
      overrides.broadcastPlayerJoined?.(newPlayer, excludeId);
    },
    broadcastPlayerMoved(id, position, excludeId) {
      overrides.broadcastPlayerMoved?.(id, position, excludeId);
    },
    broadcastPlayerLeft(id) {
      overrides.broadcastPlayerLeft?.(id);
    },
  };
}
