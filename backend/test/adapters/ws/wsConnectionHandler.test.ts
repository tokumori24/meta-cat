import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player } from '../../../src/domain/player.ts';
import { createWsConnectionHandler } from '../../../src/adapters/ws/wsConnectionHandler.ts';
import type { PlayerEventPublisher, PlayerRepository } from '../../../src/usecases/playerPorts.ts';

test('connection handler routes connect, move, and close events to use cases', () => {
  const calls: string[] = [];
  const players = new Map<string, Player>();
  const repository: PlayerRepository = {
    add(player) {
      calls.push(`add:${player.id}`);
      players.set(player.id, player);
    },
    remove(id) {
      calls.push(`remove:${id}`);
      players.delete(id);
    },
    update(id, position) {
      calls.push(`update:${id}:${position.x}:${position.y}`);
      const player = players.get(id);

      if (!player) {
        throw new Error('player is required');
      }

      players.set(id, { ...player, position });
    },
    getAll() {
      return [...players.values()];
    },
  };
  const publisher: PlayerEventPublisher = {
    notifyJoined: (toId) => calls.push(`welcome:${toId}`),
    broadcastPlayerJoined: (player, excludeId) => calls.push(`joined:${player.id}:${excludeId}`),
    broadcastPlayerMoved: (id, position, excludeId) => calls.push(`moved:${id}:${position.x}:${position.y}:${excludeId}`),
    broadcastPlayerLeft: (id) => calls.push(`left:${id}`),
  };
  const handler = createWsConnectionHandler(repository, publisher);

  handler.onConnect('player-1');
  handler.onMessage('player-1', JSON.stringify({ type: 'move', x: 5, y: 6 }));
  handler.onMessage('player-1', JSON.stringify({ type: 'unknown', x: 7, y: 8 }));
  handler.onClose('player-1');

  assert.deepEqual(calls, [
    'add:player-1',
    'welcome:player-1',
    'joined:player-1:player-1',
    'update:player-1:5:6',
    'moved:player-1:5:6:player-1',
    'remove:player-1',
    'left:player-1',
  ]);
});
