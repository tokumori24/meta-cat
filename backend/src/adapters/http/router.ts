import { Router } from 'express';
import type { RuntimeStatusSource } from '../../usecases/ports.ts';
import type { LiveKitTokenPort } from '../../usecases/liveKitPorts.ts';
import { createHealthController } from './healthController.ts';
import { HEALTH_ROUTE_PATH, LIVEKIT_TOKEN_ROUTE_PATH } from './constants.ts';
import { createLiveKitTokenController } from './liveKitTokenController.ts';

export function createHttpRouter(
  runtimeStatusSource: RuntimeStatusSource,
  liveKitTokenPort: LiveKitTokenPort,
): Router {
  const router = Router();

  router.get(HEALTH_ROUTE_PATH, createHealthController(runtimeStatusSource));
  router.post(LIVEKIT_TOKEN_ROUTE_PATH, createLiveKitTokenController(liveKitTokenPort));

  return router;
}
