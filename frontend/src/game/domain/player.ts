export const PLAYER_AVATAR_KEY = 'cat-mike';
export const PLAYER_AVATAR_PATH = '/assets/cat-mike.png';
export const PLAYER_DISPLAY_SIZE = 48;
export {
  PLAYER_FRAME_HEIGHT,
  PLAYER_FRAMES_PER_ROW,
  PLAYER_FRAME_WIDTH,
  PLAYER_SPRITE_ROW_COUNT,
} from './playerSpriteSpec.mjs';
export const PLAYER_ANIM_WALK_DOWN = 'cat-walk-down';
export const PLAYER_ANIM_WALK_UP = 'cat-walk-up';
export const PLAYER_ANIM_WALK_LEFT = 'cat-walk-left';
export const PLAYER_ANIM_WALK_RIGHT = 'cat-walk-right';
export const PLAYER_SPEED_PIXELS_PER_SECOND = 180;

export type PlayerAnimationKey =
  | typeof PLAYER_ANIM_WALK_DOWN
  | typeof PLAYER_ANIM_WALK_UP
  | typeof PLAYER_ANIM_WALK_LEFT
  | typeof PLAYER_ANIM_WALK_RIGHT;

export interface Player {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface MovementInput {
  readonly horizontal: number;
  readonly vertical: number;
}

export interface WorldBounds {
  readonly width: number;
  readonly height: number;
}

const assertFiniteNumber = (name: string, value: number): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
};

const assertPositiveFiniteNumber = (name: string, value: number): void => {
  assertFiniteNumber(name, value);

  if (value <= 0) {
    throw new Error(`${name} must be greater than zero`);
  }
};

const assertNonNegativeFiniteNumber = (name: string, value: number): void => {
  assertFiniteNumber(name, value);

  if (value < 0) {
    throw new Error(`${name} must be zero or greater`);
  }
};

const assertPlayerFitsBounds = (player: Player, bounds: WorldBounds): void => {
  if (player.width > bounds.width || player.height > bounds.height) {
    throw new Error('Player must fit within world bounds');
  }
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const movePlayer = (
  player: Player,
  input: MovementInput,
  distance: number,
  bounds: WorldBounds,
): Player => {
  assertFiniteNumber('player x', player.x);
  assertFiniteNumber('player y', player.y);
  assertPositiveFiniteNumber('player width', player.width);
  assertPositiveFiniteNumber('player height', player.height);
  assertFiniteNumber('horizontal input', input.horizontal);
  assertFiniteNumber('vertical input', input.vertical);
  assertNonNegativeFiniteNumber('distance', distance);
  assertPositiveFiniteNumber('world width', bounds.width);
  assertPositiveFiniteNumber('world height', bounds.height);
  assertPlayerFitsBounds(player, bounds);

  const halfWidth = player.width / 2;
  const halfHeight = player.height / 2;

  return {
    ...player,
    x: clamp(player.x + input.horizontal * distance, halfWidth, bounds.width - halfWidth),
    y: clamp(player.y + input.vertical * distance, halfHeight, bounds.height - halfHeight),
  };
};

export const resolvePlayerAnimationKey = (input: MovementInput): PlayerAnimationKey | null => {
  assertFiniteNumber('horizontal input', input.horizontal);
  assertFiniteNumber('vertical input', input.vertical);

  if (input.vertical < 0) {
    return PLAYER_ANIM_WALK_UP;
  }

  if (input.vertical > 0) {
    return PLAYER_ANIM_WALK_DOWN;
  }

  if (input.horizontal < 0) {
    return PLAYER_ANIM_WALK_LEFT;
  }

  if (input.horizontal > 0) {
    return PLAYER_ANIM_WALK_RIGHT;
  }

  return null;
};
