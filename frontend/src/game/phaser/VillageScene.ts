import * as Phaser from 'phaser';
import {
  PLAYER_AVATAR_KEY,
  PLAYER_AVATAR_PATH,
  PLAYER_DISPLAY_SIZE,
  PLAYER_SPEED_PIXELS_PER_SECOND,
  movePlayer,
} from '../domain/player.ts';
import {
  TILE_SIZE,
  VILLAGE_MAP,
  VILLAGE_TILESET_KEY,
  VILLAGE_TILESET_PATH,
  WORLD_PIXEL_HEIGHT,
  WORLD_PIXEL_WIDTH,
} from '../domain/villageMap.ts';

export class VillageScene extends Phaser.Scene {
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private player!: Phaser.GameObjects.Image;

  preload(): void {
    this.load.spritesheet(VILLAGE_TILESET_KEY, VILLAGE_TILESET_PATH, {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
    this.load.image(PLAYER_AVATAR_KEY, PLAYER_AVATAR_PATH);
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
    this.player = this.add
      .image(WORLD_PIXEL_WIDTH / 2, WORLD_PIXEL_HEIGHT / 2, PLAYER_AVATAR_KEY)
      .setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE)
      .setDepth(1);
    this.cameras.main.startFollow(this.player);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input is required');
    }

    this.cursorKeys = this.input.keyboard.createCursorKeys();
  }

  update(_time: number, delta: number): void {
    const nextPlayer = movePlayer(
      {
        x: this.player.x,
        y: this.player.y,
        width: this.player.displayWidth,
        height: this.player.displayHeight,
      },
      {
        horizontal: this.direction(this.cursorKeys.left, this.cursorKeys.right),
        vertical: this.direction(this.cursorKeys.up, this.cursorKeys.down),
      },
      PLAYER_SPEED_PIXELS_PER_SECOND * (delta / 1000),
      {
        width: WORLD_PIXEL_WIDTH,
        height: WORLD_PIXEL_HEIGHT,
      },
    );

    this.player.setPosition(nextPlayer.x, nextPlayer.y);
  }

  private direction(
    negativeKey: Phaser.Input.Keyboard.Key,
    positiveKey: Phaser.Input.Keyboard.Key,
  ): number {
    if (negativeKey.isDown) {
      return -1;
    }

    if (positiveKey.isDown) {
      return 1;
    }

    return 0;
  }
}
