import {
  PLAYER_ANIM_WALK_DOWN,
  PLAYER_ANIM_WALK_LEFT,
  PLAYER_ANIM_WALK_RIGHT,
  PLAYER_ANIM_WALK_UP,
  PLAYER_AVATAR_KEY,
  PLAYER_AVATAR_PATH,
  PLAYER_DISPLAY_SIZE,
  PLAYER_FRAMES_PER_ROW,
  PLAYER_FRAME_HEIGHT,
  PLAYER_FRAME_WIDTH,
  PLAYER_SPRITE_ROW_COUNT,
  PLAYER_SPEED_PIXELS_PER_SECOND,
  movePlayer,
  resolvePlayerAnimationKey,
} from './player.ts';

const PLAYER = {
  x: 50,
  y: 50,
  width: 20,
  height: 30,
} as const;

const BOUNDS = {
  width: 100,
  height: 120,
} as const;

test('defines the cat avatar asset contract', () => {
  expect(PLAYER_AVATAR_KEY).toBe('cat-mike');
  expect(PLAYER_AVATAR_PATH).toBe('/assets/cat-mike.png');
  expect(PLAYER_DISPLAY_SIZE).toBe(48);
  expect(PLAYER_SPEED_PIXELS_PER_SECOND).toBe(180);
});

test('defines the cat avatar spritesheet contract', () => {
  expect(PLAYER_FRAME_WIDTH).toBe(64);
  expect(PLAYER_FRAME_HEIGHT).toBe(64);
  expect(PLAYER_FRAMES_PER_ROW).toBe(4);
  expect(PLAYER_SPRITE_ROW_COUNT).toBe(4);
  expect(PLAYER_ANIM_WALK_DOWN).toBe('cat-walk-down');
  expect(PLAYER_ANIM_WALK_UP).toBe('cat-walk-up');
  expect(PLAYER_ANIM_WALK_LEFT).toBe('cat-walk-left');
  expect(PLAYER_ANIM_WALK_RIGHT).toBe('cat-walk-right');
});

test('moves the player by input direction and distance', () => {
  const moved = movePlayer(
    PLAYER,
    { horizontal: 1, vertical: -1 },
    12,
    BOUNDS,
  );

  expect(moved).toEqual({
    ...PLAYER,
    x: 62,
    y: 38,
  });
});

test('clamps the player inside world bounds', () => {
  const moved = movePlayer(
    PLAYER,
    { horizontal: 1, vertical: -1 },
    100,
    BOUNDS,
  );

  expect(moved).toEqual({
    ...PLAYER,
    x: 90,
    y: 15,
  });
});

test('throws when the player cannot fit inside the world', () => {
  expect(() =>
    movePlayer(
      { ...PLAYER, width: 101 },
      { horizontal: 0, vertical: 0 },
      0,
      BOUNDS,
    ),
  ).toThrow('Player must fit within world bounds');
});

test('throws when movement distance is negative', () => {
  expect(() =>
    movePlayer(
      PLAYER,
      { horizontal: 0, vertical: 0 },
      -1,
      BOUNDS,
    ),
  ).toThrow('distance must be zero or greater');
});

test('resolves the player animation key from movement input', () => {
  expect(resolvePlayerAnimationKey({ horizontal: 0, vertical: -1 })).toBe(PLAYER_ANIM_WALK_UP);
  expect(resolvePlayerAnimationKey({ horizontal: 0, vertical: 1 })).toBe(PLAYER_ANIM_WALK_DOWN);
  expect(resolvePlayerAnimationKey({ horizontal: -1, vertical: 0 })).toBe(PLAYER_ANIM_WALK_LEFT);
  expect(resolvePlayerAnimationKey({ horizontal: 1, vertical: 0 })).toBe(PLAYER_ANIM_WALK_RIGHT);
  expect(resolvePlayerAnimationKey({ horizontal: 0, vertical: 0 })).toBeNull();
});

test('prioritizes vertical player animation over horizontal animation', () => {
  expect(resolvePlayerAnimationKey({ horizontal: 1, vertical: -1 })).toBe(PLAYER_ANIM_WALK_UP);
  expect(resolvePlayerAnimationKey({ horizontal: -1, vertical: 1 })).toBe(PLAYER_ANIM_WALK_DOWN);
});
