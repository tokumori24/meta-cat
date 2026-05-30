import type { RoomName } from '../domain/liveKitRoom.ts';

export type AgentDispatchPort = {
  dispatchAgent(roomName: RoomName, agentName: string): Promise<void>;
};
