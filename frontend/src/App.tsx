import './App.css';
import { useCallback, useRef, useState } from 'react';
import type { CatCollisionEvent } from './game/domain/catCollision.ts';
import type { VoiceConnection } from './game/network/voiceConnection.ts';
import { PhaserGame } from './game/react/PhaserGame.tsx';
import { VoicePanel } from './game/react/VoicePanel.tsx';

export function App() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const voiceConnectionRef = useRef<VoiceConnection | null>(null);
  const handleCatCollision = useCallback((event: CatCollisionEvent): void => {
    void voiceConnectionRef.current?.sendCatCollision(event);
  }, []);
  const handleConnectionReady = useCallback((connection: VoiceConnection | null): void => {
    voiceConnectionRef.current = connection;
  }, []);

  return (
    <main className="app-shell">
      <PhaserGame onPlayerReady={setPlayerId} onCatCollision={handleCatCollision} />
      {playerId ? (
        <div className="game-overlay">
          <VoicePanel playerId={playerId} onConnectionReady={handleConnectionReady} />
        </div>
      ) : null}
    </main>
  );
}
