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
const ASSET_PATH = path.join(__dirname, '..', 'public', 'assets', 'cat-mike.png');
const FRAMES_PER_ROW = PLAYER_FRAMES_PER_ROW;
const ROW_COUNT = PLAYER_SPRITE_ROW_COUNT;
const SHEET_WIDTH = PLAYER_FRAME_WIDTH * FRAMES_PER_ROW;
const SHEET_HEIGHT = PLAYER_FRAME_HEIGHT * ROW_COUNT;

const metadata = await sharp(ASSET_PATH).metadata();

if (metadata.width === SHEET_WIDTH && metadata.height === SHEET_HEIGHT) {
  process.exit(0);
}

const frameBuffer = await sharp(ASSET_PATH)
  .resize(PLAYER_FRAME_WIDTH, PLAYER_FRAME_HEIGHT, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const composites = Array.from({ length: ROW_COUNT }, (_, row) =>
  Array.from({ length: FRAMES_PER_ROW }, (_, column) => ({
    input: frameBuffer,
    left: column * PLAYER_FRAME_WIDTH,
    top: row * PLAYER_FRAME_HEIGHT,
  })),
).flat();

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
