import type { Request, Response } from 'express';
import { issueLiveKitToken } from '../../usecases/issueLiveKitToken.ts';
import type { LiveKitTokenPort } from '../../usecases/liveKitPorts.ts';

type LiveKitTokenRequest = {
  roomName: unknown;
  identity: unknown;
};

type ValidLiveKitTokenRequest = {
  roomName: string;
  identity: string;
};

type LiveKitTokenResponse = {
  token: string;
};

const VALIDATION_ERROR_RESPONSE = {
  error: 'roomName and identity are required',
} as const;

export function createLiveKitTokenController(liveKitTokenPort: LiveKitTokenPort) {
  return async (request: Request, response: Response<LiveKitTokenResponse | typeof VALIDATION_ERROR_RESPONSE>) => {
    const body = request.body;

    if (!isLiveKitTokenRequest(body)) {
      response.status(400).json(VALIDATION_ERROR_RESPONSE);
      return;
    }

    const token = await issueLiveKitToken(liveKitTokenPort, body.roomName, body.identity);

    response.status(200).json({ token });
  };
}

function isLiveKitTokenRequest(value: unknown): value is ValidLiveKitTokenRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const body = value as Partial<LiveKitTokenRequest>;

  return isNonEmptyString(body.roomName) && isNonEmptyString(body.identity);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
