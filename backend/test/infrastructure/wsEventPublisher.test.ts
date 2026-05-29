import assert from 'node:assert/strict';
import test from 'node:test';
import { WebSocket } from 'ws';
import { createWsPlayerEventPublisher } from '../../src/infrastructure/wsEventPublisher.ts';

test('ws player event publisher sends welcome to the assigned player', () => {
  const client = createClient(WebSocket.OPEN);
  const publisher = createWsPlayerEventPublisher(new Map([['player-1', client]]));

  publisher.notifyJoined(
    'player-1',
    { id: 'player-1', position: { x: 0, y: 0 } },
    [{ id: 'player-2', position: { x: 10, y: 20 } }],
  );

  assert.deepEqual(client.sentMessages, [
    JSON.stringify({
      type: 'welcome',
      playerId: 'player-1',
      currentPlayers: [{ playerId: 'player-2', x: 10, y: 20 }],
    }),
  ]);
});

test('ws player event publisher broadcasts to open clients excluding the sender', () => {
  const sender = createClient(WebSocket.OPEN);
  const receiver = createClient(WebSocket.OPEN);
  const closed = createClient(WebSocket.CLOSED);
  const publisher = createWsPlayerEventPublisher(new Map([
    ['sender', sender],
    ['receiver', receiver],
    ['closed', closed],
  ]));

  publisher.broadcastPlayerMoved('sender', { x: 10, y: 20 }, 'sender');

  assert.deepEqual(sender.sentMessages, []);
  assert.deepEqual(closed.sentMessages, []);
  assert.deepEqual(receiver.sentMessages, [
    JSON.stringify({ type: 'playerMoved', playerId: 'sender', x: 10, y: 20 }),
  ]);
});

function createClient(readyState: number): WebSocket & { sentMessages: string[] } {
  const sentMessages: string[] = [];

  return {
    readyState,
    sentMessages,
    send(message: string) {
      sentMessages.push(message);
    },
  } as WebSocket & { sentMessages: string[] };
}
