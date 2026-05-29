import './App.css';
import { PhaserGame } from './game/react/PhaserGame.tsx';

export function App() {
  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <p className="eyebrow">React + Vite</p>
        <h1 id="app-title">TAKT Frontend</h1>
        <p className="summary">Edit <code>src/App.tsx</code> to verify hot reload.</p>
      </section>
      <PhaserGame />
    </main>
  );
}
