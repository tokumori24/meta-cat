import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import test from 'node:test';
import { LIVEKIT_TOKEN_ROUTE_PATH } from '../../../src/adapters/http/constants.ts';
import { createLiveKitTokenController } from '../../../src/adapters/http/liveKitTokenController.ts';
import type { LiveKitTokenPort } from '../../../src/usecases/liveKitPorts.ts';

test('liveKitTokenController returns a token for valid requests', async () => {
  const liveKitTokenPort: LiveKitTokenPort = {
    async issueToken(roomName, identity) {
      return `token-${roomName}-${identity}`;
    },
  };
  const app = express();
  app.use(express.json());
  app.post(LIVEKIT_TOKEN_ROUTE_PATH, createLiveKitTokenController(liveKitTokenPort));

  const response = await request(app)
    .post(LIVEKIT_TOKEN_ROUTE_PATH)
    .send({ roomName: 'village', identity: 'player-1' });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { token: 'token-village-player-1' });
});

test('liveKitTokenController rejects missing request fields', async () => {
  const liveKitTokenPort: LiveKitTokenPort = {
    async issueToken() {
      throw new Error('issueToken must not be called');
    },
  };
  const app = express();
  app.use(express.json());
  app.post(LIVEKIT_TOKEN_ROUTE_PATH, createLiveKitTokenController(liveKitTokenPort));

  const response = await request(app)
    .post(LIVEKIT_TOKEN_ROUTE_PATH)
    .send({ roomName: 'village' });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: 'roomName and identity are required' });
});

test('liveKitTokenController rejects missing request body', async () => {
  const liveKitTokenPort: LiveKitTokenPort = {
    async issueToken() {
      throw new Error('issueToken must not be called');
    },
  };
  const app = express();
  app.use(express.json());
  app.post(LIVEKIT_TOKEN_ROUTE_PATH, createLiveKitTokenController(liveKitTokenPort));

  const response = await request(app).post(LIVEKIT_TOKEN_ROUTE_PATH);

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: 'roomName and identity are required' });
});
