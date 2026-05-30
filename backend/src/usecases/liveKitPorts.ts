import type { RoomName } from '../domain/liveKitRoom.ts';

export type LiveKitTokenPort = {
  issueToken(roomName: RoomName, identity: string): Promise<string>;
};
