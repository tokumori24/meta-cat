import { createSystemRuntimeStatusSource } from './infrastructure/systemRuntimeStatusSource.ts';
import { createServer, startServer } from './infrastructure/server.ts';
import { resolvePort } from './infrastructure/port.ts';
import { createInMemoryPlayerRepository } from './infrastructure/playerRepository.ts';
import { attachWebSocketServer } from './infrastructure/webSocketServer.ts';

const port = resolvePort(process.env);
const runtimeStatusSource = createSystemRuntimeStatusSource();
const app = createServer(runtimeStatusSource);
const playerRepository = createInMemoryPlayerRepository();
const httpServer = startServer(app, { port });

attachWebSocketServer(httpServer, playerRepository);
