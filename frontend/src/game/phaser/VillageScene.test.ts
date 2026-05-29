import { BACKEND_WS_URL, GAME_HEIGHT, GAME_WIDTH } from '../../constants.ts';
import { WORLD_PIXEL_HEIGHT, WORLD_PIXEL_WIDTH } from '../domain/villageMap.ts';
import type { ServerConnection, ServerConnectionCallbacks } from '../network/serverConnection.ts';
import { VillageScene } from './VillageScene.ts';

type CursorKeysMock = {
  left: { isDown: boolean };
  right: { isDown: boolean };
  up: { isDown: boolean };
  down: { isDown: boolean };
};

type GraphicsMock = {
  fillStyle: ReturnType<typeof vi.fn>;
  fillCircle: ReturnType<typeof vi.fn>;
  setPosition: ReturnType<typeof vi.fn>;
  setDepth: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const { connectToServerMock, clampMock, sceneState } = vi.hoisted(() => {
  const cursorKeys: CursorKeysMock = {
    left: { isDown: false },
    right: { isDown: false },
    up: { isDown: false },
    down: { isDown: false },
  };
  const graphics: GraphicsMock[] = [];

  return {
    connectToServerMock: vi.fn(),
    clampMock: vi.fn((value: number, min: number, max: number) => Math.min(Math.max(value, min), max)),
    sceneState: { cursorKeys, graphics },
  };
});

vi.mock('phaser', () => ({
  Math: {
    Clamp: clampMock,
  },
  Scene: class Scene {
    load = {
      spritesheet: vi.fn(),
    };
    make = {
      tilemap: vi.fn(() => ({
        addTilesetImage: vi.fn(() => ({})),
        createLayer: vi.fn(() => ({
          setDepth: vi.fn(),
        })),
      })),
    };
    cameras = {
      main: {
        scrollX: 0,
        scrollY: 0,
        setBounds: vi.fn(),
      },
    };
    input = {
      keyboard: {
        createCursorKeys: vi.fn(() => sceneState.cursorKeys),
      },
    };
    events = {
      once: vi.fn(),
    };
    add = {
      graphics: vi.fn(() => {
        const graphics = {
          fillStyle: vi.fn(),
          fillCircle: vi.fn(),
          setPosition: vi.fn(),
          setDepth: vi.fn(),
          destroy: vi.fn(),
        };

        sceneState.graphics.push(graphics);

        return graphics;
      }),
    };
  },
  Scenes: {
    Events: {
      SHUTDOWN: 'shutdown',
    },
  },
}));

vi.mock('../network/serverConnection.ts', () => ({
  connectToServer: connectToServerMock,
}));

beforeEach(() => {
  connectToServerMock.mockReset();
  clampMock.mockClear();
  sceneState.cursorKeys.left.isDown = false;
  sceneState.cursorKeys.right.isDown = false;
  sceneState.cursorKeys.up.isDown = false;
  sceneState.cursorKeys.down.isDown = false;
  sceneState.graphics.length = 0;
});

test('VillageScene connects to the backend and sends changed camera-center positions', () => {
  const connection = createConnection();
  connectToServerMock.mockReturnValue(connection);
  const scene = new VillageScene();

  scene.create();
  scene.update(0, 1000);

  expect(connectToServerMock).toHaveBeenCalledWith(BACKEND_WS_URL, expect.any(Object));
  expect(connection.sendMove).toHaveBeenCalledWith(GAME_WIDTH / 2, GAME_HEIGHT / 2);

  scene.update(1000, 1000);

  expect(connection.sendMove).toHaveBeenCalledTimes(1);
});

test('VillageScene moves the camera before sending the local player position', () => {
  const connection = createConnection();
  connectToServerMock.mockReturnValue(connection);
  const scene = new VillageScene();

  scene.create();
  sceneState.cursorKeys.right.isDown = true;
  sceneState.cursorKeys.down.isDown = true;
  scene.update(0, 1000);

  expect(clampMock).toHaveBeenCalledWith(260, 0, WORLD_PIXEL_WIDTH - GAME_WIDTH);
  expect(clampMock).toHaveBeenCalledWith(260, 0, WORLD_PIXEL_HEIGHT - GAME_HEIGHT);
  expect(connection.sendMove).toHaveBeenCalledWith(624, 468);
});

test('VillageScene renders and removes remote players from server callbacks', () => {
  const connection = createConnection();
  connectToServerMock.mockReturnValue(connection);
  const scene = new VillageScene();

  scene.create();
  const callbacks = connectToServerMock.mock.calls[0][1] as ServerConnectionCallbacks;

  callbacks.onWelcome('self', [{ playerId: 'remote-1', x: 10, y: 20 }]);
  const remotePlayer = getGraphics(0);
  callbacks.onPlayerMoved('remote-1', 30, 40);
  callbacks.onPlayerLeft('remote-1');

  expect(remotePlayer.fillStyle).toHaveBeenCalledWith(0xff4444);
  expect(remotePlayer.fillCircle).toHaveBeenCalledWith(0, 0, 8);
  expect(remotePlayer.setPosition).toHaveBeenCalledWith(10, 20);
  expect(remotePlayer.setPosition).toHaveBeenCalledWith(30, 40);
  expect(remotePlayer.destroy).toHaveBeenCalled();
});

test('VillageScene closes the connection and destroys remote players on shutdown', () => {
  const connection = createConnection();
  connectToServerMock.mockReturnValue(connection);
  const scene = new VillageScene();

  scene.create();
  const callbacks = connectToServerMock.mock.calls[0][1] as ServerConnectionCallbacks;
  callbacks.onPlayerJoined('remote-1', 10, 20);
  const remotePlayer = getGraphics(0);

  scene.shutdown();

  expect(connection.close).toHaveBeenCalled();
  expect(remotePlayer.destroy).toHaveBeenCalled();
});

function createConnection(): ServerConnection {
  return {
    sendMove: vi.fn(),
    close: vi.fn(),
  };
}

function getGraphics(index: number): GraphicsMock {
  const graphics = sceneState.graphics[index];

  if (!graphics) {
    throw new Error('graphics is required');
  }

  return graphics;
}
