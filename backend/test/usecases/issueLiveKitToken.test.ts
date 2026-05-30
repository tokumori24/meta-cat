import assert from 'node:assert/strict';
import test from 'node:test';
import { issueLiveKitToken } from '../../src/usecases/issueLiveKitToken.ts';
import type { LiveKitTokenPort } from '../../src/usecases/liveKitPorts.ts';

test('issueLiveKitToken delegates token issuing to the configured port', async () => {
  const liveKitTokenPort: LiveKitTokenPort = {
    async issueToken(roomName, identity) {
      return `token-${roomName}-${identity}`;
    },
  };

  const token = await issueLiveKitToken(liveKitTokenPort, 'village', 'player-1');

  assert.equal(token, 'token-village-player-1');
});
