import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  PLAYER_FRAME_HEIGHT,
  PLAYER_FRAME_WIDTH,
  PLAYER_FRAMES_PER_ROW,
  PLAYER_SPRITE_ROW_COUNT,
} from '../src/game/domain/playerSpriteSpec.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(__dirname, '..', 'public', 'assets');
// Full-resolution artwork (one tidy 4x4 grid of cats, transparent background).
const SOURCE_PATH = path.join(ASSET_DIR, 'cat-mike-source.png');
// Normalized spritesheet consumed by Phaser (PLAYER_FRAMES_PER_ROW x PLAYER_SPRITE_ROW_COUNT).
const ASSET_PATH = path.join(ASSET_DIR, 'cat-mike.png');

const FRAMES_PER_ROW = PLAYER_FRAMES_PER_ROW;
const ROW_COUNT = PLAYER_SPRITE_ROW_COUNT;
const SHEET_WIDTH = PLAYER_FRAME_WIDTH * FRAMES_PER_ROW;
const SHEET_HEIGHT = PLAYER_FRAME_HEIGHT * ROW_COUNT;
// Padding kept around each cat inside its cell so neighbouring frames never bleed.
const CELL_PADDING = 3;
const ALPHA_THRESHOLD = 20;

const { data, info } = await sharp(SOURCE_PATH)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const alphaAt = (x, y) => data[(y * width + x) * channels + 3];

// Collapse the source onto its X/Y axes and split into runs of "has any cat pixel".
const segmentsFor = (length, hasInk) => {
  const segments = [];
  let start = null;

  for (let i = 0; i < length; i += 1) {
    if (hasInk(i)) {
      if (start === null) start = i;
    } else if (start !== null) {
      segments.push([start, i - 1]);
      start = null;
    }
  }

  if (start !== null) segments.push([start, length - 1]);
  return segments;
};

const columnHasInk = (x) => {
  for (let y = 0; y < height; y += 1) {
    if (alphaAt(x, y) > ALPHA_THRESHOLD) return true;
  }
  return false;
};

const rowHasInk = (y) => {
  for (let x = 0; x < width; x += 1) {
    if (alphaAt(x, y) > ALPHA_THRESHOLD) return true;
  }
  return false;
};

const columns = segmentsFor(width, columnHasInk);
const rows = segmentsFor(height, rowHasInk);

if (columns.length !== FRAMES_PER_ROW || rows.length !== ROW_COUNT) {
  throw new Error(
    `Expected a ${FRAMES_PER_ROW}x${ROW_COUNT} cat grid but detected ` +
      `${columns.length} columns and ${rows.length} rows in ${SOURCE_PATH}`,
  );
};

// Tight bounding box of a single cat inside its grid cell.
const boundingBox = ([x0, x1], [y0, y1]) => {
  let minX = x1;
  let minY = y1;
  let maxX = x0;
  let maxY = y0;
  let found = false;

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (alphaAt(x, y) <= ALPHA_THRESHOLD) continue;
      found = true;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!found) throw new Error('Found an empty cell while slicing the cat grid');
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const boxes = rows.map((row) => columns.map((column) => boundingBox(column, row)));

// One shared scale keeps every cat the same physical size so the walk cycle does not pulse.
const largestSide = Math.max(...boxes.flat().flatMap((box) => [box.width, box.height]));
const scale = (PLAYER_FRAME_WIDTH - CELL_PADDING * 2) / largestSide;

const composites = [];

for (let row = 0; row < ROW_COUNT; row += 1) {
  for (let column = 0; column < FRAMES_PER_ROW; column += 1) {
    const box = boxes[row][column];
    const frameWidth = Math.max(1, Math.round(box.width * scale));
    const frameHeight = Math.max(1, Math.round(box.height * scale));

    // eslint-disable-next-line no-await-in-loop
    const frame = await sharp(data, { raw: { width, height, channels } })
      .extract(box)
      .resize(frameWidth, frameHeight)
      .png()
      .toBuffer();

    composites.push({
      input: frame,
      // Horizontally centered, bottom-aligned so every cat's feet sit on the same baseline.
      left: column * PLAYER_FRAME_WIDTH + Math.round((PLAYER_FRAME_WIDTH - frameWidth) / 2),
      top: row * PLAYER_FRAME_HEIGHT + (PLAYER_FRAME_HEIGHT - CELL_PADDING - frameHeight),
    });
  }
}

await sharp({
  create: {
    width: SHEET_WIDTH,
    height: SHEET_HEIGHT,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png()
  .toFile(ASSET_PATH);

console.log(`Wrote ${SHEET_WIDTH}x${SHEET_HEIGHT} spritesheet to ${ASSET_PATH}`);
