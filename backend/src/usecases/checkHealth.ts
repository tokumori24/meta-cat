import { createHealthStatus, type HealthStatus } from '../domain/health.ts';
import type { RuntimeStatusSource } from './ports.ts';

export function checkHealth(runtimeStatusSource: RuntimeStatusSource): HealthStatus {
  return createHealthStatus(
    runtimeStatusSource.uptimeSeconds(),
    runtimeStatusSource.now().toISOString(),
  );
}
