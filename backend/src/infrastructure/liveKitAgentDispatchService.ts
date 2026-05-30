import type { RoomName } from '../domain/liveKitRoom.ts';
import type { AgentDispatchPort } from '../usecases/agentPorts.ts';

type LiveKitAgentDispatchClient = {
  createDispatch(roomName: string, agentName: string): Promise<unknown>;
};

export function createLiveKitAgentDispatchService(
  client: LiveKitAgentDispatchClient,
): AgentDispatchPort {
  return {
    async dispatchAgent(roomName: RoomName, agentName: string): Promise<void> {
      await client.createDispatch(roomName, agentName);
    },
  };
}
