import asyncio
import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch


def load_agent_module() -> types.ModuleType:
    livekit_module = types.ModuleType("livekit")
    agents_module = types.ModuleType("livekit.agents")
    rtc_module = types.ModuleType("livekit.rtc")

    agents_module.JobContext = object
    agents_module.AutoSubscribe = types.SimpleNamespace(AUDIO_ONLY="audio_only")
    agents_module.WorkerOptions = object
    agents_module.cli = types.SimpleNamespace(run_app=lambda worker_options: None)

    rtc_module.AudioSource = object
    rtc_module.LocalAudioTrack = types.SimpleNamespace(create_audio_track=lambda name, source: object())
    rtc_module.DataPacket = object
    rtc_module.AudioFrame = object

    livekit_module.agents = agents_module
    livekit_module.rtc = rtc_module
    sys.modules["livekit"] = livekit_module
    sys.modules["livekit.agents"] = agents_module
    sys.modules["livekit.rtc"] = rtc_module

    spec = importlib.util.spec_from_file_location("cat_sound_agent", Path(__file__).with_name("agent.py"))
    if spec is None or spec.loader is None:
        raise RuntimeError("agent.py import spec is unavailable")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


agent = load_agent_module()


class ParseCatCollisionTest(unittest.TestCase):
    def test_valid_payload_returns_cat_ids(self) -> None:
        payload = b'{"type":"cat_collision","fromCatId":"A","toCatId":"B"}'

        result = agent.parse_cat_collision(payload)

        self.assertEqual({"fromCatId": "A", "toCatId": "B"}, result)

    def test_invalid_event_type_raises_error(self) -> None:
        payload = b'{"type":"wrong","fromCatId":"A","toCatId":"B"}'

        with self.assertRaisesRegex(ValueError, "type is invalid"):
            agent.parse_cat_collision(payload)

    def test_missing_from_cat_id_raises_error(self) -> None:
        payload = b'{"type":"cat_collision","fromCatId":" ","toCatId":"B"}'

        with self.assertRaisesRegex(ValueError, "fromCatId is required"):
            agent.parse_cat_collision(payload)

    def test_non_object_payload_raises_error(self) -> None:
        with self.assertRaisesRegex(ValueError, "payload must be an object"):
            agent.parse_cat_collision(b'["cat_collision"]')


class CatSoundPlayerTest(unittest.TestCase):
    def test_pair_cooldown_skips_repeated_collision(self) -> None:
        async def run_test() -> None:
            player = agent.CatSoundPlayer(object())
            sound_path = Path("sound.wav")

            with (
                patch.object(agent.time, "monotonic", side_effect=[100.0, 100.5]),
                patch.object(agent, "resolve_sound_path", return_value=sound_path),
                patch.object(player, "_play_wav", new_callable=AsyncMock) as play_wav,
            ):
                await player.play_for_collision(
                    b'{"type":"cat_collision","fromCatId":"A","toCatId":"B"}'
                )
                await player.play_for_collision(
                    b'{"type":"cat_collision","fromCatId":"B","toCatId":"A"}'
                )

            play_wav.assert_awaited_once_with(sound_path)

        asyncio.run(run_test())

    def test_collision_after_cooldown_plays_sound_and_updates_pair_timestamp(self) -> None:
        async def run_test() -> None:
            player = agent.CatSoundPlayer(object())
            sound_path = Path("sound.wav")

            with (
                patch.object(agent.time, "monotonic", side_effect=[100.0, 102.0]),
                patch.object(agent, "resolve_sound_path", return_value=sound_path),
                patch.object(player, "_play_wav", new_callable=AsyncMock) as play_wav,
            ):
                await player.play_for_collision(
                    b'{"type":"cat_collision","fromCatId":"A","toCatId":"B"}'
                )
                await player.play_for_collision(
                    b'{"type":"cat_collision","fromCatId":"B","toCatId":"A"}'
                )

            self.assertEqual(2, play_wav.await_count)
            play_wav.assert_awaited_with(sound_path)

        asyncio.run(run_test())


class ResolveSoundPathTest(unittest.TestCase):
    def test_resolve_sound_path_uses_random_sound_file(self) -> None:
        selected_file = agent.SOUND_FILES[0]

        with (
            patch.object(agent.random, "choice", return_value=selected_file) as choice,
            patch.object(Path, "is_file", return_value=True),
        ):
            result = agent.resolve_sound_path()

        choice.assert_called_once_with(agent.SOUND_FILES)
        self.assertEqual(agent.SOUND_DIR / selected_file, result)

    def test_resolve_sound_path_raises_when_selected_file_is_missing(self) -> None:
        selected_file = agent.SOUND_FILES[0]

        with (
            patch.object(agent.random, "choice", return_value=selected_file),
            patch.object(Path, "is_file", return_value=False),
        ):
            with self.assertRaisesRegex(FileNotFoundError, selected_file):
                agent.resolve_sound_path()


if __name__ == "__main__":
    unittest.main()
