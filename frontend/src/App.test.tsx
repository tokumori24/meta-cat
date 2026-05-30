import { act, render, screen } from '@testing-library/react';
import type { CatCollisionEvent } from './game/domain/catCollision.ts';
import type { VoiceConnection } from './game/network/voiceConnection.ts';
import { App } from './App.tsx';

let phaserGameOnPlayerReady: ((playerId: string) => void) | undefined;
let phaserGameOnCatCollision: ((event: CatCollisionEvent) => void) | undefined;
let voicePanelOnConnectionReady: ((connection: VoiceConnection | null) => void) | undefined;

vi.mock('./game/react/PhaserGame.tsx', () => ({
  PhaserGame: ({
    onPlayerReady,
    onCatCollision,
  }: {
    onPlayerReady?: (playerId: string) => void;
    onCatCollision?: (event: CatCollisionEvent) => void;
  }) => {
    phaserGameOnPlayerReady = onPlayerReady;
    phaserGameOnCatCollision = onCatCollision;
    return <div data-testid="phaser-game" />;
  },
}));

vi.mock('./game/react/VoicePanel.tsx', () => ({
  VoicePanel: ({
    playerId,
    onConnectionReady,
  }: {
    playerId: string;
    onConnectionReady?: (connection: VoiceConnection | null) => void;
  }) => {
    voicePanelOnConnectionReady = onConnectionReady;
    return <div data-testid="voice-panel">{playerId}</div>;
  },
}));

beforeEach(() => {
  phaserGameOnPlayerReady = undefined;
  phaserGameOnCatCollision = undefined;
  voicePanelOnConnectionReady = undefined;
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

test('sends cat collision events through the ready voice connection', () => {
  const sendCatCollision = vi.fn(async () => undefined);
  render(<App />);

  reportPlayerReady('player-1');
  reportConnectionReady({
    enableAudio: vi.fn(async () => undefined),
    setMicrophoneEnabled: vi.fn(async () => undefined),
    sendCatCollision,
    disconnect: vi.fn(),
  });
  reportCatCollision({
    type: 'cat_collision',
    roomName: 'village',
    fromCatId: 'player-1',
    toCatId: 'player-2',
    occurredAt: '2026-05-30T00:00:00.000Z',
  });

  expect(sendCatCollision).toHaveBeenCalledWith({
    type: 'cat_collision',
    roomName: 'village',
    fromCatId: 'player-1',
    toCatId: 'player-2',
    occurredAt: '2026-05-30T00:00:00.000Z',
  });
});

test('keeps the Phaser cat collision callback stable when the voice connection changes', () => {
  render(<App />);

  reportPlayerReady('player-1');
  const initialOnCatCollision = phaserGameOnCatCollision;
  reportConnectionReady({
    enableAudio: vi.fn(async () => undefined),
    setMicrophoneEnabled: vi.fn(async () => undefined),
    sendCatCollision: vi.fn(async () => undefined),
    disconnect: vi.fn(),
  });

  expect(phaserGameOnCatCollision).toBe(initialOnCatCollision);
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

function reportConnectionReady(connection: VoiceConnection): void {
  if (!voicePanelOnConnectionReady) {
    throw new Error('VoicePanel onConnectionReady callback is required');
  }

  const onConnectionReady = voicePanelOnConnectionReady;

  act(() => {
    onConnectionReady(connection);
  });
}

function reportCatCollision(event: CatCollisionEvent): void {
  if (!phaserGameOnCatCollision) {
    throw new Error('PhaserGame onCatCollision callback is required');
  }

  const onCatCollision = phaserGameOnCatCollision;

  act(() => {
    onCatCollision(event);
  });
}
