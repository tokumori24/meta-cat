import http from 'node:http';
import express, { type Express } from 'express';
import type { RuntimeStatusSource } from '../usecases/ports.ts';
import { createHttpRouter } from '../adapters/http/router.ts';

export type ServerConfig = {
  port: number;
};

export function createServer(runtimeStatusSource: RuntimeStatusSource): Express {
  const app = express();

  app.use(createHttpRouter(runtimeStatusSource));

  return app;
}

export function startServer(app: Express, config: ServerConfig): http.Server {
  const httpServer = http.createServer(app);

  httpServer.listen(config.port);

  return httpServer;
}
