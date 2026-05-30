import { BACKEND_WS_URL } from '../../constants.ts';
import { WORLD_PIXEL_HEIGHT, WORLD_PIXEL_WIDTH } from '../domain/villageMap.ts';
import {
  PLAYER_ANIM_WALK_DOWN,
  PLAYER_ANIM_WALK_RIGHT,
  PLAYER_SPEED_PIXELS_PER_SECOND,
} from '../domain/player.ts';
import type { ServerConnection, ServerConnectionCallbacks } from '../network/serverConnection.ts';
import { VillageScene } from './VillageScene.ts';

type CursorKeysMock = {
  left: { isDown: boolean };
  right: { isDown: boolean };
  up: { isDown: boolean };
  down: { isDown: boolean };
};

type SpriteMock = {
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  setDisplaySize: ReturnType<typeof vi.fn>;
  setDepth: ReturnType<typeof vi.fn>;
  setPosition: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  anims: { play: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
};

const { connectToServerMock, sceneState } = vi.hoisted(() => {
  const cursorKeys: CursorKeysMock = {
    left: { isDown: false },
    right: { isDown: false },
    up: { isDown: false },
    down: { isDown: false },
  };
  const sprites: SpriteMock[] = [];

  return {
    connectToServerMock: vi.fn(),
    sceneState: { cursorKeys, sprites },
  };
});

const createSprite = (x: number, y: number): SpriteMock => {
  const sprite: SpriteMock = {
    x,
    y,
    displayWidth: 48,
    displayHeight: 48,
    setDisplaySize: vi.fn(() => sprite),
    setDepth: vi.fn(() => sprite),
    setPosition: vi.fn((nextX: number, nextY: number) => {
      sprite.x = nextX;
      sprite.y = nextY;
      return sprite;
    }),
    destroy: vi.fn(),
    anims: { play: vi.fn(), stop: vi.fn() },
  };

  sceneState.sprites.push(sprite);

  return sprite;
};

vi.mock('phaser', () => ({
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
        setBounds: vi.fn(),
        startFollow: vi.fn(),
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
    anims = {
      create: vi.fn(),
      generateFrameNumbers: vi.fn(() => []),
    };
    add = {
      sprite: vi.fn((x: number, y: number) => createSprite(x, y)),
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
  sceneState.cursorKeys.left.isDown = false;
  sceneState.cursorKeys.right.isDown = false;
  sceneState.cursorKeys.up.isDown = false;
  sceneState.cursorKeys.down.isDown = false;
  sceneState.sprites.length = 0;
});

test('VillageScene connects to the backend and sends changed player positions', () => {
  const connection = createConnection();
  connectToServerMock.mockReturnValue(connection);
  const scene = new VillageScene();

  scene.create();
  sceneState.cursorKeys.right.isDown = true;
  scene.update(0, 1000);

  expect(connectToServerMock).toHaveBeenCalledWith(BACKEND_WS_URL, expect.any(Object));
  const expectedX = Math.round(WORLD_PIXEL_WIDTH / 2 + PLAYER_SPEED_PIXELS_PER_SECOND);
  expect(connection.sendMove).toHaveBeenCalledWith(expectedX, Math.round(WORLD_PIXEL_HEIGHT / 2));

  sceneState.cursorKeys.right.isDown = false;
  scene.update(1000, 1000);

  // The player did not move this frame, so no duplicate position is sent.
  expect(connection.sendMove).toHaveBeenCalledTimes(1);
});

test('VillageScene moves the local cat and plays the matching walk animation', () => {
  const connection = createConnection();
  connectToServerMock.mockReturnValue(connection);
  const scene = new VillageScene();

  scene.create();
  const localPlayer = getSprite(0);
  sceneState.cursorKeys.right.isDown = true;
  scene.update(0, 1000);

  expect(localPlayer.setPosition).toHaveBeenCalled();
  expect(localPlayer.anims.play).toHaveBeenCalledWith(PLAYER_ANIM_WALK_RIGHT, true);
});

test('VillageScene renders remote players as cats and animates their movement', () => {
  const connection = createConnection();
  connectToServerMock.mockReturnValue(connection);
  const scene = new VillageScene();

  scene.create();
  const callbacks = connectToServerMock.mock.calls[0][1] as ServerConnectionCallbacks;

  callbacks.onWelcome('self', [{ playerId: 'remote-1', x: 10, y: 20 }]);
  const remotePlayer = getSprite(1);

  expect(remotePlayer.setDisplaySize).toHaveBeenCalled();
  expect(remotePlayer.x).toBe(10);
  expect(remotePlayer.y).toBe(20);

  callbacks.onPlayerMoved('remote-1', 10, 60);
  expect(remotePlayer.anims.play).toHaveBeenCalledWith(PLAYER_ANIM_WALK_DOWN, true);
  expect(remotePlayer.setPosition).toHaveBeenCalledWith(10, 60);

  callbacks.onPlayerLeft('remote-1');
  expect(remotePlayer.destroy).toHaveBeenCalled();
});

test('VillageScene calls onPlayerReady with the assigned player ID on welcome', () => {
  const connection = createConnection();
  const onPlayerReady = vi.fn();
  connectToServerMock.mockReturnValue(connection);
  const scene = new VillageScene(onPlayerReady);

  scene.create();
  const callbacks = connectToServerMock.mock.calls[0][1] as ServerConnectionCallbacks;
  callbacks.onWelcome('my-player-id', []);

  expect(onPlayerReady).toHaveBeenCalledWith('my-player-id');
});

test('VillageScene closes the connection and destroys remote players on shutdown', () => {
  const connection = createConnection();
  connectToServerMock.mockReturnValue(connection);
  const scene = new VillageScene();

  scene.create();
  const callbacks = connectToServerMock.mock.calls[0][1] as ServerConnectionCallbacks;
  callbacks.onPlayerJoined('remote-1', 10, 20);
  const remotePlayer = getSprite(1);

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

function getSprite(index: number): SpriteMock {
  const sprite = sceneState.sprites[index];

  if (!sprite) {
    throw new Error('sprite is required');
  }

  return sprite;
}
