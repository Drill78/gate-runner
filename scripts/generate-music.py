"""Render the original Ashen Gates instrumental score without external samples.

Requires Python 3.11+, numpy, scipy and an FFmpeg build with libmp3lame.
Example: python scripts/generate-music.py --ffmpeg /path/to/ffmpeg
WAV masters and analysis stay in --work-dir; only four MP3s go in public/audio.
The notes, arrangement, oscillators, drum models and room response are original.
"""

from __future__ import annotations

import argparse
from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

FS = 44100
TAU = 2 * np.pi
ROOT = Path(__file__).resolve().parents[1]
TRACKS = {
    "normal": {"title": "铁与誓言", "bpm": 112, "bars": 24, "seed": 71801},
    "boss": {"title": "王座之前·诸王战歌", "bpm": 112, "bars": 32, "seed": 71802},
    "final": {"title": "灰烬终誓·交响王权", "bpm": 112, "bars": 32, "seed": 71803},
    "forbidden": {"title": "门后的低语", "bpm": 80, "bars": 16, "seed": 71804},
}

# Eight-bar original D-minor theme. Each tuple is (MIDI pitch, quarter-note beats).
THEME = [
    [(74, .75), (77, .25), (81, 1), (79, .5), (77, .5), (74, 1)],
    [(72, .5), (74, .5), (77, 1), (76, 1), (74, 1)],
    [(70, 1), (74, .5), (77, .5), (81, .75), (79, .25), (77, 1)],
    [(79, .5), (76, .5), (72, 1), (74, .5), (76, .5), (79, 1)],
    [(81, 1), (77, .5), (76, .5), (74, 1), (69, 1)],
    [(77, .75), (81, .25), (84, 1), (81, .5), (79, .5), (77, 1)],
    [(76, .5), (79, .5), (84, .5), (82, .5), (79, 1), (76, 1)],
    [(73, .5), (76, .5), (81, 1), (79, .5), (76, .5), (73, 1)],
]
CHORDS = [(38, 3), (38, 3), (34, 4), (36, 4), (38, 3), (41, 4), (36, 4), (33, 4)]
SECRET_THEME = [
    [(62, 1.5), (63, .5), (69, 2)],
    [(70, 1), (65, 1), (63, 1), (62, 1)],
    [(58, 1.5), (62, .5), (63, 2)],
    [(65, 1), (63, .5), (60, .5), (57, 2)],
    [(62, 2), (69, .5), (70, .5), (69, 1)],
    [(63, 1.5), (65, .5), (62, 2)],
    [(60, 1), (58, 1), (57, 2)],
    [(63, 1), (62, 1), (57, 2)],
]


def hz(note: float) -> float:
    return 440 * 2 ** ((note - 69) / 12)


def filter_audio(data, cutoff, mode="lowpass", order=2, rate=FS):
    return signal.sosfilt(signal.butter(order, cutoff, btype=mode, fs=rate, output="sos"), data)


