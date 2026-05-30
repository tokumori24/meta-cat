import * as Phaser from 'phaser';
import { GAME_BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from '../../constants.ts';
import { VillageScene } from './VillageScene.ts';
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
  const onPlayerReady = vi.fn();

  const game = createGame(parent, { onPlayerReady });

  const firstCall = gameConstructorMock.mock.calls[0];

  if (!firstCall) {
    throw new Error('Phaser game constructor call is required');
  }

  const [config] = firstCall as unknown as [Phaser.Types.Core.GameConfig];
  expect(config).toMatchObject({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: GAME_BACKGROUND_COLOR,
  });
  expect(config.scene).toHaveLength(1);
  expect((config.scene as unknown[])[0]).toBeInstanceOf(VillageScene);
  expect(game).toEqual({ destroy: destroyMock });
});
