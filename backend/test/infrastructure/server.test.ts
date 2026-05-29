import assert from 'node:assert/strict';
import type { Express } from 'express';
import request from 'supertest';
import test from 'node:test';
import { HEALTH_ROUTE_PATH } from '../../src/adapters/http/constants.ts';
import { createServer, startServer } from '../../src/infrastructure/server.ts';

test('createServer wires the HTTP router', async () => {
  const app = createServer({
    now: () => new Date('2026-05-29T00:00:00.000Z'),
    uptimeSeconds: () => 2,
  });

  const response = await request(app).get(HEALTH_ROUTE_PATH);

  assert.equal(response.status, 200);
  assert.equal(response.body.uptimeSeconds, 2);
});

test('startServer listens on the configured port', () => {
  let listenedPort = 0;
  const app = {
    listen(port: number) {
      listenedPort = port;
    },
  } as unknown as Express;

  startServer(app, { port: 3000 });

  assert.equal(listenedPort, 3000);
});
