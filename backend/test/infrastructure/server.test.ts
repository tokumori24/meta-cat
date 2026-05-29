import assert from 'node:assert/strict';
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

test('startServer listens on the configured port', async () => {
  const app = createServer({
    now: () => new Date('2026-05-29T00:00:00.000Z'),
    uptimeSeconds: () => 0,
  });

  const server = startServer(app, { port: 0 });

  await new Promise<void>((resolve) => server.once('listening', resolve));
  assert.ok(server.address());
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});
