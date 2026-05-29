import type { Request, Response } from 'express';
import type { RuntimeStatusSource } from '../../usecases/ports.ts';
import { checkHealth } from '../../usecases/checkHealth.ts';

export function createHealthController(runtimeStatusSource: RuntimeStatusSource) {
  return (_request: Request, response: Response): void => {
    response.status(200).json(checkHealth(runtimeStatusSource));
  };
}