def edges(data, attack=.003, release=.025, rate=FS):
    data = np.asarray(data).copy()
    a, r = min(len(data), int(attack * rate)), min(len(data), int(release * rate))
    if a:
        data[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        data[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return data


def finish_voice(data, level=1.0):
    data = np.asarray(data, dtype=np.float32)
    peak = float(np.max(np.abs(data)))
    return data * (level / max(peak, 1e-8))


@lru_cache(maxsize=768)
def guitar(note: int, duration: float, muted: bool, variant: int):
    """Pick-excited inharmonic strings, bridge coloration, overdrive and cabinet.

    Three strings form a power chord. Nonlinear processing runs at 2x rate to
    reduce aliasing; double tracking uses different pick spectra and detuning.
    """
    rate = FS * 2
    t = np.arange(int((duration + .08) * rate)) / rate
    rng = np.random.default_rng(1000 + note * 17 + variant)
    raw = np.zeros_like(t)
    pitch_offset = (-.055, .043, -.023, .07)[variant % 4]
    for string_index, interval in enumerate((0, 7, 12)):
        f = hz(note + interval + pitch_offset)
        pick = .14 + .019 * variant + .012 * string_index
        for harmonic in range(1, min(30, int(8500 / f))):
            inharmonic = math.sqrt(1 + .000015 * harmonic * harmonic)
            phase = TAU * f * harmonic * inharmonic * (t + .000075 * (1 - np.exp(-t / .012)))
            amplitude = np.sin(np.pi * harmonic * pick) / harmonic ** .93
            damping = np.exp(-t * (1.5 + harmonic * .21 + (11 if muted else 0)))
            raw += amplitude * np.sin(phase + rng.uniform(-.12, .12)) * damping / (1 + string_index * .25)
    raw *= (1 - np.exp(-t / .0009))
    pick_noise = filter_audio(rng.normal(0, 1, len(t)), [1500, 7800], "bandpass", rate=rate)
    raw += pick_noise * np.exp(-t / .006) * .16
    # Asymmetric valve saturation followed by a closed-back speaker response.
    driven = np.tanh(raw * 3.7 + .06) - np.tanh(.06)
    driven = filter_audio(driven, 78, "highpass", rate=rate)
    driven = filter_audio(driven, 4800 if muted else 5700, order=3, rate=rate)
    cabinet = driven + .28 * filter_audio(driven, [190, 410], "bandpass", rate=rate)
    cabinet -= .18 * filter_audio(driven, [1900, 2500], "bandpass", rate=rate)
    cabinet = signal.resample_poly(cabinet, 1, 2)
    envelope = np.exp(-np.arange(len(cabinet)) / FS / (.18 if muted else 1.4))
    cabinet = edges(cabinet * envelope, .0015, .055)
    return finish_voice(cabinet, .9)


@lru_cache(maxsize=256)
def bass(note: int, duration: float, variant: int):
    t = np.arange(int((duration + .06) * FS)) / FS
    f = hz(note + (variant - 1.5) * .011)
    phase = TAU * f * (t + .00018 * (1 - np.exp(-t / .013)))
    raw = np.zeros_like(t)
    for harmonic in range(1, 12):
        raw += np.sin(phase * harmonic) * np.exp(-t * harmonic * .55) / harmonic ** 1.5
    raw = np.tanh(raw * 1.55)
    raw = filter_audio(raw, 1850, order=2)
    raw = filter_audio(raw, 29, "highpass")
    raw *= (1 - np.exp(-t / .003)) * np.exp(-t / 1.7)
    return finish_voice(edges(raw, .002, .055), .86)


@lru_cache(maxsize=320)
def melody(note: int, duration: float, voice: str, variant: int = 0):
    """A bowed vielle / wooden reed blend, or struck medieval dulcimer."""
    t = np.arange(int((duration + (.38 if voice == "lute" else .14)) * FS)) / FS
    rng = np.random.default_rng(5200 + note * 7 + variant)
    f = hz(note + (variant % 3 - 1) * .019)
    vibrato = .004 * np.sin(TAU * 5.25 * t) * np.minimum(1, t / .18)
    phase = TAU * f * np.cumsum(1 + vibrato) / FS
    raw = np.zeros_like(t)
    for harmonic in range(1, min(30, int(9500 / f))):
        if voice == "lute":
            amplitude = np.sin(harmonic * .41) / harmonic ** 1.4
            envelope = np.exp(-t * (4.1 + harmonic * .32))
        else:
            # Nasal bowed body and warm wood resonance, not a bare oscillator.
            resonance = 1 + 1.6 * np.exp(-((f * harmonic - 1400) / 650) ** 2)
            amplitude = resonance / harmonic ** (1.45 if voice == "reed" else 1.14)
            if voice == "reed" and harmonic % 2 == 0:
                amplitude *= .35
            envelope = (1 - np.exp(-t / .018)) * (.82 + .18 * np.exp(-t / .22))
        raw += amplitude * np.sin(phase * harmonic + .035 * harmonic) * envelope
    breath = filter_audio(rng.normal(0, 1, len(t)), [1100, 5500], "bandpass")
    raw += breath * (.018 if voice == "reed" else .01) * (1 - np.exp(-t / .04))
    if voice != "lute":
        end = max(duration - .05, .05)
        raw *= np.exp(-np.maximum(t - end, 0) / .045)
    raw = filter_audio(raw, 6900, order=2)
    return finish_voice(edges(raw, .003 if voice == "lute" else .009, .05), .8)


@lru_cache(maxsize=128)
def choir(note: int, duration: float, variant: int):
    """Slow wordless vowel/formant pad; no recordings, text or sung syllables."""
    t = np.arange(int((duration + 1.1) * FS)) / FS
    raw = np.zeros_like(t)
    for cents in (-.075, .031, .083):
        f = hz(note + cents + variant * .005)
        phase = TAU * f * t + .06 * np.sin(TAU * 4.7 * t + cents * 10)
        for harmonic in range(1, min(45, int(4500 / f))):
            overtone = f * harmonic
            formants = .2 + 2.2 * np.exp(-((overtone - 720) / 170) ** 2)
            formants += 1.45 * np.exp(-((overtone - 1140) / 240) ** 2)
            formants += .5 * np.exp(-((overtone - 2650) / 360) ** 2)
            raw += np.sin(phase * harmonic + .09 * harmonic) * formants / harmonic ** 1.3
    envelope = (1 - np.exp(-t / .32)) * np.exp(-np.maximum(t - duration, 0) / .31)
    raw = filter_audio(raw, 3700, order=2)
    return finish_voice(edges(raw * envelope, .02, .15), .58)


@lru_cache(maxsize=32)
def drum(kind: str, variant: int = 0):
    rng = np.random.default_rng(80311 + sum(ord(c) for c in kind) * 19 + variant)
    length = {"kick": .5, "snare": .43, "hat": .12, "open": .4, "ride": .65, "crash": 2.3,
              "tom-low": .8, "tom-mid": .7, "tom-high": .6}[kind]
    t = np.arange(int(length * FS)) / FS
    noise = rng.normal(0, 1, len(t))
    if kind == "kick":
        frequency = 45 + 112 * np.exp(-t / .023) + 8 * np.exp(-t / .15)
        raw = np.sin(TAU * np.cumsum(frequency) / FS) * np.exp(-t / .115)
        raw += .27 * filter_audio(noise, [1800, 6500], "bandpass") * np.exp(-t / .009)
        raw = np.tanh(raw * 1.5)
    elif kind == "snare":
        raw = (.58 * np.sin(TAU * 181 * t) + .24 * np.sin(TAU * 329 * t)) * np.exp(-t / .042)
        raw += 1.2 * filter_audio(noise, [1200, 10500], "bandpass") * np.exp(-t / .085)
        raw += .2 * filter_audio(noise, [450, 1600], "bandpass") * np.exp(-t / .12)
        raw = np.tanh(raw * 1.4)
    elif kind.startswith("tom"):
        base = {"tom-low": 87, "tom-mid": 119, "tom-high": 163}[kind]
        phase = TAU * np.cumsum(base + 33 * np.exp(-t / .025)) / FS
        raw = (np.sin(phase) + .25 * np.sin(phase * 1.61) + .12 * np.sin(phase * 2.42)) * np.exp(-t / .15)
        raw += .18 * filter_audio(noise, [600, 4500], "bandpass") * np.exp(-t / .019)
    else:
        decay = {"hat": .025, "open": .12, "ride": .2, "crash": .62}[kind]
        raw = filter_audio(noise, 4800 if kind != "crash" else 2800, "highpass", order=3)
        metal = sum(np.sin(TAU * f * t + variant) for f in (3271, 4159, 5423, 6811, 7937))
        metal = np.tanh(metal * 1.5)
        raw = .8 * raw + .16 * filter_audio(metal, 4600, "highpass")
        raw *= np.exp(-t / decay)
        if kind == "ride":
            raw += .18 * np.sin(TAU * 2455 * t) * np.exp(-t / .25)
    return finish_voice(edges(raw, .0005, .02), .95)


@lru_cache(maxsize=32)
def bell(note: int, variant: int = 0):
    t = np.arange(int(4.6 * FS)) / FS
    f = hz(note)
    raw = np.zeros_like(t)
    for index, ratio in enumerate((.5, 1, 2.01, 2.76, 4.07, 5.4, 6.73, 8.93)):
        raw += np.sin(TAU * f * ratio * t + .1 * variant) * np.exp(-t / (2.4 / (1 + index * .3))) / (1 + index * .7)
    return finish_voice(edges(raw, .003, .2), .8)


@lru_cache(maxsize=256)
def strings(note: int, duration: float, short: bool = False, variant: int = 0):
    """Five detuned bow voices, evolving upper harmonics and a soft rosined attack."""
    t = np.arange(int((duration + (.11 if short else .48)) * FS)) / FS
    rng = np.random.default_rng(19011 + note * 13 + variant)
    raw = np.zeros_like(t)
    for player in range(5):
        f = hz(note + (player - 2) * .035 + variant * .008)
        phase = TAU * f * t + .045 * np.sin(TAU * (4.4 + player * .13) * t)
        for harmonic in range(1, min(22, int(9000 / f))):
            body = 1 + .5 * np.exp(-((harmonic * f - 1800) / 850) ** 2)
            raw += body * np.sin(phase * harmonic + player * .7) / harmonic ** 1.35
    raw += filter_audio(rng.normal(0, 1, len(t)), [1200, 6000], 'bandpass') * .06
    attack = .012 if short else .13
    envelope = (1 - np.exp(-t / attack)) * np.exp(-np.maximum(0, t - duration * (.72 if short else .9)) / (.05 if short else .15))
    return finish_voice(edges(filter_audio(raw * envelope, 6800), .007, .07))


@lru_cache(maxsize=256)
def brass(note: int, duration: float, variant: int = 0):
    """Horn/trombone section: breath-shaped spectral bloom rather than a pad."""
    t = np.arange(int((duration + .19) * FS)) / FS
    raw = np.zeros_like(t)
    envelope = (1 - np.exp(-t / .055)) * np.exp(-np.maximum(0, t - duration * .92) / .055)
    for player, cents in enumerate((-.055, 0, .047)):
        f = hz(note + cents)
        phase = TAU * f * t + .024 * np.sin(TAU * (4.6 + player * .17) * t) * (1 - np.exp(-t / .3))
        for harmonic in range(1, min(20, int(7500 / f))):
            brightness = envelope ** (1 + harmonic * .045)
            raw += np.sin(phase * harmonic + player * .15) * brightness / harmonic ** (1.04 + variant * .09)
    return finish_voice(edges(filter_audio(raw, 5100), .012, .07))


@lru_cache(maxsize=64)
def timpani(note: int, variant: int = 0):
    t = np.arange(int(1.8 * FS)) / FS
    rng = np.random.default_rng(27000 + note + variant)
    raw = np.zeros_like(t)
    for ratio, gain in [(1, 1), (1.5, .36), (2.05, .18), (2.8, .07)]:
        phase = TAU * hz(note) * ratio * (t + .0018 * (1 - np.exp(-t / .03)))
        raw += gain * np.sin(phase) * np.exp(-t / (.63 / ratio))
    raw += filter_audio(rng.normal(0, 1, len(t)), 1600) * np.exp(-t / .024) * .2
    return finish_voice(edges(raw, .002, .14))


class Arrangement:
    def __init__(self, key: str):
        self.key = key
        self.config = TRACKS[key]
        self.beat = 60 / self.config["bpm"]
        self.seconds = self.config["bars"] * 4 * self.beat
        self.n = round(self.seconds * FS)
        self.rng = np.random.default_rng(self.config["seed"])
        self.buses = {name: np.zeros((self.n, 2), dtype=np.float32)
                      for name in ("guitar", "bass", "drums", "melody", "pad", "bell", "strings", "brass", "orchestra-drums")}

    def add(self, bus: str, voice, beat: float, gain=1.0, pan=0.0, jitter=0.0):
        """Circular placement carries every release across the loop boundary."""
        offset = round((beat * self.beat + jitter) * FS) % self.n
        count = len(voice)
        stereo = np.asarray(voice, dtype=np.float32)[:, None] * np.array(
            [np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)], dtype=np.float32
        )[None, :] * gain
        first = min(count, self.n - offset)
        self.buses[bus][offset:offset + first] += stereo[:first]
        if first < count:
            self.buses[bus][:count - first] += stereo[first:]

    def hit(self, kind: str, beat: float, gain=1.0, pan=0.0):
        variant = int(self.rng.integers(0, 4))
        jitter = float(self.rng.uniform(-.003, .003)) if beat % 4 else 0
        self.add("drums", drum(kind, variant), beat, gain * self.rng.uniform(.94, 1.04), pan, jitter)

    def rhythm(self, bar: int, root: int):
        mode = self.key
        start = bar * 4
        # Palm-muted sixteenth gallops get denser in later theme variations.
        if mode == "normal":
            riff = [(0, .45), (.75, .2), (1, .45), (1.75, .2), (2, .45), (2.5, .22), (2.75, .2), (3, .45), (3.75, .2)]
        elif mode == "boss":
            riff = [(0, .22), (.25, .2), (.75, .2), (1, .45), (1.5, .22), (1.75, .2), (2, .22), (2.25, .2), (2.75, .2), (3, .45), (3.5, .22), (3.75, .2)]
        else:
            riff = [(0, .7), (1, .22), (1.25, .22), (1.5, .22), (2, .7), (3, .22), (3.25, .22), (3.5, .22)] if bar % 16 < 4 else [(i / 4, .215) for i in range(16) if i not in (6, 14)]
        for index, (position, length) in enumerate(riff):
            accented = position in (0, 2)
            pitch = root
            if bar % 4 == 3 and position >= 3:
                pitch += (0, 3, 5, 7)[int((position - 3) * 4) % 4]
            muted = not (position == 0 and bar % 4 == 0)
            duration = round(length * self.beat, 4)
            gain = .42 if accented else .31
            if mode != "normal" and bar % 16 in (0, 1, 2, 3): gain *= .55
            for side, pan in enumerate((-.79, .79)):
                self.add("guitar", guitar(pitch, duration, muted, (side + bar) % 4), start + position,
                         gain, pan, .002 + side * .006 + float(self.rng.uniform(-.0015, .0015)))
            self.add("bass", bass(root - 12, duration, index % 4), start + position,
                     .36 if accented else .27, -.015)
        # Open fifths establish harmonic weight behind the muted riffs.
        if bar % 2 == 0:
            for side, pan in enumerate((-.56, .56)):
                self.add("guitar", guitar(root, round(self.beat * 1.55, 4), False, side + 2), start,
                         .13 if mode == "normal" else .18, pan, side * .009)

    def rock_drums(self, bar: int):
        mode, start = self.key, bar * 4
        kick_positions = {
            "normal": [0, 1.5, 2, 2.75],
            "boss": [0, .5, .75, 1.5, 2, 2.5, 2.75, 3.5],
            "final": [0, .25, .5, .75, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3.5, 3.75],
        }[mode]
        for p in kick_positions:
            self.hit("kick", start + p, .67 if p % 1 == 0 else .52)
        for p in ((2,) if mode != "normal" and bar % 16 < 4 else (1, 3)):
            self.hit("snare", start + p, .67, -.08)
        if mode != "normal" or bar % 2:
            self.hit("snare", start + 2.75, .1, -.08)
        for step in range(8):
            p = step * .5
            cymbal = "ride" if mode == "final" and bar % 8 >= 4 else "hat"
            if step == 7 and bar % 2:
                cymbal = "open"
            self.hit(cymbal, start + p, .17 if step % 2 == 0 else .1, .37)
        if mode == "final":
            for p in (1.75, 3.75):
                self.hit("hat", start + p, .075, .35)
        if bar % 4 == 0:
            self.hit("crash", start, .32 if mode != "final" else .39, -.42 if bar % 8 == 0 else .5)
        if bar % 8 == 7:
            for p, kind, pan in ((2.5, "snare", -.08), (2.75, "tom-high", -.4), (3, "tom-mid", .05), (3.5, "tom-low", .42), (3.75, "tom-low", .42)):
                self.hit(kind, start + p, .47, pan)

    def theme(self, bar: int, root: int, third: int):
        start, section = bar * 4, bar // 8
        mode = self.key
        # Common D-minor motif, with orchestral call/response and a half-time bridge.
        position = 0
        for index, (note, length) in enumerate(THEME[bar % 8]):
            duration = round(length * self.beat * .94, 4)
            if mode == 'normal':
                self.add('melody', melody(note - (12 if section == 1 else 0), duration, 'lute' if section == 1 else 'reed', index % 3), start + position, .18, -.14)
            elif mode == 'boss':
                self.add('brass', brass(note - 12, duration, 1), start + position, .19, -.2)
                if section % 2:
                    self.add('strings', strings(note, duration, False, 1), start + position + .02, .16, .25)
            else:
                self.add('strings', strings(note, duration, False, 2), start + position, .22, -.34)
                self.add('brass', brass(note - 12, duration, 0), start + position + .015, .18 if section % 2 else .12, .28)
                if index % 2 == 0:
                    self.add('melody', melody(note + 12, duration, 'lute', 1), start + position, .055, .48)
            position += length
        # Wide sustained strings give bosses harmonic scale instead of extra tempo.
        for index, interval in enumerate((0, third, 7, 12)):
            pitch = root + 24 + interval
            self.add('strings', strings(pitch, round(self.beat * 3.65, 4), False, index % 3), start, .048 if mode == 'normal' else .095, [-.68, .5, -.25, .68][index])
        if mode == 'normal':
            for index, interval in enumerate((0, 7, 12, third + 12, 7, 12, third + 12, 19)):
                self.add('melody', melody(root + 24 + interval, round(self.beat * .37, 4), 'lute', index % 3), start + index * .5, .05, -.5 if index % 2 else .5)
            return
        # Fanfare answers the theme in long notes; final score also has cello/violin ostinati.
        for beat, interval in ((0, 0), (2, 7), (3, third + 12)):
            self.add('brass', brass(root + 12 + interval, round(self.beat * (1.65 if beat == 0 else .8), 4), 2), start + beat, .1 if mode == 'boss' else .15, .05)
            self.add('orchestra-drums', timpani(root - 12, bar % 3), start + beat, .19 if mode == 'boss' else .29, -.12)
        if mode == 'final':
            for step, interval in enumerate((0, 7, 12, 7, third + 12, 7, 12, 7)):
                pitch = root + (12 if section == 2 else 24) + interval
                self.add('strings', strings(pitch, round(self.beat * .32, 4), True, step % 3), start + step * .5, .12, -.55 if step % 2 else .55)
            for index, interval in enumerate((0, third, 7)):
                self.add('pad', choir(root + 24 + interval, round(self.beat * 3.8, 4), index), start, .11 if section % 2 else .075, (index - 1) * .48)
            if bar % 4 == 0:
                self.add('bell', bell(root + 24, bar % 3), start, .095, .4)
        elif bar % 8 >= 4:
            for index, interval in enumerate((0, third, 7)):
                self.add('pad', choir(root + 24 + interval, round(self.beat * 3.8, 4), index), start, .06, (index - 1) * .4)

    def forbidden(self):
        roots = [38, 38, 34, 39, 38, 39, 36, 33]
        for bar in range(self.config["bars"]):
            start, root = bar * 4, roots[bar % 8]
            for side, pan in enumerate((-.73, .73)):
                self.add("guitar", guitar(root, round(self.beat * 2.9, 4), False, side + 2), start,
                         .17, pan, side * .011)
            for p in (0, 2.5):
                self.add("bass", bass(root - 12, round(self.beat * 1.4, 4), bar % 4), start + p, .34)
            for index, interval in enumerate((0, 7, 12)):
                self.add("pad", choir(root + 12 + interval, round(self.beat * 3.9, 4), index), start,
                         .16 if index == 0 else .09, (index - 1) * .48)
            # A quiet semitone tension appears only in this independent theme.
            if bar % 4 == 0:
                self.add("pad", choir(63, round(self.beat * 7, 4), 1), start, .037, -.31)
            self.hit("kick", start, .59)
            self.hit("kick", start + 2.75, .32)
            self.hit("snare", start + 2, .3, -.1)
            self.hit("tom-low", start + 1.5, .28, .35)
            if bar % 2:
                self.hit("tom-mid", start + 3.5, .25, -.25)
                self.hit("tom-low", start + 3.75, .28, .3)
            for p in (0, 1, 2, 3):
                self.hit("ride", start + p, .11, .39)
            if bar % 4 == 0:
                self.hit("crash", start, .17, -.45)
                self.add("bell", bell(root + 12, bar % 3), start, .2, -.2)
            position = 0
            for index, (note, length) in enumerate(SECRET_THEME[bar % 8]):
                self.add("melody", melody(note, round(length * self.beat * .78, 4), "reed", index % 3),
                         start + position, .115, -.23 if index % 2 else .23)
                if bar >= 8 and index % 2 == 0:
                    self.add("bell", bell(note + 12, index), start + position, .055, .35)
                position += length
            # Reversed plucked-string swells create breathing, spectral transitions.
            if bar % 2:
                swell = melody(root + 24, round(self.beat * 1.7, 4), "lute", bar % 3)[::-1].copy()
                self.add("bell", swell, start + 2, .15, -.45)

    def render(self):
        if self.key == "forbidden":
            self.forbidden()
        else:
            for bar in range(self.config["bars"]):
                root, third = CHORDS[bar % 8]
                self.rhythm(bar, root)
                self.rock_drums(bar)
                self.theme(bar, root, third)
        return self.mix()

    def room(self, stereo, seconds, wet, seed):
        """An original sparse/diffuse room impulse convolved on a circle.

        Periodic FFT convolution preserves the previous bar's ambience at 0 s.
        No global fade or silent tail is added to these loop masters.
        """
        rng = np.random.default_rng(seed)
        n_ir = int(seconds * FS)
        t = np.arange(n_ir) / FS
        kernel = np.zeros((self.n, 2), dtype=np.float32)
        for channel in range(2):
            diffuse = filter_audio(rng.normal(0, 1, n_ir), [350, 5400], "bandpass")
            diffuse *= np.exp(-6.3 * t / seconds) * (1 - np.exp(-t / .028))
            diffuse /= max(float(np.linalg.norm(diffuse)), 1e-8)
            kernel[:n_ir, channel] = diffuse * .43
            for delay, level in ((.029, .2), (.043, .15), (.067, .13), (.103, .085)):
                kernel[round((delay + channel * .003) * FS), channel] += level
        reflections = np.fft.irfft(np.fft.rfft(stereo, axis=0) * np.fft.rfft(kernel, axis=0), n=self.n, axis=0)
        return stereo + reflections * wet

    def mix(self):
        wet = self.key == "forbidden"
        guitar_bus = self.room(self.buses["guitar"], .42, .18, 2201)
        drum_bus = self.room(self.buses["drums"], .58, .27 if wet else .2, 2202)
        lead_bus = self.room(self.buses["melody"], 1.8 if wet else .95, .7 if wet else .4, 2203)
        pad_bus = self.room(self.buses["pad"], 2.4 if wet else 1.45, .65, 2204)
        bell_bus = self.room(self.buses["bell"], 2.6, .85, 2205)
        # Circular dotted-eighth lead echo, gently crossed between channels.
        delay = round(self.beat * .75 * FS)
        lead_bus += .13 * np.roll(self.buses["melody"][:, ::-1], delay, axis=0)
        lead_bus += .055 * np.roll(self.buses["melody"], delay * 2, axis=0)
        mix = guitar_bus + self.buses["bass"] + drum_bus + lead_bus + pad_bus + bell_bus
        if self.key != 'forbidden':
            mix += self.room(self.buses['strings'], 1.8, .5, 2301)
            mix += self.room(self.buses['brass'], 1.5, .4, 2302)
            mix += self.room(self.buses['orchestra-drums'], 1.6, .45, 2303)
        # Periodic pre-roll gives the master HP/LP filters their steady state.
        padded = np.concatenate((mix[-FS * 2:], mix), axis=0)
        sos = signal.butter(2, [28, 16000], btype="bandpass", fs=FS, output="sos")
        mix = signal.sosfilt(sos, padded, axis=0)[FS * 2:]
        mix -= np.mean(mix, axis=0)
        mix *= .185 / np.sqrt(np.mean(mix * mix))
        # Gentle memoryless bus saturation keeps transient headroom, preserves
        # the periodic boundary and does not pump the reverb between drum hits.
        mix = .78 * np.tanh(mix / .78)
        mix *= min(1, .82 / np.max(np.abs(mix)))
        # Preserve the low-frequency endpoint trend and remove a codec-sensitive
        # sub-sample DC step with a very short, 1 ms endpoint bridge (not a fade).
        width = 44
        endpoint = (mix[-1] + mix[0]) * .5
        weights = np.linspace(0, 1, width) ** 2
        mix[-width:] += (endpoint - mix[-1]) * weights[:, None]
        mix[:width] += (endpoint - mix[0]) * weights[::-1, None]
        return mix.astype(np.float32)


def command(ffmpeg: str, args: list[str], capture=True):
    result = subprocess.run([ffmpeg, "-hide_banner", "-nostdin", *args],
                            stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
                            stderr=subprocess.PIPE, check=True)
    return result


def loudness(ffmpeg: str, source: Path):
    result = command(ffmpeg, ["-i", str(source), "-af", "loudnorm=I=-18:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"])
    blocks = re.findall(r"\{[^{}]+\}", result.stderr.decode("utf-8", errors="replace"))
    measured = json.loads(blocks[-1])
    return {"lufs": float(measured["input_i"]), "true_peak_db": float(measured["input_tp"]),
            "loudness_range_lu": float(measured["input_lra"])}


def pcm_stats(data, rate=FS):
    data = np.asarray(data, dtype=np.float64)
    peak = float(np.max(np.abs(data)))
    rms = float(np.sqrt(np.mean(data * data)))
    jump = float(np.max(np.abs(data[0] - data[-1])))
    # Compare the seam with the signal's usual adjacent-sample changes.
    derivative_p99 = float(np.percentile(np.abs(np.diff(data, axis=0)), 99))
    tail_rms = float(np.sqrt(np.mean(data[-round(rate * .02):] ** 2)))
    head_rms = float(np.sqrt(np.mean(data[:round(rate * .02)] ** 2)))
    return {"samples": len(data), "seconds": round(len(data) / rate, 6),
            "peak_dbfs": round(20 * math.log10(max(peak, 1e-12)), 3),
            "rms_dbfs": round(20 * math.log10(max(rms, 1e-12)), 3),
            "clipped_samples": int(np.count_nonzero(np.abs(data) >= 1)),
            "seam_jump": round(jump, 7), "adjacent_step_p99": round(derivative_p99, 7),
            "seam_to_p99": round(jump / max(derivative_p99, 1e-12), 3),
            "edge_20ms_rms_db_delta": round(20 * math.log10(max(head_rms, 1e-12) / max(tail_rms, 1e-12)), 3)}


def encode_track(ffmpeg: str, key: str, work_dir: Path, output_dir: Path, validate_only=False, encode_only=False):
    config = TRACKS[key]
    output = output_dir / f"{key}.mp3"
    master = work_dir / f"{key}-master.wav"
    if not validate_only:
        if encode_only:
            source_rate, pcm = wavfile.read(master)
            assert source_rate == FS
        else:
            print(f"Rendering {key}: {config['bars']} bars at {config['bpm']} BPM", flush=True)
            pcm = Arrangement(key).render()
        wavfile.write(master, FS, pcm)
        measured = loudness(ffmpeg, master)
        gain_db = min(-18 - measured["lufs"], -1.8 - measured["true_peak_db"])
        pcm *= 10 ** (gain_db / 20)
        wavfile.write(master, FS, pcm)
        encode_args = ["-y", "-i", str(master), "-c:a", "libmp3lame", "-b:a", "160k", "-ar", str(FS),
                         "-write_xing", "1", "-id3v2_version", "3",
                         "-metadata", f"title={config['title']}", "-metadata", "artist=Ashen Gates Original Score",
                         "-metadata", "album=Ashen Gates", "-metadata", "comment=Original instrumental loop; no samples or vocals",
                         str(output)]
        command(ffmpeg, encode_args)
        # Measure the actual compressed asset too: perceptual encoding can shift
        # integrated loudness slightly. One correction keeps track changes even.
        encoded_measurement = loudness(ffmpeg, output)
        correction = min(-18 - encoded_measurement["lufs"], -1.8 - encoded_measurement["true_peak_db"])
        if abs(correction) > .08:
            pcm *= 10 ** (correction / 20)
            wavfile.write(master, FS, pcm)
            command(ffmpeg, encode_args)
    decoded = work_dir / f"{key}-decoded.wav"
    command(ffmpeg, ["-y", "-i", str(output), "-c:a", "pcm_f32le", str(decoded)])
    rate, pcm = wavfile.read(decoded)
    report = {"title": config["title"], "bpm": config["bpm"], "bars": config["bars"],
              "file": output.name, "bytes": output.stat().st_size,
              "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
              "sample_rate": rate, "channels": pcm.shape[1], "codec": "MP3 / LAME 160 kbps CBR, Xing/LAME gapless metadata",
              "decoded": pcm_stats(pcm, rate), "loudness": loudness(ffmpeg, output)}
    if master.exists():
        master_rate, master_pcm = wavfile.read(master)
        report["master"] = pcm_stats(master_pcm, master_rate)
        report["decoded_sample_count_matches_master"] = len(master_pcm) == len(pcm)
    assert rate == FS and pcm.shape[1] == 2
    assert 40 <= len(pcm) / rate <= 90
    assert report["decoded"]["clipped_samples"] == 0
    assert report["loudness"]["true_peak_db"] <= -1.0
    assert abs(report["loudness"]["lufs"] - (-18)) <= .5
    assert report["decoded"]["seam_to_p99"] < 1.5
    assert report.get("decoded_sample_count_matches_master", True)
    print(json.dumps(report, ensure_ascii=False), flush=True)
    return report


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    parser.add_argument("--output-dir", type=Path, default=ROOT / "public" / "audio")
    parser.add_argument("--work-dir", type=Path, default=Path(tempfile.gettempdir()) / "ashen-gates-music")
    parser.add_argument("--only", choices=TRACKS, nargs="+")
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--encode-only", action="store_true", help="Reuse the WAV masters and normalize/encode again.")
    args = parser.parse_args()
    if not args.ffmpeg:
        parser.error("FFmpeg is required; pass its executable path with --ffmpeg.")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.work_dir.mkdir(parents=True, exist_ok=True)
    reports = [encode_track(args.ffmpeg, key, args.work_dir, args.output_dir, args.validate_only, args.encode_only)
               for key in (args.only or TRACKS)]
    total = sum(report["bytes"] for report in reports)
    assert total < 8_000_000, f"Music asset size exceeds 8 MB: {total}"
    result = {"target_lufs": -18, "total_bytes": total, "tracks": reports}
    (args.work_dir / "music-report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Validated {len(reports)} track(s), {total / 1_000_000:.3f} MB total.", flush=True)


if __name__ == "__main__":
    main()
