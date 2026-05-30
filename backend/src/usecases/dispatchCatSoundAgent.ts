import { CAT_SOUND_AGENT_NAME } from '../domain/catSoundAgent.ts';
import { VILLAGE_ROOM_NAME } from '../domain/liveKitRoom.ts';
import type { AgentDispatchPort } from './agentPorts.ts';

export async function dispatchCatSoundAgent(agentDispatchPort: AgentDispatchPort): Promise<void> {
  await agentDispatchPort.dispatchAgent(VILLAGE_ROOM_NAME, CAT_SOUND_AGENT_NAME);
}
