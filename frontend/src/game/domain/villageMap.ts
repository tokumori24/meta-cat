export const VILLAGE_TILESET_KEY = 'kenney-tiny-town';
export const VILLAGE_TILESET_PATH = '/assets/tilemap_packed.png';
export const TILE_SIZE = 16;

export const WORLD_COLUMNS = 64;
export const WORLD_ROWS = 48;
export const WORLD_PIXEL_WIDTH = WORLD_COLUMNS * TILE_SIZE;
export const WORLD_PIXEL_HEIGHT = WORLD_ROWS * TILE_SIZE;

export type TileIndex = number;
export type TileRow = readonly TileIndex[];
export type VillageMap = readonly TileRow[];

const TILESET_COLUMNS = 12;

const tileAt = (row: number, column: number): TileIndex => row * TILESET_COLUMNS + column;

const TILE = {
  grass: tileAt(0, 0),
  grassFlowers: tileAt(0, 1),
  path: tileAt(1, 0),
  pathFlowers: tileAt(1, 1),
  fenceHorizontal: tileAt(5, 9),
  fenceVertical: tileAt(5, 11),
  treeRound: tileAt(0, 4),
  treeTall: tileAt(0, 2),
  well: tileAt(6, 8),
  cart: tileAt(7, 9),
  bench: tileAt(8, 11),
} as const;

const HOUSE_PATTERNS = {
  blue: [
    [tileAt(2, 0), tileAt(2, 1), tileAt(2, 2)],
    [tileAt(3, 0), tileAt(3, 1), tileAt(3, 2)],
    [tileAt(4, 0), tileAt(4, 1), tileAt(4, 2)],
  ],
  orange: [
    [tileAt(2, 4), tileAt(2, 5), tileAt(2, 6)],
    [tileAt(3, 4), tileAt(3, 5), tileAt(3, 6)],
    [tileAt(4, 4), tileAt(4, 5), tileAt(4, 6)],
  ],
  workshop: [
    [tileAt(1, 8), tileAt(1, 9), tileAt(1, 10), tileAt(1, 11)],
    [tileAt(2, 8), tileAt(2, 9), tileAt(2, 10), tileAt(2, 11)],
    [tileAt(3, 8), tileAt(3, 9), tileAt(3, 10), tileAt(3, 11)],
  ],
} as const;

export const HOUSE_TILE_INDICES = [...new Set(Object.values(HOUSE_PATTERNS).flat(2))] as readonly TileIndex[];

export const CASTLE_TILE_INDICES = [
  tileAt(5, 0),
  tileAt(5, 1),
  tileAt(5, 2),
  tileAt(5, 3),
  tileAt(5, 4),
  tileAt(5, 5),
  tileAt(5, 6),
  tileAt(6, 0),
  tileAt(6, 1),
  tileAt(6, 2),
  tileAt(6, 3),
  tileAt(6, 4),
  tileAt(6, 5),
  tileAt(6, 6),
  tileAt(7, 0),
  tileAt(7, 1),
  tileAt(7, 2),
  tileAt(7, 3),
  tileAt(7, 4),
  tileAt(7, 5),
  tileAt(7, 6),
  tileAt(8, 0),
  tileAt(8, 1),
  tileAt(8, 2),
  tileAt(8, 3),
  tileAt(8, 4),
  tileAt(8, 5),
  tileAt(8, 6),
  tileAt(9, 0),
  tileAt(9, 1),
  tileAt(9, 2),
  tileAt(9, 3),
  tileAt(9, 4),
  tileAt(9, 5),
  tileAt(9, 6),
  tileAt(10, 0),
  tileAt(10, 1),
  tileAt(10, 2),
  tileAt(10, 3),
  tileAt(10, 4),
  tileAt(10, 5),
  tileAt(10, 6),
] as const;

type TilePatch = readonly TileRow[];

interface TilePlacement {
  readonly x: number;
  readonly y: number;
  readonly patch: TilePatch;
}

