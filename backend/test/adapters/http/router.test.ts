import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import test from 'node:test';
import { HEALTH_ROUTE_PATH, LIVEKIT_TOKEN_ROUTE_PATH } from '../../../src/adapters/http/constants.ts';
import { createHttpRouter } from '../../../src/adapters/http/router.ts';
import type { LiveKitTokenPort } from '../../../src/usecases/liveKitPorts.ts';

const liveKitTokenPort: LiveKitTokenPort = {
  async issueToken() {
    return 'mock-token';
  },
};

test('http router exposes the health route', async () => {
  const app = express();
  app.use(createHttpRouter({
    now: () => new Date('2026-05-29T00:00:00.000Z'),
    uptimeSeconds: () => 1,
  }, liveKitTokenPort));

  const response = await request(app).get(HEALTH_ROUTE_PATH);

  assert.equal(response.status, 200);
  assert.equal(response.body.timestamp, '2026-05-29T00:00:00.000Z');
});

test('http router exposes the LiveKit token route', async () => {
  const app = express();
  app.use(express.json());
  app.use(createHttpRouter({
    now: () => new Date('2026-05-29T00:00:00.000Z'),
    uptimeSeconds: () => 1,
  }, liveKitTokenPort));

  const response = await request(app)
    .post(LIVEKIT_TOKEN_ROUTE_PATH)
    .send({ roomName: 'village', identity: 'player-1' });

  assert.equal(response.status, 200);
  assert.equal(response.body.token, 'mock-token');
});
