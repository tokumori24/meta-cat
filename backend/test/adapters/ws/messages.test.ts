import assert from 'node:assert/strict';
import test from 'node:test';
import { CLIENT_MESSAGE_TYPE_MOVE, parseClientMessage } from '../../../src/adapters/ws/messages.ts';

test('parseClientMessage parses move messages', () => {
  const message = parseClientMessage(JSON.stringify({ type: CLIENT_MESSAGE_TYPE_MOVE, x: 10, y: 20 }));

  assert.deepEqual(message, { type: CLIENT_MESSAGE_TYPE_MOVE, x: 10, y: 20 });
});

test('parseClientMessage rejects invalid messages', () => {
  assert.equal(parseClientMessage('invalid-json'), null);
  assert.equal(parseClientMessage(JSON.stringify({ type: CLIENT_MESSAGE_TYPE_MOVE, x: Number.NaN, y: 20 })), null);
  assert.equal(parseClientMessage(JSON.stringify({ type: 'unknown', x: 10, y: 20 })), null);
});
