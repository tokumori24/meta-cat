import * as Phaser from 'phaser';
import { GAME_BACKGROUND_COLOR } from '../../constants.ts';
import type { CatCollisionEvent } from '../domain/catCollision.ts';
import { VillageScene } from './VillageScene.ts';

export type CreateGameOptions = {
  onPlayerReady?: (playerId: string) => void;
  onCatCollision?: (event: CatCollisionEvent) => void;
};

export function createGame(parent: HTMLElement, options: CreateGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: GAME_BACKGROUND_COLOR,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [new VillageScene(options.onPlayerReady, options.onCatCollision)],
  });
}
