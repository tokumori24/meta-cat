import assert from 'node:assert/strict';
import test from 'node:test';
import { CAT_SOUND_AGENT_NAME } from '../../src/domain/catSoundAgent.ts';
import { VILLAGE_ROOM_NAME } from '../../src/domain/liveKitRoom.ts';
import { dispatchCatSoundAgent } from '../../src/usecases/dispatchCatSoundAgent.ts';
import type { AgentDispatchPort } from '../../src/usecases/agentPorts.ts';

test('dispatchCatSoundAgent dispatches the cat sound agent to the village room', async () => {
  let call: { roomName: string; agentName: string } | null = null;
  const port: AgentDispatchPort = {
    async dispatchAgent(roomName, agentName) {
      call = { roomName, agentName };
    },
  };

  await dispatchCatSoundAgent(port);

  assert.deepEqual(call, {
    roomName: VILLAGE_ROOM_NAME,
    agentName: CAT_SOUND_AGENT_NAME,
  });
});
