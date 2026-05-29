import http from 'node:http';
import assert from 'node:assert/strict';
import test from 'node:test';
import { WebSocket, type WebSocketServer } from 'ws';
import { CLIENT_MESSAGE_TYPE_MOVE } from '../../src/adapters/ws/messages.ts';
import { createInMemoryPlayerRepository } from '../../src/infrastructure/playerRepository.ts';
import { attachWebSocketServer } from '../../src/infrastructure/webSocketServer.ts';

test('attached WebSocket server synchronizes player lifecycle and movement', async () => {
  const httpServer = http.createServer();
  const webSocketServer = attachWebSocketServer(httpServer, createInMemoryPlayerRepository());

  await listen(httpServer);
  const clients: WebSocket[] = [];

  try {
    const url = serverUrl(httpServer);
    const firstClient = new WebSocket(url);
    clients.push(firstClient);
    const firstWelcome = await nextJsonMessage(firstClient);
    const secondClient = new WebSocket(url);
    clients.push(secondClient);
    const secondWelcome = await nextJsonMessage(secondClient);
    const firstJoinMessage = await nextJsonMessage(firstClient);

    assert.equal(firstWelcome.type, 'welcome');
    assert.equal(secondWelcome.type, 'welcome');
    assert.deepEqual(firstJoinMessage, {
      type: 'playerJoined',
      playerId: secondWelcome.playerId,
      x: 0,
      y: 0,
    });

    secondClient.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE_MOVE, x: 10, y: 20 }));
    assert.deepEqual(await nextJsonMessage(firstClient), {
      type: 'playerMoved',
      playerId: secondWelcome.playerId,
      x: 10,
      y: 20,
    });

    secondClient.close();
    assert.deepEqual(await nextJsonMessage(firstClient), {
      type: 'playerLeft',
      playerId: secondWelcome.playerId,
    });
  } finally {
    for (const client of clients) {
      client.close();
    }

    await closeWebSocketServer(webSocketServer);
    await closeHttpServer(httpServer);
  }
});

function listen(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
}

function serverUrl(server: http.Server): string {
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('HTTP server address is required');
  }

  return `ws://127.0.0.1:${address.port}`;
}

function nextJsonMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => {
      const parsed: unknown = JSON.parse(data.toString());

      if (!parsed || typeof parsed !== 'object') {
        reject(new Error('JSON object message is required'));
        return;
      }

      resolve(parsed as Record<string, unknown>);
    });
    socket.once('error', reject);
  });
}

function closeWebSocketServer(server: WebSocketServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function closeHttpServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
