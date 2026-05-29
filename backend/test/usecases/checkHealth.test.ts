import assert from 'node:assert/strict';
import test from 'node:test';
import { HEALTH_STATUS_OK } from '../../src/domain/health.ts';
import { checkHealth } from '../../src/usecases/checkHealth.ts';

test('checkHealth returns runtime status from the injected source', () => {
  const result = checkHealth({
    now: () => new Date('2026-05-29T00:00:00.000Z'),
    uptimeSeconds: () => 12.5,
  });

  assert.deepEqual(result, {
    status: HEALTH_STATUS_OK,
    uptimeSeconds: 12.5,
    timestamp: '2026-05-29T00:00:00.000Z',
  });
});
