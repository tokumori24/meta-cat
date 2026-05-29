import * as Phaser from 'phaser';
import { BACKEND_WS_URL, GAME_HEIGHT, GAME_WIDTH } from '../../constants.ts';
import {
  TILE_SIZE,
  VILLAGE_MAP,
  VILLAGE_TILESET_KEY,
  VILLAGE_TILESET_PATH,
  WORLD_PIXEL_HEIGHT,
  WORLD_PIXEL_WIDTH,
} from '../domain/villageMap.ts';
import { connectToServer, type ServerConnection } from '../network/serverConnection.ts';

const CAMERA_SPEED_PIXELS_PER_SECOND = 260;
const REMOTE_PLAYER_COLOR = 0xff4444;
const REMOTE_PLAYER_RADIUS = 8;
const REMOTE_PLAYER_DEPTH = 1;

export class VillageScene extends Phaser.Scene {
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private connection: ServerConnection | null = null;
  private readonly remotePlayers = new Map<string, Phaser.GameObjects.Graphics>();
  private lastSentPosition: { readonly x: number; readonly y: number } | null = null;

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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.connection = connectToServer(BACKEND_WS_URL, {
      onWelcome: (_playerId, currentPlayers) => {
        for (const player of currentPlayers) {
          this.addRemotePlayer(player.playerId, player.x, player.y);
        }
      },
      onPlayerJoined: (playerId, x, y) => {
        this.addRemotePlayer(playerId, x, y);
      },
      onPlayerMoved: (playerId, x, y) => {
        this.updateRemotePlayer(playerId, x, y);
      },
      onPlayerLeft: (playerId) => {
        this.removeRemotePlayer(playerId);
      },
    });
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

  private sendCurrentPosition(): void {
    const position = this.currentPlayerPosition();

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

  private currentPlayerPosition(): { readonly x: number; readonly y: number } {
    const camera = this.cameras.main;

    return {
      x: Math.round(camera.scrollX + GAME_WIDTH / 2),
      y: Math.round(camera.scrollY + GAME_HEIGHT / 2),
    };
  }

  private addRemotePlayer(id: string, x: number, y: number): void {
    const existingPlayer = this.remotePlayers.get(id);

    if (existingPlayer) {
      existingPlayer.setPosition(x, y);
      return;
    }

    const remotePlayer = this.add.graphics();

    remotePlayer.fillStyle(REMOTE_PLAYER_COLOR);
    remotePlayer.fillCircle(0, 0, REMOTE_PLAYER_RADIUS);
    remotePlayer.setPosition(x, y);
    remotePlayer.setDepth(REMOTE_PLAYER_DEPTH);
    this.remotePlayers.set(id, remotePlayer);
  }

  private updateRemotePlayer(id: string, x: number, y: number): void {
    const remotePlayer = this.remotePlayers.get(id);

    if (!remotePlayer) {
      this.addRemotePlayer(id, x, y);
      return;
    }

    remotePlayer.setPosition(x, y);
  }

  private removeRemotePlayer(id: string): void {
    const remotePlayer = this.remotePlayers.get(id);

    if (!remotePlayer) {
      return;
    }

    remotePlayer.destroy();
    this.remotePlayers.delete(id);
  }
}
