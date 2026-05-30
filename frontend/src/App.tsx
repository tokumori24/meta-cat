import './App.css';
import { useState } from 'react';
import { PhaserGame } from './game/react/PhaserGame.tsx';
import { VoicePanel } from './game/react/VoicePanel.tsx';

export function App() {
  const [playerId, setPlayerId] = useState<string | null>(null);

  return (
    <main className="app-shell">
      <PhaserGame onPlayerReady={setPlayerId} />
      {playerId ? (
        <div className="game-overlay">
          <VoicePanel playerId={playerId} />
        </div>
      ) : null}
    </main>
  );
}
