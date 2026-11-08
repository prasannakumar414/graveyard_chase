"""Generate the game's original, quiet procedural sounds using only Python's standard library.

Run from any directory: python3 scripts/generate-audio.py
Validate existing files: python3 scripts/generate-audio.py --check
"""

import math
from pathlib import Path
import struct
import sys
import wave

SAMPLE_RATE = 22050
OUTPUT = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'audio'
TAU = math.tau


def envelope(time, duration, attack=0.012):
    return min(1, time / attack) * min(1, (duration - time) / 0.06)


def sweep(time, duration, start, end):
    phase = TAU * (start * time + (end - start) * time * time / (2 * duration))
    return math.sin(phase) * envelope(time, duration) * (1 - time / duration)


def chimes(time, notes):
    value = 0
    for onset, frequency in notes:
        age = time - onset
        if age >= 0:
            attack = min(1, age / 0.008)
            ring = math.sin(TAU * frequency * age) + 0.2 * math.sin(TAU * frequency * 2 * age)
            value += ring * math.exp(-age * 9) * attack
    return value * 0.25


def ambience(time):
    # Every oscillator completes an integer number of cycles in this eight-second loop.
    wind = sum(math.sin(TAU * (113 + index * 7.125) * time + index) for index in range(12)) / 12
    swell = 0.65 + 0.25 * math.sin(TAU * time / 8)
    drone = math.sin(TAU * 55 * time) + 0.4 * math.sin(TAU * 82.5 * time)
    return (0.16 * drone + 0.15 * wind) * swell


CLIPS = {
    'ambience': (8.0, ambience),
    'start': (0.65, lambda t: chimes(t, [(0, 220), (0.12, 330), (0.24, 440)])),
    'soul': (0.45, lambda t: chimes(t, [(0, 660), (0.07, 880), (0.14, 1320)])),
    'transform': (0.65, lambda t: 0.38 * sweep(t, 0.65, 100, 620)
                  + 0.12 * sweep(t, 0.65, 150, 930)),
    'revert': (0.65, lambda t: 0.28 * sweep(t, 0.65, 500, 90)),
    'heartLost': (0.5, lambda t: 0.4 * sweep(t, 0.5, 180, 48)),
    'respawn': (0.6, lambda t: chimes(t, [(0, 260), (0.16, 390)])),
    'gameover': (1.2, lambda t: chimes(t, [(0, 330), (0.24, 247), (0.48, 165)])
                 + 0.16 * sweep(t, 1.2, 90, 40)),
}


def generate():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (duration, sample) in CLIPS.items():
        frames = bytearray()
        for index in range(round(duration * SAMPLE_RATE)):
            time = index / SAMPLE_RATE
            value = sample(time)
            if name != 'ambience':
                value *= envelope(time, duration)
            frames.extend(struct.pack('<h', round(value * 32767)))
        with wave.open(str(OUTPUT / f'{name}.wav'), 'wb') as audio:
            audio.setparams((1, 2, SAMPLE_RATE, 0, 'NONE', 'not compressed'))
            audio.writeframes(frames)


def validate():
    total = 0
    for name, (duration, _) in CLIPS.items():
        path = OUTPUT / f'{name}.wav'
        with wave.open(str(path), 'rb') as audio:
            assert audio.getnchannels() == 1 and audio.getsampwidth() == 2
            assert audio.getframerate() == SAMPLE_RATE
            assert audio.getnframes() == round(duration * SAMPLE_RATE)
            data = audio.readframes(audio.getnframes())
        samples = struct.unpack(f'<{len(data) // 2}h', data)
        peak = max(abs(sample) for sample in samples)
        assert 0 < peak < 32767, f'{name}: silent or clipped'
        assert abs(samples[-1] - samples[0]) < 500, f'{name}: discontinuous endpoints'
        total += path.stat().st_size
        print(f'{name}: {duration:.2f}s, peak {peak / 32767:.2f}')
    print(f'Validated {len(CLIPS)} clips, {total / 1024:.1f} KiB total')


if __name__ == '__main__':
    if '--check' not in sys.argv:
        generate()
    validate()