const withTile = (map: VillageMap, x: number, y: number, tile: TileIndex): VillageMap =>
  map.map((row, rowIndex) =>
    rowIndex === y
      ? row.map((current, columnIndex) => (columnIndex === x ? tile : current))
      : row,
  );

const withPatch = (map: VillageMap, placement: TilePlacement): VillageMap =>
  placement.patch.reduce(
    (rows, patchRow, patchY) =>
      patchRow.reduce(
        (currentRows, tile, patchX) =>
          withTile(currentRows, placement.x + patchX, placement.y + patchY, tile),
        rows,
      ),
    map,
  );

const withHorizontalLine = (
  map: VillageMap,
  y: number,
  fromX: number,
  toX: number,
  tile: TileIndex,
): VillageMap =>
  map.map((row, rowIndex) =>
    rowIndex === y
      ? row.map((current, columnIndex) =>
          columnIndex >= fromX && columnIndex <= toX ? tile : current,
        )
      : row,
  );

const withVerticalLine = (
  map: VillageMap,
  x: number,
  fromY: number,
  toY: number,
  tile: TileIndex,
): VillageMap =>
  map.map((row, rowIndex) =>
    rowIndex >= fromY && rowIndex <= toY
      ? row.map((current, columnIndex) => (columnIndex === x ? tile : current))
      : row,
  );

const buildGrassField = (): VillageMap =>
  Array.from({ length: WORLD_ROWS }, (_, row) =>
    Array.from({ length: WORLD_COLUMNS }, (_, column) =>
      (row + column) % 13 === 0
        ? TILE.grassFlowers
        : TILE.grass,
    ),
  );

const buildVillageRoads = (map: VillageMap): VillageMap => {
  const horizontal = withHorizontalLine(map, 24, 4, 58, TILE.path);
  const vertical = withVerticalLine(horizontal, 31, 7, 42, TILE.path);
  const northLane = withHorizontalLine(vertical, 13, 11, 47, TILE.path);
  return withVerticalLine(northLane, 14, 13, 24, TILE.pathFlowers);
};

const buildVillageHouses = (map: VillageMap): VillageMap => {
  const placements: readonly TilePlacement[] = [
    { x: 9, y: 9, patch: HOUSE_PATTERNS.blue },
    { x: 22, y: 9, patch: HOUSE_PATTERNS.orange },
    { x: 39, y: 10, patch: HOUSE_PATTERNS.workshop },
    { x: 15, y: 29, patch: HOUSE_PATTERNS.orange },
    { x: 33, y: 30, patch: HOUSE_PATTERNS.blue },
    { x: 48, y: 28, patch: HOUSE_PATTERNS.orange },
  ];

  return placements.reduce((rows, placement) => withPatch(rows, placement), map);
};

const buildVillageDetails = (map: VillageMap): VillageMap => {
  const details: readonly TilePlacement[] = [
    { x: 5, y: 6, patch: [[TILE.treeTall]] },
    { x: 7, y: 7, patch: [[TILE.treeRound]] },
    { x: 54, y: 9, patch: [[TILE.treeTall]] },
    { x: 57, y: 11, patch: [[TILE.treeRound]] },
    { x: 10, y: 35, patch: [[TILE.treeRound]] },
    { x: 43, y: 37, patch: [[TILE.treeTall]] },
    { x: 27, y: 22, patch: [[TILE.well]] },
    { x: 36, y: 23, patch: [[TILE.cart]] },
    { x: 51, y: 23, patch: [[TILE.bench]] },
  ];

  const withDetails = details.reduce((rows, placement) => withPatch(rows, placement), map);
  const northFence = withHorizontalLine(withDetails, 6, 8, 46, TILE.fenceHorizontal);
  const southFence = withHorizontalLine(northFence, 39, 8, 53, TILE.fenceHorizontal);
  const westFence = withVerticalLine(southFence, 7, 7, 38, TILE.fenceVertical);
  return withVerticalLine(westFence, 54, 12, 38, TILE.fenceVertical);
};

export const buildVillageMap = (): VillageMap =>
  buildVillageDetails(buildVillageHouses(buildVillageRoads(buildGrassField())));

export const VILLAGE_MAP = buildVillageMap();
