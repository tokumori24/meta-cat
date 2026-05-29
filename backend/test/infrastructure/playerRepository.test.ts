import assert from 'node:assert/strict';
import test from 'node:test';
import { createInMemoryPlayerRepository } from '../../src/infrastructure/playerRepository.ts';

test('in-memory player repository stores and updates players', () => {
  const repository = createInMemoryPlayerRepository();

  repository.add({ id: 'player-1', position: { x: 1, y: 2 } });
  repository.update('player-1', { x: 3, y: 4 });

  assert.deepEqual(repository.getAll(), [{ id: 'player-1', position: { x: 3, y: 4 } }]);
});

test('in-memory player repository removes players', () => {
  const repository = createInMemoryPlayerRepository();

  repository.add({ id: 'player-1', position: { x: 1, y: 2 } });
  repository.remove('player-1');

  assert.deepEqual(repository.getAll(), []);
});

test('in-memory player repository fails fast when updating an unknown player', () => {
  const repository = createInMemoryPlayerRepository();

  assert.throws(() => repository.update('missing-player', { x: 3, y: 4 }), /Player not found: missing-player/);
});
