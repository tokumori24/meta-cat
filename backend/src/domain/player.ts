export type PlayerId = string;

export type PlayerPosition = {
  readonly x: number;
  readonly y: number;
};

export type Player = {
  readonly id: PlayerId;
  readonly position: PlayerPosition;
};

export function createPlayer(id: PlayerId, position: PlayerPosition): Player {
  return { id, position };
}

export function withPosition(player: Player, position: PlayerPosition): Player {
  return { ...player, position };
}
