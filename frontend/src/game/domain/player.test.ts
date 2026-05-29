import {
  PLAYER_AVATAR_KEY,
  PLAYER_AVATAR_PATH,
  PLAYER_DISPLAY_SIZE,
  PLAYER_SPEED_PIXELS_PER_SECOND,
  movePlayer,
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
