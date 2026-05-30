import {
  CAT_COLLISION_COOLDOWN_MS,
  CAT_COLLISION_EVENT_TYPE,
  areCatsOverlapping,
  canEmitCatCollision,
  createCatCollisionEvent,
} from './catCollision.ts';

test('createCatCollisionEvent creates the cat collision contract', () => {
  expect(createCatCollisionEvent({
    roomName: 'village',
    fromCatId: 'cat-1',
    toCatId: 'cat-2',
    occurredAt: '2026-05-30T00:00:00.000Z',
  })).toEqual({
    type: CAT_COLLISION_EVENT_TYPE,
    roomName: 'village',
    fromCatId: 'cat-1',
    toCatId: 'cat-2',
    occurredAt: '2026-05-30T00:00:00.000Z',
  });
});

test('createCatCollisionEvent rejects missing required values', () => {
  expect(() => createCatCollisionEvent({
    roomName: ' ',
    fromCatId: 'cat-1',
    toCatId: 'cat-2',
    occurredAt: '2026-05-30T00:00:00.000Z',
  })).toThrow('roomName is required');
});

test('canEmitCatCollision allows the first collision and blocks cooldown period', () => {
  expect(canEmitCatCollision(1000, null)).toBe(true);
  expect(canEmitCatCollision(1000 + CAT_COLLISION_COOLDOWN_MS - 1, 1000)).toBe(false);
  expect(canEmitCatCollision(1000 + CAT_COLLISION_COOLDOWN_MS, 1000)).toBe(true);
});

test('areCatsOverlapping detects centered cat bounds intersection', () => {
  expect(areCatsOverlapping(
    { x: 50, y: 50, width: 20, height: 20 },
    { x: 60, y: 50, width: 20, height: 20 },
  )).toBe(true);
  expect(areCatsOverlapping(
    { x: 50, y: 50, width: 20, height: 20 },
    { x: 80, y: 50, width: 20, height: 20 },
  )).toBe(false);
});
