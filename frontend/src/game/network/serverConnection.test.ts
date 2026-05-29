import {
  CLIENT_MESSAGE_TYPE_MOVE,
  SERVER_MESSAGE_TYPE_PLAYER_JOINED,
  SERVER_MESSAGE_TYPE_PLAYER_LEFT,
  SERVER_MESSAGE_TYPE_PLAYER_MOVED,
  SERVER_MESSAGE_TYPE_WELCOME,
} from './messages.ts';
import { connectToServer } from './serverConnection.ts';

type WebSocketListener = (event: MessageEvent) => void;

const webSockets: MockWebSocket[] = [];

class MockWebSocket {
  static readonly OPEN = 1;
  readonly url: string;
  readyState = MockWebSocket.OPEN;
  readonly sentMessages: string[] = [];
  private messageListener: WebSocketListener | null = null;

  constructor(url: string) {
    this.url = url;
    webSockets.push(this);
  }

  addEventListener(type: string, listener: WebSocketListener): void {
    if (type === 'message') {
      this.messageListener = listener;
    }
  }

  send(message: string): void {
    this.sentMessages.push(message);
  }

  close(): void {
    this.readyState = 3;
  }

  receive(data: string): void {
    if (!this.messageListener) {
      throw new Error('message listener is required');
    }

    this.messageListener({ data } as MessageEvent);
  }
}

beforeEach(() => {
  webSockets.length = 0;
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('connectToServer dispatches server messages to callbacks', () => {
  const callbacks = {
    onWelcome: vi.fn(),
    onPlayerJoined: vi.fn(),
    onPlayerMoved: vi.fn(),
    onPlayerLeft: vi.fn(),
  };

  connectToServer('ws://example.test', callbacks);
  const webSocket = getCreatedWebSocket();

  webSocket.receive(JSON.stringify({
    type: SERVER_MESSAGE_TYPE_WELCOME,
    playerId: 'self',
    currentPlayers: [{ playerId: 'other', x: 1, y: 2 }],
  }));
  webSocket.receive(JSON.stringify({ type: SERVER_MESSAGE_TYPE_PLAYER_JOINED, playerId: 'joined', x: 3, y: 4 }));
  webSocket.receive(JSON.stringify({ type: SERVER_MESSAGE_TYPE_PLAYER_MOVED, playerId: 'moved', x: 5, y: 6 }));
  webSocket.receive(JSON.stringify({ type: SERVER_MESSAGE_TYPE_PLAYER_LEFT, playerId: 'left' }));

  expect(callbacks.onWelcome).toHaveBeenCalledWith('self', [{ playerId: 'other', x: 1, y: 2 }]);
  expect(callbacks.onPlayerJoined).toHaveBeenCalledWith('joined', 3, 4);
  expect(callbacks.onPlayerMoved).toHaveBeenCalledWith('moved', 5, 6);
  expect(callbacks.onPlayerLeft).toHaveBeenCalledWith('left');
});

test('connectToServer sends moves only while the socket is open', () => {
  const connection = connectToServer('ws://example.test', {
    onWelcome: vi.fn(),
    onPlayerJoined: vi.fn(),
    onPlayerMoved: vi.fn(),
    onPlayerLeft: vi.fn(),
  });
  const webSocket = getCreatedWebSocket();

  connection.sendMove(10, 20);
  webSocket.readyState = 3;
  connection.sendMove(30, 40);

  expect(webSocket.sentMessages).toEqual([
    JSON.stringify({ type: CLIENT_MESSAGE_TYPE_MOVE, x: 10, y: 20 }),
  ]);
});

test('connectToServer closes the socket', () => {
  const connection = connectToServer('ws://example.test', {
    onWelcome: vi.fn(),
    onPlayerJoined: vi.fn(),
    onPlayerMoved: vi.fn(),
    onPlayerLeft: vi.fn(),
  });
  const webSocket = getCreatedWebSocket();

  connection.close();

  expect(webSocket.readyState).toBe(3);
});

function getCreatedWebSocket(): MockWebSocket {
  const webSocket = webSockets[0];

  if (!webSocket) {
    throw new Error('web socket is required');
  }

  return webSocket;
}
