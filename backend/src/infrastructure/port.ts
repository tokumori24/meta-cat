import { PORT_ENV_VAR } from './constants.ts';

export function resolvePort(env: NodeJS.ProcessEnv): number {
  const portText = env[PORT_ENV_VAR];

  if (portText === undefined) {
    throw new Error(`${PORT_ENV_VAR} environment variable is required`);
  }

  const port = Number(portText);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`${PORT_ENV_VAR} environment variable must be a positive integer`);
  }

  return port;
}
