import { ConnectionState, Room, RoomEvent, Track } from 'livekit-client';
import { CAT_COLLISION_TOPIC, type CatCollisionEvent } from '../domain/catCollision.ts';

export type VoiceConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type VoiceConnectionCallbacks = {
  onStatusChanged(status: VoiceConnectionStatus): void;
  onNeedsInteraction(): void;
};

export type VoiceConnection = {
  enableAudio(): Promise<void>;
  setMicrophoneEnabled(enabled: boolean): Promise<void>;
  sendCatCollision(event: CatCollisionEvent): Promise<void>;
  disconnect(): void;
};

type TokenResponse = {
  token: unknown;
};

export function connectToVoice(
  liveKitUrl: string,
  tokenApiUrl: string,
  roomName: string,
  identity: string,
  callbacks: VoiceConnectionCallbacks,
): VoiceConnection {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  const attachedElements = new Map<string, HTMLMediaElement>();
  let aborted = false;

  room.on(RoomEvent.TrackSubscribed, (track, publication) => {
    if (track.kind !== Track.Kind.Audio) {
      return;
    }

    removeAttachedElement(publication.trackSid, attachedElements);
    const element = track.attach();
    element.autoplay = true;
    document.body.appendChild(element);
    attachedElements.set(publication.trackSid, element);
  });

  room.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
    for (const element of track.detach()) {
      element.remove();
    }

    removeAttachedElement(publication.trackSid, attachedElements);
  });

  room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
    if (!room.canPlaybackAudio) {
      callbacks.onNeedsInteraction();
    }
  });

  room.on(RoomEvent.Connected, () => {
    callbacks.onStatusChanged('connected');
  });

  room.on(RoomEvent.Disconnected, () => {
    removeAttachedElements(attachedElements);
    callbacks.onStatusChanged('disconnected');
  });

  callbacks.onStatusChanged('connecting');
  void connectRoom();

  return {
    async enableAudio(): Promise<void> {
      await room.startAudio();
    },
    async setMicrophoneEnabled(enabled: boolean): Promise<void> {
      await room.localParticipant.setMicrophoneEnabled(enabled);
    },
    async sendCatCollision(event: CatCollisionEvent): Promise<void> {
      if (room.state !== ConnectionState.Connected || aborted) {
        return;
      }

      const payload = new TextEncoder().encode(JSON.stringify(event));
      await room.localParticipant.publishData(payload, {
        reliable: true,
        topic: CAT_COLLISION_TOPIC,
      });
    },
    disconnect(): void {
      aborted = true;
      room.disconnect();
      removeAttachedElements(attachedElements);
    },
  };

  async function connectRoom(): Promise<void> {
    try {
      const token = await fetchLiveKitToken(tokenApiUrl, roomName, identity);

      if (aborted) {
        return;
      }

      await room.connect(liveKitUrl, token);

      if (aborted) {
        return;
      }

      await room.localParticipant.setMicrophoneEnabled(true);
    } catch {
      if (!aborted) {
        callbacks.onStatusChanged('error');
      }
    }
  }
}

async function fetchLiveKitToken(
  tokenApiUrl: string,
  roomName: string,
  identity: string,
): Promise<string> {
  const response = await fetch(tokenApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomName, identity }),
  });

  if (!response.ok) {
    throw new Error('LiveKit token request failed');
  }

  const body = await response.json() as TokenResponse;

  if (typeof body.token !== 'string' || body.token.trim().length === 0) {
    throw new Error('LiveKit token response is invalid');
  }

  return body.token;
}

function removeAttachedElement(
  trackSid: string,
  attachedElements: Map<string, HTMLMediaElement>,
): void {
  const attachedElement = attachedElements.get(trackSid);

  if (!attachedElement) {
    return;
  }

  attachedElement.remove();
  attachedElements.delete(trackSid);
}

function removeAttachedElements(attachedElements: Map<string, HTMLMediaElement>): void {
  for (const attachedElement of attachedElements.values()) {
    attachedElement.remove();
  }

  attachedElements.clear();
}
