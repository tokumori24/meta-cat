import assert from 'node:assert/strict';
import test from 'node:test';
import { CAT_SOUND_AGENT_NAME } from '../../src/domain/catSoundAgent.ts';

test('cat sound agent name matches the worker contract', () => {
  assert.equal(CAT_SOUND_AGENT_NAME, 'cat-sound-agent');
});
