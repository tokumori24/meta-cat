import { act, render, screen } from '@testing-library/react';
import { App } from './App.tsx';

let phaserGameOnPlayerReady: ((playerId: string) => void) | undefined;

vi.mock('./game/react/PhaserGame.tsx', () => ({
  PhaserGame: ({ onPlayerReady }: { onPlayerReady?: (playerId: string) => void }) => {
    phaserGameOnPlayerReady = onPlayerReady;
    return <div data-testid="phaser-game" />;
  },
}));

vi.mock('./game/react/VoicePanel.tsx', () => ({
  VoicePanel: ({ playerId }: { playerId: string }) => <div data-testid="voice-panel">{playerId}</div>,
}));

beforeEach(() => {
  phaserGameOnPlayerReady = undefined;
});

test('renders the Vite starter screen', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'TAKT Frontend' })).toBeInTheDocument();
  expect(screen.getByText('React + Vite')).toBeInTheDocument();
  expect(screen.getByTestId('phaser-game')).toBeInTheDocument();
});

test('renders the voice panel after the Phaser scene reports the player ID', () => {
  render(<App />);

  act(() => {
    phaserGameOnPlayerReady?.('player-1');
  });

  expect(screen.getByTestId('voice-panel')).toHaveTextContent('player-1');
});
