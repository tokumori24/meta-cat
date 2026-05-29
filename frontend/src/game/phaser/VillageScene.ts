import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../constants.ts';
import {
  TILE_SIZE,
  VILLAGE_MAP,
  VILLAGE_TILESET_KEY,
  VILLAGE_TILESET_PATH,
  WORLD_PIXEL_HEIGHT,
  WORLD_PIXEL_WIDTH,
} from '../domain/villageMap.ts';

const CAMERA_SPEED_PIXELS_PER_SECOND = 260;

export class VillageScene extends Phaser.Scene {
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;

  preload(): void {
    this.load.spritesheet(VILLAGE_TILESET_KEY, VILLAGE_TILESET_PATH, {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
  }

  create(): void {
    const mapData = VILLAGE_MAP.map((row) => [...row]);
    const map = this.make.tilemap({
      data: mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage(VILLAGE_TILESET_KEY, VILLAGE_TILESET_KEY, TILE_SIZE, TILE_SIZE);

    if (!tileset) {
      throw new Error('Village tileset is required');
    }

    const layer = map.createLayer(0, tileset, 0, 0);

    if (!layer) {
      throw new Error('Village tile layer is required');
    }

    layer.setDepth(0);
    this.cameras.main.setBounds(0, 0, WORLD_PIXEL_WIDTH, WORLD_PIXEL_HEIGHT);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input is required');
    }

    this.cursorKeys = this.input.keyboard.createCursorKeys();
  }

  update(_time: number, delta: number): void {
    const distance = CAMERA_SPEED_PIXELS_PER_SECOND * (delta / 1000);
    const camera = this.cameras.main;

    const nextScrollX =
      camera.scrollX + this.horizontalDirection() * distance;
    const nextScrollY =
      camera.scrollY + this.verticalDirection() * distance;

    camera.scrollX = Phaser.Math.Clamp(nextScrollX, 0, WORLD_PIXEL_WIDTH - GAME_WIDTH);
    camera.scrollY = Phaser.Math.Clamp(nextScrollY, 0, WORLD_PIXEL_HEIGHT - GAME_HEIGHT);
  }

  private horizontalDirection(): number {
    if (this.cursorKeys.left.isDown) {
      return -1;
    }

    if (this.cursorKeys.right.isDown) {
      return 1;
    }

    return 0;
  }

  private verticalDirection(): number {
    if (this.cursorKeys.up.isDown) {
      return -1;
    }

    if (this.cursorKeys.down.isDown) {
      return 1;
    }

    return 0;
  }
}
