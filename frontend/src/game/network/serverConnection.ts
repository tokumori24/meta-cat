import {
  CLIENT_MESSAGE_TYPE_MOVE,
  parseServerMessage,
  serializeClientMessage,
  SERVER_MESSAGE_TYPE_PLAYER_JOINED,
  SERVER_MESSAGE_TYPE_PLAYER_LEFT,
  SERVER_MESSAGE_TYPE_PLAYER_MOVED,
  SERVER_MESSAGE_TYPE_WELCOME,
  type PlayerInfo,
} from './messages.ts';

export type ServerConnectionCallbacks = {
  onWelcome(playerId: string, currentPlayers: readonly PlayerInfo[]): void;
  onPlayerJoined(playerId: string, x: number, y: number): void;
  onPlayerMoved(playerId: string, x: number, y: number): void;
  onPlayerLeft(playerId: string): void;
};

export type ServerConnection = {
  sendMove(x: number, y: number): void;
  close(): void;
};

export function connectToServer(url: string, callbacks: ServerConnectionCallbacks): ServerConnection {
  const webSocket = new WebSocket(url);

  webSocket.addEventListener('message', (event) => {
    const message = parseServerMessage(String(event.data));

    if (!message) {
      return;
    }

    switch (message.type) {
      case SERVER_MESSAGE_TYPE_WELCOME:
        callbacks.onWelcome(message.playerId, message.currentPlayers);
        break;
      case SERVER_MESSAGE_TYPE_PLAYER_JOINED:
        callbacks.onPlayerJoined(message.playerId, message.x, message.y);
        break;
      case SERVER_MESSAGE_TYPE_PLAYER_MOVED:
        callbacks.onPlayerMoved(message.playerId, message.x, message.y);
        break;
      case SERVER_MESSAGE_TYPE_PLAYER_LEFT:
        callbacks.onPlayerLeft(message.playerId);
        break;
    }
  });

  return {
    sendMove(x, y) {
      if (webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(serializeClientMessage({ type: CLIENT_MESSAGE_TYPE_MOVE, x, y }));
      }
    },
    close() {
      webSocket.close();
    },
  };
}
