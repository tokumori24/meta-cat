import { createSystemRuntimeStatusSource } from './infrastructure/systemRuntimeStatusSource.ts';
import { createServer, startServer } from './infrastructure/server.ts';
import { resolvePort } from './infrastructure/port.ts';
import { createInMemoryPlayerRepository } from './infrastructure/playerRepository.ts';
import { attachWebSocketServer } from './infrastructure/webSocketServer.ts';
import {
  LIVEKIT_API_KEY_ENV_VAR,
  LIVEKIT_API_SECRET_ENV_VAR,
} from './infrastructure/constants.ts';
import { createLiveKitTokenService } from './infrastructure/liveKitTokenService.ts';

const port = resolvePort(process.env);
const liveKitApiKey = resolveRequiredEnvVar(process.env, LIVEKIT_API_KEY_ENV_VAR);
const liveKitApiSecret = resolveRequiredEnvVar(process.env, LIVEKIT_API_SECRET_ENV_VAR);
const runtimeStatusSource = createSystemRuntimeStatusSource();
const liveKitTokenPort = createLiveKitTokenService(liveKitApiKey, liveKitApiSecret);
const app = createServer(runtimeStatusSource, liveKitTokenPort);
const playerRepository = createInMemoryPlayerRepository();
const httpServer = startServer(app, { port });

attachWebSocketServer(httpServer, playerRepository);

function resolveRequiredEnvVar(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}
