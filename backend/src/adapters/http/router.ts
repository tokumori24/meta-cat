import { Router } from 'express';
import type { RuntimeStatusSource } from '../../usecases/ports.ts';
import { createHealthController } from './healthController.ts';
import { HEALTH_ROUTE_PATH } from './constants.ts';

export function createHttpRouter(runtimeStatusSource: RuntimeStatusSource): Router {
  const router = Router();

  router.get(HEALTH_ROUTE_PATH, createHealthController(runtimeStatusSource));

  return router;
}
