import './App.css';
import { useState } from 'react';
import { PhaserGame } from './game/react/PhaserGame.tsx';
import { VoicePanel } from './game/react/VoicePanel.tsx';

export function App() {
  const [playerId, setPlayerId] = useState<string | null>(null);

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <p className="eyebrow">React + Vite</p>
        <h1 id="app-title">TAKT Frontend</h1>
        <p className="summary">Edit <code>src/App.tsx</code> to verify hot reload.</p>
      </section>
      <div className="game-stack">
        <PhaserGame onPlayerReady={setPlayerId} />
        {playerId ? <VoicePanel playerId={playerId} /> : null}
      </div>
    </main>
  );
}
