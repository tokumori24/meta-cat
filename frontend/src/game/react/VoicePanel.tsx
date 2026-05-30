import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  LIVEKIT_TOKEN_API_URL,
  LIVEKIT_URL,
  VILLAGE_ROOM_NAME,
} from '../../constants.ts';
import {
  connectToVoice,
  type VoiceConnection,
  type VoiceConnectionStatus,
} from '../network/voiceConnection.ts';

export type VoicePanelProps = {
  playerId: string;
};

const STATUS_LABELS: Record<VoiceConnectionStatus, string> = {
  connecting: 'Voice connecting',
  connected: 'Voice connected',
  disconnected: 'Voice disconnected',
  error: 'Voice error',
};

export function VoicePanel({ playerId }: VoicePanelProps) {
  const [status, setStatus] = useState<VoiceConnectionStatus>('connecting');
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const connectionRef = useRef<VoiceConnection | null>(null);

  useEffect(() => {
    setNeedsInteraction(false);
    setIsVoiceEnabled(true);
    const connection = connectToVoice(
      LIVEKIT_URL,
      LIVEKIT_TOKEN_API_URL,
      VILLAGE_ROOM_NAME,
      playerId,
      {
        onStatusChanged: setStatus,
        onNeedsInteraction: () => setNeedsInteraction(true),
      },
    );

    connectionRef.current = connection;

    return () => {
      connection.disconnect();
      connectionRef.current = null;
    };
  }, [playerId]);

  const enableAudio = (): void => {
    const connection = connectionRef.current;

    if (!connection) {
      setStatus('error');
      return;
    }

    void connection.enableAudio()
      .then(() => setNeedsInteraction(false))
      .catch(() => setStatus('error'));
  };

  const toggleVoice = (): void => {
    const connection = connectionRef.current;

    if (!connection) {
      setStatus('error');
      return;
    }

    const nextEnabled = !isVoiceEnabled;
    void connection.setMicrophoneEnabled(nextEnabled)
      .then(() => setIsVoiceEnabled(nextEnabled))
      .catch(() => setStatus('error'));
  };

  return (
    <section className="voice-panel" aria-label="Voice chat">
      <span className={`voice-status voice-status-${status}`}>{STATUS_LABELS[status]}</span>
      <button
        className="voice-toggle-button"
        type="button"
        aria-label={isVoiceEnabled ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={isVoiceEnabled}
        disabled={status !== 'connected'}
        onClick={toggleVoice}
      >
        {isVoiceEnabled ? <Mic size={20} /> : <MicOff size={20} />}
      </button>
      {needsInteraction ? (
        <button className="voice-enable-button" type="button" onClick={enableAudio}>
          Enable audio
        </button>
      ) : null}
    </section>
  );
}
