import * as Phaser from 'phaser';
import { GAME_BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from '../../constants.ts';
import { VillageScene } from './VillageScene.ts';

export type CreateGameOptions = {
  onPlayerReady?: (playerId: string) => void;
};

export function createGame(parent: HTMLElement, options: CreateGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: GAME_BACKGROUND_COLOR,
    scene: [new VillageScene(options.onPlayerReady)],
  });
}
