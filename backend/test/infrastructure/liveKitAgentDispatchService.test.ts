import assert from 'node:assert/strict';
import test from 'node:test';
import { createLiveKitAgentDispatchService } from '../../src/infrastructure/liveKitAgentDispatchService.ts';

type DispatchCall = {
  roomName: string;
  agentName: string;
};

test('liveKitAgentDispatchService creates dispatches with the configured LiveKit client', async () => {
  let dispatchCall: DispatchCall | null = null;
  const client = {
    async createDispatch(roomName: string, agentName: string): Promise<void> {
      dispatchCall = { roomName, agentName };
    },
  };

  const service = createLiveKitAgentDispatchService(client);
  await service.dispatchAgent('village', 'cat-sound-agent');

  assert.deepEqual(dispatchCall, {
    roomName: 'village',
    agentName: 'cat-sound-agent',
  });
});
