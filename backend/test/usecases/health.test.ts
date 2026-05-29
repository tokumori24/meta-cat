import assert from 'node:assert/strict';
import test from 'node:test';
import { createHealthStatus } from '../../src/domain/health.ts';

test('createHealthStatus rejects negative uptime', () => {
  assert.throws(
    () => createHealthStatus(-1, '2026-05-29T00:00:00.000Z'),
    /uptimeSeconds must be non-negative/,
  );
});
