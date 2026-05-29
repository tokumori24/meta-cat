import assert from 'node:assert/strict';
import test from 'node:test';
import { PORT_ENV_VAR } from '../../src/infrastructure/constants.ts';
import { resolvePort } from '../../src/infrastructure/port.ts';

test('resolvePort returns a configured positive integer port', () => {
  assert.equal(resolvePort({ [PORT_ENV_VAR]: '3000' }), 3000);
});

test('resolvePort rejects a missing port', () => {
  assert.throws(
    () => resolvePort({}),
    new Error(`${PORT_ENV_VAR} environment variable is required`),
  );
});

test('resolvePort rejects a non-numeric port', () => {
  assert.throws(
    () => resolvePort({ [PORT_ENV_VAR]: 'not-a-number' }),
    new Error(`${PORT_ENV_VAR} environment variable must be a positive integer`),
  );
});

test('resolvePort rejects a non-integer numeric port', () => {
  assert.throws(
    () => resolvePort({ [PORT_ENV_VAR]: '3000.5' }),
    new Error(`${PORT_ENV_VAR} environment variable must be a positive integer`),
  );
});

test('resolvePort rejects a port with trailing text', () => {
  assert.throws(
    () => resolvePort({ [PORT_ENV_VAR]: '3000abc' }),
    new Error(`${PORT_ENV_VAR} environment variable must be a positive integer`),
  );
});

test('resolvePort rejects zero and negative ports', () => {
  assert.throws(
    () => resolvePort({ [PORT_ENV_VAR]: '0' }),
    new Error(`${PORT_ENV_VAR} environment variable must be a positive integer`),
  );

  assert.throws(
    () => resolvePort({ [PORT_ENV_VAR]: '-1' }),
    new Error(`${PORT_ENV_VAR} environment variable must be a positive integer`),
  );
});
