export const CAT_COLLISION_EVENT_TYPE = 'cat_collision';
export const CAT_COLLISION_TOPIC = 'cat_collision';
export const CAT_COLLISION_COOLDOWN_MS = 2000;

export type CatCollisionEvent = {
  type: typeof CAT_COLLISION_EVENT_TYPE;
  roomName: string;
  fromCatId: string;
  toCatId: string;
  occurredAt: string;
};

export type CatCollisionInput = {
  roomName: string;
  fromCatId: string;
  toCatId: string;
  occurredAt: string;
};

export type CatBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function createCatCollisionEvent(input: CatCollisionInput): CatCollisionEvent {
  assertNonEmpty(input.roomName, 'roomName');
  assertNonEmpty(input.fromCatId, 'fromCatId');
  assertNonEmpty(input.toCatId, 'toCatId');
  assertNonEmpty(input.occurredAt, 'occurredAt');

  return {
    type: CAT_COLLISION_EVENT_TYPE,
    roomName: input.roomName,
    fromCatId: input.fromCatId,
    toCatId: input.toCatId,
    occurredAt: input.occurredAt,
  };
}

export function canEmitCatCollision(
  nowMs: number,
  lastEmittedAtMs: number | null,
): boolean {
  return lastEmittedAtMs === null || nowMs - lastEmittedAtMs >= CAT_COLLISION_COOLDOWN_MS;
}

export function areCatsOverlapping(first: CatBounds, second: CatBounds): boolean {
  const firstLeft = first.x - first.width / 2;
  const firstRight = first.x + first.width / 2;
  const firstTop = first.y - first.height / 2;
  const firstBottom = first.y + first.height / 2;
  const secondLeft = second.x - second.width / 2;
  const secondRight = second.x + second.width / 2;
  const secondTop = second.y - second.height / 2;
  const secondBottom = second.y + second.height / 2;

  return firstLeft < secondRight
    && firstRight > secondLeft
    && firstTop < secondBottom
    && firstBottom > secondTop;
}

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
}
