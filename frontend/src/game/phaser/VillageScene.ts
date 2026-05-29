import * as Phaser from 'phaser';
import { BACKEND_WS_URL } from '../../constants.ts';
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
import { connectToServer, type ServerConnection } from '../network/serverConnection.ts';

const PLAYER_DEPTH = 1;

export class VillageScene extends Phaser.Scene {
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private player!: Phaser.GameObjects.Sprite;
  private connection: ServerConnection | null = null;
  private readonly remotePlayers = new Map<string, Phaser.GameObjects.Sprite>();
  private lastSentPosition: { readonly x: number; readonly y: number } | null = null;

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
    this.createPlayerAnimations();
    this.player = this.createAvatar(WORLD_PIXEL_WIDTH / 2, WORLD_PIXEL_HEIGHT / 2);
    this.cameras.main.startFollow(this.player);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input is required');
    }

    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.connection = connectToServer(BACKEND_WS_URL, {
      onWelcome: (_playerId, currentPlayers) => {
        for (const player of currentPlayers) {
          this.upsertRemotePlayer(player.playerId, player.x, player.y);
        }
      },
      onPlayerJoined: (playerId, x, y) => {
        this.upsertRemotePlayer(playerId, x, y);
      },
      onPlayerMoved: (playerId, x, y) => {
        this.upsertRemotePlayer(playerId, x, y);
      },
      onPlayerLeft: (playerId) => {
        this.removeRemotePlayer(playerId);
      },
    });
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
    this.updateAvatarAnimation(this.player, movementInput);
    this.sendCurrentPosition();
  }

  shutdown(): void {
    this.connection?.close();
    this.connection = null;
    this.lastSentPosition = null;

    for (const remotePlayer of this.remotePlayers.values()) {
      remotePlayer.destroy();
    }

    this.remotePlayers.clear();
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

  private sendCurrentPosition(): void {
    const position = {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
    };

    if (
      this.lastSentPosition
      && this.lastSentPosition.x === position.x
      && this.lastSentPosition.y === position.y
    ) {
      return;
    }

    this.lastSentPosition = position;
    this.connection?.sendMove(position.x, position.y);
  }

  // Every player shares the same cat avatar, so remote players reuse the local
  // animation set and infer their facing direction from how far they moved.
  private upsertRemotePlayer(id: string, x: number, y: number): void {
    const existingPlayer = this.remotePlayers.get(id);

    if (!existingPlayer) {
      this.remotePlayers.set(id, this.createAvatar(x, y));
      return;
    }

    this.updateAvatarAnimation(existingPlayer, {
      horizontal: Math.sign(x - existingPlayer.x),
      vertical: Math.sign(y - existingPlayer.y),
    });
    existingPlayer.setPosition(x, y);
  }

  private removeRemotePlayer(id: string): void {
    const remotePlayer = this.remotePlayers.get(id);

    if (!remotePlayer) {
      return;
    }

    remotePlayer.destroy();
    this.remotePlayers.delete(id);
  }

  private createAvatar(x: number, y: number): Phaser.GameObjects.Sprite {
    return this.add
      .sprite(x, y, PLAYER_AVATAR_KEY)
      .setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE)
      .setDepth(PLAYER_DEPTH);
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

  private updateAvatarAnimation(sprite: Phaser.GameObjects.Sprite, input: MovementInput): void {
    const animationKey = resolvePlayerAnimationKey(input);

    if (animationKey) {
      sprite.anims.play(animationKey, true);
      return;
    }

    sprite.anims.stop();
  }
}
