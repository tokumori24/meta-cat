import { AccessToken } from 'livekit-server-sdk';
import type { RoomName } from '../domain/liveKitRoom.ts';
import type { LiveKitTokenPort } from '../usecases/liveKitPorts.ts';

const LIVEKIT_TOKEN_TTL = '10m';

export function createLiveKitTokenService(
  apiKey: string,
  apiSecret: string,
): LiveKitTokenPort {
  return {
    async issueToken(roomName: RoomName, identity: string): Promise<string> {
      const accessToken = new AccessToken(apiKey, apiSecret, {
        identity,
        ttl: LIVEKIT_TOKEN_TTL,
      });

      accessToken.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
      });

      return await accessToken.toJwt();
    },
  };
}
