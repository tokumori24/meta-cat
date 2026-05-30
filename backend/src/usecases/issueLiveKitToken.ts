import type { RoomName } from '../domain/liveKitRoom.ts';
import type { LiveKitTokenPort } from './liveKitPorts.ts';

export async function issueLiveKitToken(
  liveKitTokenPort: LiveKitTokenPort,
  roomName: RoomName,
  identity: string,
): Promise<string> {
  return await liveKitTokenPort.issueToken(roomName, identity);
}
