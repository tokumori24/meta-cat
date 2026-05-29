import {
  CASTLE_TILE_INDICES,
  HOUSE_TILE_INDICES,
  TILE_SIZE,
  VILLAGE_MAP,
  VILLAGE_TILESET_KEY,
  VILLAGE_TILESET_PATH,
  WORLD_COLUMNS,
  WORLD_PIXEL_HEIGHT,
  WORLD_PIXEL_WIDTH,
  WORLD_ROWS,
  buildVillageMap,
} from './villageMap.ts';
import { GAME_HEIGHT, GAME_WIDTH } from '../../constants.ts';

test('defines the Kenney Tiny Town tileset contract', () => {
  expect(VILLAGE_TILESET_KEY).toBe('kenney-tiny-town');
  expect(VILLAGE_TILESET_PATH).toBe('/assets/tilemap_packed.png');
  expect(TILE_SIZE).toBe(16);
});

test('builds a scrollable world larger than the viewport', () => {
  expect(VILLAGE_MAP).toHaveLength(WORLD_ROWS);
  expect(VILLAGE_MAP.every((row) => row.length === WORLD_COLUMNS)).toBe(true);
  expect(WORLD_PIXEL_WIDTH).toBe(1024);
  expect(WORLD_PIXEL_HEIGHT).toBe(768);
  expect(WORLD_PIXEL_WIDTH).toBeGreaterThan(GAME_WIDTH);
  expect(WORLD_PIXEL_HEIGHT).toBeGreaterThan(GAME_HEIGHT);
});

test('uses only non-negative integer tile indices', () => {
  const tiles = VILLAGE_MAP.flat();

  expect(tiles.every((tile) => Number.isInteger(tile) && tile >= 0)).toBe(true);
});

test('keeps grass as the primary village ground tile', () => {
  const tileCounts = VILLAGE_MAP.flat().reduce(
    (counts, tile) => {
      const currentCount = counts.get(tile);
      const nextCount = currentCount === undefined ? 1 : currentCount + 1;

      return counts.set(tile, nextCount);
    },
    new Map<number, number>(),
  );
  const mostUsedTileCount = Math.max(...tileCounts.values());
  const totalTileCount = WORLD_COLUMNS * WORLD_ROWS;

  expect(mostUsedTileCount / totalTileCount).toBeGreaterThan(0.5);
});

test('places several house patterns in the village', () => {
  const tiles = VILLAGE_MAP.flat();
  const houseTiles = tiles.filter((tile) => HOUSE_TILE_INDICES.includes(tile));

  expect(houseTiles.length).toBeGreaterThanOrEqual(18);
});

test('does not place castle tiles in the village map', () => {
  const castleTiles = new Set(CASTLE_TILE_INDICES);

  expect(VILLAGE_MAP.flat().some((tile) => castleTiles.has(tile))).toBe(false);
});

test('buildVillageMap returns a fresh map instance', () => {
  const firstMap = buildVillageMap();
  const secondMap = buildVillageMap();

  expect(firstMap).toEqual(secondMap);
  expect(firstMap).not.toBe(secondMap);
  expect(firstMap[0]).not.toBe(secondMap[0]);
});
