import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VoicePanel } from './VoicePanel.tsx';
import type { VoiceConnectionCallbacks } from '../network/voiceConnection.ts';

const { connectToVoiceMock, disconnectMock } = vi.hoisted(() => ({
  connectToVoiceMock: vi.fn(),
  disconnectMock: vi.fn(),
}));

vi.mock('../network/voiceConnection.ts', () => ({
  connectToVoice: connectToVoiceMock,
}));

beforeEach(() => {
  connectToVoiceMock.mockReset();
  disconnectMock.mockReset();
  connectToVoiceMock.mockReturnValue({
    enableAudio: vi.fn(async () => undefined),
    setMicrophoneEnabled: vi.fn(async () => undefined),
    disconnect: disconnectMock,
  });
});

test('VoicePanel connects with the player ID and renders status updates', () => {
  render(<VoicePanel playerId="player-1" />);

  const callbacks = connectToVoiceMock.mock.calls[0][4] as VoiceConnectionCallbacks;
  act(() => {
    callbacks.onStatusChanged('connected');
  });

  expect(connectToVoiceMock.mock.calls[0][3]).toBe('player-1');
  expect(screen.getByText('Voice connected')).toBeInTheDocument();
});

test('VoicePanel shows enable button when interaction is needed', () => {
  render(<VoicePanel playerId="player-1" />);

  const callbacks = connectToVoiceMock.mock.calls[0][4] as VoiceConnectionCallbacks;

  expect(screen.queryByRole('button', { name: 'Enable audio' })).not.toBeInTheDocument();

  act(() => {
    callbacks.onNeedsInteraction();
  });

  expect(screen.getByRole('button', { name: 'Enable audio' })).toBeInTheDocument();
});

test('VoicePanel hides enable button after enableAudio succeeds', async () => {
  const enableAudioMock = vi.fn(async () => undefined);
  connectToVoiceMock.mockReturnValue({
    enableAudio: enableAudioMock,
    setMicrophoneEnabled: vi.fn(async () => undefined),
    disconnect: disconnectMock,
  });
  render(<VoicePanel playerId="player-1" />);

  const callbacks = connectToVoiceMock.mock.calls[0][4] as VoiceConnectionCallbacks;
  act(() => {
    callbacks.onNeedsInteraction();
  });

  fireEvent.click(screen.getByRole('button', { name: 'Enable audio' }));

  expect(enableAudioMock).toHaveBeenCalled();
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: 'Enable audio' })).not.toBeInTheDocument();
  });
});

test('VoicePanel shows error status when enableAudio fails', async () => {
  const enableAudioMock = vi.fn(async () => {
    throw new Error('audio failed');
  });
  connectToVoiceMock.mockReturnValue({
    enableAudio: enableAudioMock,
    setMicrophoneEnabled: vi.fn(async () => undefined),
    disconnect: disconnectMock,
  });
  render(<VoicePanel playerId="player-1" />);

  const callbacks = connectToVoiceMock.mock.calls[0][4] as VoiceConnectionCallbacks;
  act(() => {
    callbacks.onNeedsInteraction();
  });

  fireEvent.click(screen.getByRole('button', { name: 'Enable audio' }));

  expect(enableAudioMock).toHaveBeenCalled();
  await waitFor(() => {
    expect(screen.getByText('Voice error')).toBeInTheDocument();
  });
});

test('VoicePanel disconnects on unmount', () => {
  const { unmount } = render(<VoicePanel playerId="player-1" />);

  unmount();

  expect(disconnectMock).toHaveBeenCalled();
});

test('VoicePanel shows Mic icon when voice is enabled', () => {
  render(<VoicePanel playerId="player-1" />);

  const muteButton = screen.getByRole('button', { name: 'Mute microphone' });

  expect(muteButton.querySelector('.lucide-mic')).toBeInTheDocument();
});

test('VoicePanel toggle button is disabled when not connected', () => {
  render(<VoicePanel playerId="player-1" />);

  expect(screen.getByRole('button', { name: 'Mute microphone' })).toBeDisabled();
});

test('VoicePanel calls setMicrophoneEnabled(false) on first toggle', async () => {
  const setMicrophoneEnabledMock = vi.fn(async () => undefined);
  connectToVoiceMock.mockReturnValue({
    enableAudio: vi.fn(async () => undefined),
    setMicrophoneEnabled: setMicrophoneEnabledMock,
    disconnect: disconnectMock,
  });
  render(<VoicePanel playerId="player-1" />);

  const callbacks = connectToVoiceMock.mock.calls[0][4] as VoiceConnectionCallbacks;
  act(() => {
    callbacks.onStatusChanged('connected');
  });

  fireEvent.click(screen.getByRole('button', { name: 'Mute microphone' }));

  expect(setMicrophoneEnabledMock).toHaveBeenCalledWith(false);
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Unmute microphone' })).toBeInTheDocument();
  });
});

test('VoicePanel shows MicOff icon when voice is disabled', async () => {
  const setMicrophoneEnabledMock = vi.fn(async () => undefined);
  connectToVoiceMock.mockReturnValue({
    enableAudio: vi.fn(async () => undefined),
    setMicrophoneEnabled: setMicrophoneEnabledMock,
    disconnect: disconnectMock,
  });
  render(<VoicePanel playerId="player-1" />);

  const callbacks = connectToVoiceMock.mock.calls[0][4] as VoiceConnectionCallbacks;
  act(() => {
    callbacks.onStatusChanged('connected');
  });

  fireEvent.click(screen.getByRole('button', { name: 'Mute microphone' }));

  await waitFor(() => {
    const unmuteButton = screen.getByRole('button', { name: 'Unmute microphone' });

    expect(unmuteButton.querySelector('.lucide-mic-off')).toBeInTheDocument();
  });
});

test('VoicePanel shows error status when setMicrophoneEnabled fails', async () => {
  const setMicrophoneEnabledMock = vi.fn(async () => {
    throw new Error('microphone failed');
  });
  connectToVoiceMock.mockReturnValue({
    enableAudio: vi.fn(async () => undefined),
    setMicrophoneEnabled: setMicrophoneEnabledMock,
    disconnect: disconnectMock,
  });
  render(<VoicePanel playerId="player-1" />);

  const callbacks = connectToVoiceMock.mock.calls[0][4] as VoiceConnectionCallbacks;
  act(() => {
    callbacks.onStatusChanged('connected');
  });

  fireEvent.click(screen.getByRole('button', { name: 'Mute microphone' }));

  expect(setMicrophoneEnabledMock).toHaveBeenCalledWith(false);
  await waitFor(() => {
    expect(screen.getByText('Voice error')).toBeInTheDocument();
  });
  expect(screen.getByRole('button', { name: 'Mute microphone' })).toBeInTheDocument();
});
