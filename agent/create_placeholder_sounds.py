from pathlib import Path
import math
import wave

SOUND_DIR = Path(__file__).parent / "sounds"
SAMPLE_RATE = 24000
DURATION_SECONDS = 0.45
AMPLITUDE = 11000
SOUNDS = {
    "nya_question.wav": 660,
    "nya.wav": 520,
    "nya_short.wav": 780,
    "hiss.wav": 220,
    "purr.wav": 140,
}


def create_tone(path: Path, frequency: int) -> None:
    total_samples = int(SAMPLE_RATE * DURATION_SECONDS)

    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)

        for sample_index in range(total_samples):
            envelope = 1 - (sample_index / total_samples)
            sample = int(AMPLITUDE * envelope * math.sin(2 * math.pi * frequency * sample_index / SAMPLE_RATE))
            wav_file.writeframesraw(sample.to_bytes(2, byteorder="little", signed=True))


def main() -> None:
    SOUND_DIR.mkdir(exist_ok=True)

    for filename, frequency in SOUNDS.items():
        create_tone(SOUND_DIR / filename, frequency)


if __name__ == "__main__":
    main()
