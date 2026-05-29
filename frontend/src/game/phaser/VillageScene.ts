import * as Phaser from 'phaser';
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
  PLAYER_SPEED_PIXELS_PER_SECOND,
  type MovementInput,
  movePlayer,
  resolvePlayerAnimationKey,
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
  private player!: Phaser.GameObjects.Sprite;

  preload(): void {
    this.load.spritesheet(VILLAGE_TILESET_KEY, VILLAGE_TILESET_PATH, {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
    this.load.spritesheet(PLAYER_AVATAR_KEY, PLAYER_AVATAR_PATH, {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT,
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
    this.player = this.add
      .sprite(WORLD_PIXEL_WIDTH / 2, WORLD_PIXEL_HEIGHT / 2, PLAYER_AVATAR_KEY)
      .setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE)
      .setDepth(1);
    this.cameras.main.startFollow(this.player);
    this.createPlayerAnimations();

    if (!this.input.keyboard) {
      throw new Error('Keyboard input is required');
    }

    this.cursorKeys = this.input.keyboard.createCursorKeys();
  }

  update(_time: number, delta: number): void {
    const movementInput: MovementInput = {
      horizontal: this.direction(this.cursorKeys.left, this.cursorKeys.right),
      vertical: this.direction(this.cursorKeys.up, this.cursorKeys.down),
    };
    const nextPlayer = movePlayer(
      {
        x: this.player.x,
        y: this.player.y,
        width: this.player.displayWidth,
        height: this.player.displayHeight,
      },
      movementInput,
      PLAYER_SPEED_PIXELS_PER_SECOND * (delta / 1000),
      {
        width: WORLD_PIXEL_WIDTH,
        height: WORLD_PIXEL_HEIGHT,
      },
    );

    this.player.setPosition(nextPlayer.x, nextPlayer.y);
    this.updatePlayerAnimation(movementInput);
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

  private createPlayerAnimations(): void {
    const animations = [
      { key: PLAYER_ANIM_WALK_DOWN, row: 0 },
      { key: PLAYER_ANIM_WALK_UP, row: 1 },
      { key: PLAYER_ANIM_WALK_LEFT, row: 2 },
      { key: PLAYER_ANIM_WALK_RIGHT, row: 3 },
    ] as const;

    for (const animation of animations) {
      this.anims.create({
        key: animation.key,
        frames: this.anims.generateFrameNumbers(PLAYER_AVATAR_KEY, {
          start: animation.row * PLAYER_FRAMES_PER_ROW,
          end: (animation.row + 1) * PLAYER_FRAMES_PER_ROW - 1,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  private updatePlayerAnimation(input: MovementInput): void {
    const animationKey = resolvePlayerAnimationKey(input);

    if (animationKey) {
      this.player.anims.play(animationKey, true);
      return;
    }

    this.player.anims.stop();
  }
}
