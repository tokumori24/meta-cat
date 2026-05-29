import assert from 'node:assert/strict';
import test from 'node:test';
import { HEALTH_STATUS_OK } from '../../../src/domain/health.ts';
import { createHealthController } from '../../../src/adapters/http/healthController.ts';

test('health controller writes a 200 JSON response', () => {
  let statusCode = 0;
  let body: unknown;

  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  };

  const controller = createHealthController({
    now: () => new Date('2026-05-29T00:00:00.000Z'),
    uptimeSeconds: () => 3,
  });

  controller({} as never, response as never);

  assert.equal(statusCode, 200);
  assert.deepEqual(body, {
    status: HEALTH_STATUS_OK,
    uptimeSeconds: 3,
    timestamp: '2026-05-29T00:00:00.000Z',
  });
});
