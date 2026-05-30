import { useLayoutEffect, useRef } from 'react';
import { GAME_CONTAINER_ID } from '../../constants.ts';
import type { CatCollisionEvent } from '../domain/catCollision.ts';
import { createGame } from '../phaser/createGame.ts';

export type PhaserGameProps = {
  onPlayerReady?: (playerId: string) => void;
  onCatCollision?: (event: CatCollisionEvent) => void;
};

export function PhaserGame({ onPlayerReady, onCatCollision }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current === null) {
      throw new Error('Phaser container was not mounted');
    }

    const game = createGame(containerRef.current, { onPlayerReady, onCatCollision });

    return () => {
      game.destroy(true);
    };
  }, [onPlayerReady, onCatCollision]);

  return <div id={GAME_CONTAINER_ID} ref={containerRef} className="phaser-game" />;
}
