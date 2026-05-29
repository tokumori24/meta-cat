import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlayer, withPosition } from '../../src/domain/player.ts';

test('createPlayer creates a player with the provided id and position', () => {
  const player = createPlayer('player-1', { x: 10, y: 20 });

  assert.deepEqual(player, { id: 'player-1', position: { x: 10, y: 20 } });
});

test('withPosition returns a player with an updated position', () => {
  const player = createPlayer('player-1', { x: 10, y: 20 });

  const updated = withPosition(player, { x: 30, y: 40 });

  assert.deepEqual(updated, { id: 'player-1', position: { x: 30, y: 40 } });
  assert.deepEqual(player, { id: 'player-1', position: { x: 10, y: 20 } });
});
