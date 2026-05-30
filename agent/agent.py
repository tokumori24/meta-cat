from pathlib import Path
import asyncio
import json
import logging
import random
import time
import wave

from livekit import agents, rtc

AGENT_NAME = "cat-sound-agent"
CAT_COLLISION_TOPIC = "cat_collision"
CAT_COLLISION_EVENT_TYPE = "cat_collision"
CAT_SOUND_TRACK_NAME = "cat-sound"
SOUND_DIR = Path(__file__).parent / "sounds"
SOUND_FILES = (
    "nya_question.wav",
    "nya.wav",
    "nya_short.wav",
    "hiss.wav",
    "purr.wav",
)
COLLISION_COOLDOWN_SECONDS = 1.5


class CatSoundPlayer:
    def __init__(self, source: rtc.AudioSource) -> None:
        self._source = source
        self._last_played_at_by_pair: dict[str, float] = {}

    async def play_for_collision(self, payload: bytes) -> None:
        event = parse_cat_collision(payload)
        pair_key = ":".join(sorted([event["fromCatId"], event["toCatId"]]))
        now = time.monotonic()
        last_played_at = self._last_played_at_by_pair.get(pair_key)

        if last_played_at is not None and now - last_played_at < COLLISION_COOLDOWN_SECONDS:
            return

        self._last_played_at_by_pair[pair_key] = now
        await self._play_wav(resolve_sound_path())

    async def _play_wav(self, path: Path) -> None:
        with wave.open(str(path), "rb") as wav_file:
            sample_rate = wav_file.getframerate()
            channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()

            if sample_width != 2:
                raise ValueError("Cat sound WAV files must use 16-bit PCM")

            chunk_samples = sample_rate // 20
            frames = wav_file.readframes(chunk_samples)

            while frames:
                frame = rtc.AudioFrame(
                    data=frames,
                    sample_rate=sample_rate,
                    num_channels=channels,
                    samples_per_channel=len(frames) // (channels * sample_width),
                )
                await self._source.capture_frame(frame)
                frames = wav_file.readframes(chunk_samples)


async def entrypoint(ctx: agents.JobContext) -> None:
    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY)

    source = rtc.AudioSource(24000, 1)
    track = rtc.LocalAudioTrack.create_audio_track(CAT_SOUND_TRACK_NAME, source)
    await ctx.room.local_participant.publish_track(track)
    player = CatSoundPlayer(source)

    def on_data_received(packet: rtc.DataPacket) -> None:
        if packet.topic != CAT_COLLISION_TOPIC:
            return

        task = asyncio.create_task(player.play_for_collision(packet.data))
        task.add_done_callback(log_cat_sound_task_failure)

    ctx.room.on("data_received", on_data_received)


def log_cat_sound_task_failure(task: asyncio.Task[None]) -> None:
    if task.cancelled():
        return

    exception = task.exception()

    if exception is not None:
        logging.error("cat sound play failed: %s", exception)


def parse_cat_collision(payload: bytes) -> dict[str, str]:
    value = json.loads(payload.decode("utf-8"))

    if not isinstance(value, dict):
        raise ValueError("Cat collision payload must be an object")

    if value.get("type") != CAT_COLLISION_EVENT_TYPE:
        raise ValueError("Cat collision event type is invalid")

    cat_ids = {
        "fromCatId": value.get("fromCatId"),
        "toCatId": value.get("toCatId"),
    }

    for key, item in cat_ids.items():
        if not isinstance(item, str) or len(item.strip()) == 0:
            raise ValueError(f"{key} is required")

    return {
        "fromCatId": cat_ids["fromCatId"],
        "toCatId": cat_ids["toCatId"],
    }


def resolve_sound_path() -> Path:
    path = SOUND_DIR / random.choice(SOUND_FILES)

    if not path.is_file():
        raise FileNotFoundError(f"Cat sound file is missing: {path.name}")

    return path


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint, agent_name=AGENT_NAME))
