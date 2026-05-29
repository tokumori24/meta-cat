import type { RuntimeStatusSource } from '../usecases/ports.ts';

export function createSystemRuntimeStatusSource(): RuntimeStatusSource {
  return {
    now: () => new Date(),
    uptimeSeconds: () => process.uptime(),
  };
}
