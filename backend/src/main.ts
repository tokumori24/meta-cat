import { AgentDispatchClient } from 'livekit-server-sdk';
import { createSystemRuntimeStatusSource } from './infrastructure/systemRuntimeStatusSource.ts';
import { createServer, startServer } from './infrastructure/server.ts';
import { resolvePort } from './infrastructure/port.ts';
import { createInMemoryPlayerRepository } from './infrastructure/playerRepository.ts';
import { attachWebSocketServer } from './infrastructure/webSocketServer.ts';
import {
  LIVEKIT_API_KEY_ENV_VAR,
  LIVEKIT_API_SECRET_ENV_VAR,
  LIVEKIT_URL_ENV_VAR,
} from './infrastructure/constants.ts';
import { createLiveKitTokenService } from './infrastructure/liveKitTokenService.ts';
import { createLiveKitAgentDispatchService } from './infrastructure/liveKitAgentDispatchService.ts';
import { dispatchCatSoundAgent } from './usecases/dispatchCatSoundAgent.ts';

const port = resolvePort(process.env);
const liveKitUrl = resolveRequiredEnvVar(process.env, LIVEKIT_URL_ENV_VAR);
const liveKitApiKey = resolveRequiredEnvVar(process.env, LIVEKIT_API_KEY_ENV_VAR);
const liveKitApiSecret = resolveRequiredEnvVar(process.env, LIVEKIT_API_SECRET_ENV_VAR);
const runtimeStatusSource = createSystemRuntimeStatusSource();
const liveKitTokenPort = createLiveKitTokenService(liveKitApiKey, liveKitApiSecret);
const agentDispatchClient = new AgentDispatchClient(liveKitUrl, liveKitApiKey, liveKitApiSecret);
const agentDispatchPort = createLiveKitAgentDispatchService(agentDispatchClient);
const app = createServer(runtimeStatusSource, liveKitTokenPort);
const playerRepository = createInMemoryPlayerRepository();
const httpServer = startServer(app, { port });

attachWebSocketServer(httpServer, playerRepository);
dispatchCatSoundAgent(agentDispatchPort).catch((error: unknown) => {
  console.error('Failed to dispatch cat sound agent:', error);
});

function resolveRequiredEnvVar(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}
