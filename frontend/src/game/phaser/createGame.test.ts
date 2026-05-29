import * as Phaser from 'phaser';
import { GAME_BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from '../../constants.ts';
import { DemoScene } from './DemoScene.ts';
import { createGame } from './createGame.ts';

const { destroyMock, gameConstructorMock } = vi.hoisted(() => {
  const destroy = vi.fn();
  const gameConstructor = vi.fn(function GameMock() {
    return { destroy };
  });

  return {
    destroyMock: destroy,
    gameConstructorMock: gameConstructor,
  };
});

vi.mock('phaser', () => ({
  AUTO: 'AUTO',
  Game: gameConstructorMock,
  Scene: class Scene {},
}));

beforeEach(() => {
  destroyMock.mockClear();
  gameConstructorMock.mockClear();
});

test('creates a Phaser game with the configured contract', () => {
  const parent = document.createElement('div');

  const game = createGame(parent);

  expect(gameConstructorMock).toHaveBeenCalledWith({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: GAME_BACKGROUND_COLOR,
    scene: [DemoScene],
  });
  expect(game).toEqual({ destroy: destroyMock });
});
