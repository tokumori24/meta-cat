import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import test from 'node:test';
import { HEALTH_ROUTE_PATH } from '../../../src/adapters/http/constants.ts';
import { createHttpRouter } from '../../../src/adapters/http/router.ts';

test('http router exposes the health route', async () => {
  const app = express();
  app.use(createHttpRouter({
    now: () => new Date('2026-05-29T00:00:00.000Z'),
    uptimeSeconds: () => 1,
  }));

  const response = await request(app).get(HEALTH_ROUTE_PATH);

  assert.equal(response.status, 200);
  assert.equal(response.body.timestamp, '2026-05-29T00:00:00.000Z');
});
