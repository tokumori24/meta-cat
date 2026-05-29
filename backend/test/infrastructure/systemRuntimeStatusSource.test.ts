import assert from 'node:assert/strict';
import test from 'node:test';
import { createSystemRuntimeStatusSource } from '../../src/infrastructure/systemRuntimeStatusSource.ts';

test('system runtime status source reads current runtime values', () => {
  const source = createSystemRuntimeStatusSource();

  assert.ok(source.now() instanceof Date);
  assert.ok(source.uptimeSeconds() >= 0);
});
