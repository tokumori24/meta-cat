import { render } from '@testing-library/react';
import { GAME_CONTAINER_ID } from '../../constants.ts';
import { PhaserGame } from './PhaserGame.tsx';

const { createGameMock, destroyMock } = vi.hoisted(() => {
  const destroy = vi.fn();
  const createGame = vi.fn(() => ({ destroy }));

  return {
    createGameMock: createGame,
    destroyMock: destroy,
  };
});

vi.mock('../phaser/createGame.ts', () => ({
  createGame: createGameMock,
}));

beforeEach(() => {
  createGameMock.mockClear();
  destroyMock.mockClear();
});

test('creates the Phaser game in the configured container', () => {
  const { container } = render(<PhaserGame />);

  const gameContainer = container.querySelector(`#${GAME_CONTAINER_ID}`);

  expect(gameContainer).toBeInstanceOf(HTMLDivElement);
  expect(createGameMock).toHaveBeenCalledWith(gameContainer, { onPlayerReady: undefined });
});

test('passes onPlayerReady to createGame', () => {
  const onPlayerReady = vi.fn();
  const { container } = render(<PhaserGame onPlayerReady={onPlayerReady} />);

  const gameContainer = container.querySelector(`#${GAME_CONTAINER_ID}`);

  expect(createGameMock).toHaveBeenCalledWith(gameContainer, { onPlayerReady });
});

test('destroys the Phaser game on unmount', () => {
  const { unmount } = render(<PhaserGame />);

  unmount();

  expect(destroyMock).toHaveBeenCalledWith(true);
});
