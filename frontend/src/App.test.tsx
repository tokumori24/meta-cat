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

test('renders Phaser game as main content without hero', () => {
  render(<App />);

  expect(screen.getByTestId('phaser-game')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'TAKT Frontend' })).not.toBeInTheDocument();
  expect(screen.queryByText('React + Vite')).not.toBeInTheDocument();
});

test('renders the voice panel after the Phaser scene reports the player ID', () => {
  render(<App />);

  reportPlayerReady('player-1');

  expect(screen.getByTestId('voice-panel')).toHaveTextContent('player-1');
});

function reportPlayerReady(playerId: string): void {
  if (!phaserGameOnPlayerReady) {
    throw new Error('PhaserGame onPlayerReady callback is required');
  }

  const onPlayerReady = phaserGameOnPlayerReady;

  act(() => {
    onPlayerReady(playerId);
  });
}
