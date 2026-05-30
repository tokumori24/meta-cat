import assert from 'node:assert/strict';
import test from 'node:test';
import { createLiveKitTokenService } from '../../src/infrastructure/liveKitTokenService.ts';

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

test('liveKitTokenService issues a JWT token', async () => {
  const service = createLiveKitTokenService('test-key', 'test-secret');

  const token = await service.issueToken('village', 'player-1');

  assert.match(token, JWT_PATTERN);
});
