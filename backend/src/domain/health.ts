export const HEALTH_STATUS_OK = 'ok';

export type HealthStatus = {
  status: typeof HEALTH_STATUS_OK;
  uptimeSeconds: number;
  timestamp: string;
};

export function createHealthStatus(uptimeSeconds: number, timestamp: string): HealthStatus {
  if (uptimeSeconds < 0) {
    throw new Error('uptimeSeconds must be non-negative');
  }

  return {
    status: HEALTH_STATUS_OK,
    uptimeSeconds,
    timestamp,
  };
}
