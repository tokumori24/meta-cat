import { connectToVoice } from './voiceConnection.ts';

type RoomHandler = (...args: readonly unknown[]) => void;

const {
  roomInstances,
  RoomEvent,
  Track,
  RoomMock,
} = vi.hoisted(() => {
  const instances: RoomMockInstance[] = [];
  const events = {
    Connected: 'connected',
    Disconnected: 'disconnected',
    TrackSubscribed: 'trackSubscribed',
    TrackUnsubscribed: 'trackUnsubscribed',
    AudioPlaybackStatusChanged: 'audioPlaybackChanged',
  } as const;
  const track = {
    Kind: {
      Audio: 'audio',
      Video: 'video',
    },
  } as const;

  class RoomMockClass {
    handlers = new Map<string, RoomHandler>();
    canPlaybackAudio = true;
    connect = vi.fn(async () => {
      this.emit(events.Connected);
    });
    disconnect = vi.fn(() => {
      this.emit(events.Disconnected);
    });
    startAudio = vi.fn(async () => undefined);
    localParticipant = {
      setMicrophoneEnabled: vi.fn(async () => undefined),
    };

    constructor() {
      instances.push(this);
    }

    on(event: string, handler: RoomHandler) {
      this.handlers.set(event, handler);
      return this;
    }

    emit(event: string, ...args: readonly unknown[]) {
      const handler = this.handlers.get(event);

      if (handler) {
        handler(...args);
      }
    }
  }

  type RoomMockInstance = InstanceType<typeof RoomMockClass>;

  return {
    roomInstances: instances,
    RoomEvent: events,
    Track: track,
    RoomMock: RoomMockClass,
  };
});

vi.mock('livekit-client', () => ({
  Room: RoomMock,
  RoomEvent,
  Track,
}));

beforeEach(() => {
  roomInstances.length = 0;
  document.body.replaceChildren();
});

test('connectToVoice requests a token, connects to LiveKit, and enables the microphone', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ token: 'jwt-token' }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  const onStatusChanged = vi.fn();

  connectToVoice('ws://livekit', 'http://backend/token', 'village', 'player-1', {
    onStatusChanged,
    onNeedsInteraction: vi.fn(),
  });

  await vi.waitFor(() => {
    expect(roomInstances[0].localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
  });

  expect(fetchMock).toHaveBeenCalledWith('http://backend/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomName: 'village', identity: 'player-1' }),
  });
  expect(roomInstances[0].connect).toHaveBeenCalledWith('ws://livekit', 'jwt-token');
  expect(onStatusChanged).toHaveBeenCalledWith('connecting');
  expect(onStatusChanged).toHaveBeenCalledWith('connected');
});

test('connectToVoice attaches and removes remote audio elements', () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ token: 'jwt-token' }),
  })));
  const audioElement = document.createElement('audio');
  const trackMock = {
    kind: Track.Kind.Audio,
    attach: vi.fn(() => audioElement),
    detach: vi.fn(() => [audioElement]),
  };

  connectToVoice('ws://livekit', 'http://backend/token', 'village', 'player-1', {
    onStatusChanged: vi.fn(),
    onNeedsInteraction: vi.fn(),
  });

  roomInstances[0].emit(RoomEvent.TrackSubscribed, trackMock, { trackSid: 'track-1' });

  expect(document.body.contains(audioElement)).toBe(true);

  roomInstances[0].emit(RoomEvent.TrackUnsubscribed, trackMock, { trackSid: 'track-1' });

  expect(document.body.contains(audioElement)).toBe(false);
});

test('connectToVoice calls onNeedsInteraction when audio playback is blocked', () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ token: 'jwt-token' }),
  })));
  const onNeedsInteraction = vi.fn();

  connectToVoice('ws://livekit', 'http://backend/token', 'village', 'player-1', {
    onStatusChanged: vi.fn(),
    onNeedsInteraction,
  });

  roomInstances[0].canPlaybackAudio = false;
  roomInstances[0].emit(RoomEvent.AudioPlaybackStatusChanged);

  expect(onNeedsInteraction).toHaveBeenCalled();
});

test('VoiceConnection setMicrophoneEnabled delegates to the local participant', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ token: 'jwt-token' }),
  })));

  const connection = connectToVoice('ws://livekit', 'http://backend/token', 'village', 'player-1', {
    onStatusChanged: vi.fn(),
    onNeedsInteraction: vi.fn(),
  });

  await connection.setMicrophoneEnabled(false);

  expect(roomInstances[0].localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false);
});

test('connectToVoice reports disconnected status and removes audio elements on disconnect', () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ token: 'jwt-token' }),
  })));
  const onStatusChanged = vi.fn();
  const audioElement = document.createElement('audio');
  const trackMock = {
    kind: Track.Kind.Audio,
    attach: vi.fn(() => audioElement),
    detach: vi.fn(() => [audioElement]),
  };

  connectToVoice('ws://livekit', 'http://backend/token', 'village', 'player-1', {
    onStatusChanged,
    onNeedsInteraction: vi.fn(),
  });

  roomInstances[0].emit(RoomEvent.TrackSubscribed, trackMock, { trackSid: 'track-1' });
  roomInstances[0].emit(RoomEvent.Disconnected);

  expect(onStatusChanged).toHaveBeenCalledWith('disconnected');
  expect(document.body.contains(audioElement)).toBe(false);
});

test('connectToVoice reports error status when token fetch fails', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
  const onStatusChanged = vi.fn();

  connectToVoice('ws://livekit', 'http://backend/token', 'village', 'player-1', {
    onStatusChanged,
    onNeedsInteraction: vi.fn(),
  });

  await vi.waitFor(() => {
    expect(onStatusChanged).toHaveBeenCalledWith('error');
  });
});
