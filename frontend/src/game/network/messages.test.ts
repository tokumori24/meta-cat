import {
  CLIENT_MESSAGE_TYPE_MOVE,
  parseServerMessage,
  serializeClientMessage,
  SERVER_MESSAGE_TYPE_PLAYER_JOINED,
  SERVER_MESSAGE_TYPE_PLAYER_LEFT,
  SERVER_MESSAGE_TYPE_PLAYER_MOVED,
  SERVER_MESSAGE_TYPE_WELCOME,
} from './messages.ts';

test('parseServerMessage parses welcome messages', () => {
  const message = parseServerMessage(JSON.stringify({
    type: SERVER_MESSAGE_TYPE_WELCOME,
    playerId: 'player-1',
    currentPlayers: [{ playerId: 'player-2', x: 10, y: 20 }],
  }));

  expect(message).toEqual({
    type: SERVER_MESSAGE_TYPE_WELCOME,
    playerId: 'player-1',
    currentPlayers: [{ playerId: 'player-2', x: 10, y: 20 }],
  });
});

test('parseServerMessage parses player events', () => {
  expect(parseServerMessage(JSON.stringify({
    type: SERVER_MESSAGE_TYPE_PLAYER_JOINED,
    playerId: 'player-1',
    x: 1,
    y: 2,
  }))).toEqual({ type: SERVER_MESSAGE_TYPE_PLAYER_JOINED, playerId: 'player-1', x: 1, y: 2 });
  expect(parseServerMessage(JSON.stringify({
    type: SERVER_MESSAGE_TYPE_PLAYER_MOVED,
    playerId: 'player-1',
    x: 3,
    y: 4,
  }))).toEqual({ type: SERVER_MESSAGE_TYPE_PLAYER_MOVED, playerId: 'player-1', x: 3, y: 4 });
  expect(parseServerMessage(JSON.stringify({
    type: SERVER_MESSAGE_TYPE_PLAYER_LEFT,
    playerId: 'player-1',
  }))).toEqual({ type: SERVER_MESSAGE_TYPE_PLAYER_LEFT, playerId: 'player-1' });
});

test('parseServerMessage rejects invalid messages', () => {
  expect(parseServerMessage('invalid-json')).toBeNull();
  expect(parseServerMessage(JSON.stringify({
    type: SERVER_MESSAGE_TYPE_WELCOME,
    playerId: 'player-1',
    currentPlayers: [{ playerId: 'player-2', x: Number.NaN, y: 20 }],
  }))).toBeNull();
  expect(parseServerMessage(JSON.stringify({ type: 'unknown' }))).toBeNull();
});

test('serializeClientMessage serializes move messages', () => {
  expect(serializeClientMessage({ type: CLIENT_MESSAGE_TYPE_MOVE, x: 10, y: 20 }))
    .toBe(JSON.stringify({ type: CLIENT_MESSAGE_TYPE_MOVE, x: 10, y: 20 }));
});
