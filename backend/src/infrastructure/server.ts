import http from 'node:http';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { RuntimeStatusSource } from '../usecases/ports.ts';
import type { LiveKitTokenPort } from '../usecases/liveKitPorts.ts';
import { createHttpRouter } from '../adapters/http/router.ts';
import {
  ACCESS_CONTROL_ALLOW_HEADERS_HEADER,
  ACCESS_CONTROL_ALLOW_HEADERS_VALUE,
  ACCESS_CONTROL_ALLOW_METHODS_HEADER,
  ACCESS_CONTROL_ALLOW_METHODS_VALUE,
  ACCESS_CONTROL_ALLOW_ORIGIN_HEADER,
  ACCESS_CONTROL_ALLOW_ORIGIN_VALUE,
} from '../adapters/http/constants.ts';

export type ServerConfig = {
  port: number;
};

export function createServer(
  runtimeStatusSource: RuntimeStatusSource,
  liveKitTokenPort: LiveKitTokenPort,
): Express {
  const app = express();

  app.use(express.json());
  app.use(createCorsMiddleware());
  app.use(createHttpRouter(runtimeStatusSource, liveKitTokenPort));

  return app;
}

export function startServer(app: Express, config: ServerConfig): http.Server {
  const httpServer = http.createServer(app);

  httpServer.listen(config.port);

  return httpServer;
}

function createCorsMiddleware() {
  return (request: Request, response: Response, next: NextFunction): void => {
    response.header(ACCESS_CONTROL_ALLOW_ORIGIN_HEADER, ACCESS_CONTROL_ALLOW_ORIGIN_VALUE);
    response.header(ACCESS_CONTROL_ALLOW_METHODS_HEADER, ACCESS_CONTROL_ALLOW_METHODS_VALUE);
    response.header(ACCESS_CONTROL_ALLOW_HEADERS_HEADER, ACCESS_CONTROL_ALLOW_HEADERS_VALUE);

    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }

    next();
  };
}
