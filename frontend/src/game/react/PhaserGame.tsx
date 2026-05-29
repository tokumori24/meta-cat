import { useLayoutEffect, useRef } from 'react';
import { GAME_CONTAINER_ID } from '../../constants.ts';
import { createGame } from '../phaser/createGame.ts';

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current === null) {
      throw new Error('Phaser container was not mounted');
    }

    const game = createGame(containerRef.current);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div id={GAME_CONTAINER_ID} ref={containerRef} className="phaser-game" />;
}
