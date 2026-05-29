export const CLIENT_MESSAGE_TYPE_MOVE = 'move';
export const SERVER_MESSAGE_TYPE_WELCOME = 'welcome';
export const SERVER_MESSAGE_TYPE_PLAYER_JOINED = 'playerJoined';
export const SERVER_MESSAGE_TYPE_PLAYER_MOVED = 'playerMoved';
export const SERVER_MESSAGE_TYPE_PLAYER_LEFT = 'playerLeft';

export type MoveClientMessage = {
  readonly type: typeof CLIENT_MESSAGE_TYPE_MOVE;
  readonly x: number;
  readonly y: number;
};

export type ClientMessage = MoveClientMessage;

export type PlayerInfo = {
  readonly playerId: string;
  readonly x: number;
  readonly y: number;
};

export type WelcomeServerMessage = {
  readonly type: typeof SERVER_MESSAGE_TYPE_WELCOME;
  readonly playerId: string;
  readonly currentPlayers: readonly PlayerInfo[];
};

export type PlayerJoinedServerMessage = {
  readonly type: typeof SERVER_MESSAGE_TYPE_PLAYER_JOINED;
} & PlayerInfo;

export type PlayerMovedServerMessage = {
  readonly type: typeof SERVER_MESSAGE_TYPE_PLAYER_MOVED;
} & PlayerInfo;

export type PlayerLeftServerMessage = {
  readonly type: typeof SERVER_MESSAGE_TYPE_PLAYER_LEFT;
  readonly playerId: string;
};

export type ServerMessage =
  | WelcomeServerMessage
  | PlayerJoinedServerMessage
  | PlayerMovedServerMessage
  | PlayerLeftServerMessage;

export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // WebSocket payloads are external input; invalid JSON is a validation failure.
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  if (parsed.type === CLIENT_MESSAGE_TYPE_MOVE && isFiniteNumber(parsed.x) && isFiniteNumber(parsed.y)) {
    return { type: CLIENT_MESSAGE_TYPE_MOVE, x: parsed.x, y: parsed.y };
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
