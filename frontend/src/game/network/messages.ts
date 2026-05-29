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

export function parseServerMessage(raw: string): ServerMessage | null {
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

  switch (parsed.type) {
    case SERVER_MESSAGE_TYPE_WELCOME:
      return parseWelcomeMessage(parsed);
    case SERVER_MESSAGE_TYPE_PLAYER_JOINED:
    case SERVER_MESSAGE_TYPE_PLAYER_MOVED:
      return parsePlayerPositionMessage(parsed);
    case SERVER_MESSAGE_TYPE_PLAYER_LEFT:
      return parsePlayerLeftMessage(parsed);
    default:
      return null;
  }
}

export function serializeClientMessage(message: ClientMessage): string {
  return JSON.stringify(message);
}

function parseWelcomeMessage(message: Record<string, unknown>): WelcomeServerMessage | null {
  if (typeof message.playerId !== 'string' || !Array.isArray(message.currentPlayers)) {
    return null;
  }

  const currentPlayers = parsePlayerInfoList(message.currentPlayers);

  if (!currentPlayers) {
    return null;
  }

  return {
    type: SERVER_MESSAGE_TYPE_WELCOME,
    playerId: message.playerId,
    currentPlayers,
  };
}

function parsePlayerPositionMessage(
  message: Record<string, unknown>,
): PlayerJoinedServerMessage | PlayerMovedServerMessage | null {
  if (
    typeof message.playerId !== 'string'
    || !isFiniteNumber(message.x)
    || !isFiniteNumber(message.y)
  ) {
    return null;
  }

  if (message.type === SERVER_MESSAGE_TYPE_PLAYER_JOINED) {
    return { type: SERVER_MESSAGE_TYPE_PLAYER_JOINED, playerId: message.playerId, x: message.x, y: message.y };
  }

  return { type: SERVER_MESSAGE_TYPE_PLAYER_MOVED, playerId: message.playerId, x: message.x, y: message.y };
}

function parsePlayerLeftMessage(message: Record<string, unknown>): PlayerLeftServerMessage | null {
  if (typeof message.playerId !== 'string') {
    return null;
  }

  return { type: SERVER_MESSAGE_TYPE_PLAYER_LEFT, playerId: message.playerId };
}

function parsePlayerInfoList(values: readonly unknown[]): readonly PlayerInfo[] | null {
  return values.reduce<PlayerInfo[] | null>((players, value) => {
    if (players === null) {
      return null;
    }

    const player = parsePlayerInfo(value);

    if (!player) {
      return null;
    }

    return [...players, player];
  }, []);
}

function parsePlayerInfo(value: unknown): PlayerInfo | null {
  if (!isRecord(value) || typeof value.playerId !== 'string' || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return null;
  }

  return { playerId: value.playerId, x: value.x, y: value.y };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
