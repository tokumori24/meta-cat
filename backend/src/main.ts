import { createSystemRuntimeStatusSource } from './infrastructure/systemRuntimeStatusSource.ts';
import { createServer, startServer } from './infrastructure/server.ts';
import { resolvePort } from './infrastructure/port.ts';

const port = resolvePort(process.env);
const runtimeStatusSource = createSystemRuntimeStatusSource();
const app = createServer(runtimeStatusSource);

startServer(app, { port });
