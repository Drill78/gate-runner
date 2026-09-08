"""Ashen Gates 1.0: seven independently arranged scores; preserve forbidden.mp3.

Uses the original oscillator instruments from generate-music.py, no third-party
recordings. Final has a one-shot cathedral prelude and a separately looped body.
"""
from __future__ import annotations

import argparse
from functools import lru_cache
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

spec = importlib.util.spec_from_file_location("instruments", Path(__file__).with_name("generate-music.py"))
inst = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inst)
FS, ROOT = inst.FS, inst.ROOT
SCORES = {
    "normal": {"title": "破晓行军", "bpm": 116, "bars": 32, "seed": 100101, "form": "上扬主题—弦乐回答—拨弦桥段—高音域重奏"},
    "boss": {"title": "暴君的审判", "bpm": 82, "bars": 28, "seed": 100102, "form": "降D低音威压—半音下行—断拍围猎—两小节旧主题残影—重锤再现"},
    "final": {"title": "圣烬加冕", "bpm": 96, "bars": 40, "intro_bars": 4, "seed": 100103, "form": "管风琴与合唱前奏—D大调圣咏—交响金属—普通主题回忆—加冕齐奏"},
    "menu": {"title": "誓言尚未熄灭", "bpm": 72, "bars": 16, "seed": 100104, "form": "号角、弦乐与钟声的安静序章"},
    "map": {"title": "灰林远行", "bpm": 66, "bars": 16, "seed": 100105, "form": "竖琴式分解和弦、木管与稀疏弦乐"},
    "event": {"title": "命运的岔路", "bpm": 70, "bars": 16, "seed": 100106, "form": "错落钟琴、低弦与悬而未决的和声"},
    "shop": {"title": "炉火与铜币", "bpm": 94, "bars": 16, "seed": 100107, "form": "摇摆鲁特琴、拨奏低音与温暖木管"},
}
inst.TRACKS.update(SCORES)
FORBIDDEN_HASH = "cb32248e7bd3edc95737d49fe79273f7a2d6808f8298bc080f9c5394d1312c57"


@lru_cache(maxsize=160)
def organ(note, duration, bright=False):
    t = np.arange(round((duration + .55) * FS)) / FS
    raw = np.zeros_like(t)
    # Independent pipe ranks, including a quiet sixteen-foot foundation.
    for rank, gain in ((.5, .22), (1, 1), (2, .4), (3, .12), (4, .17), (6, .04), (8, .025)):
        for detune in (-.012, .014):
            raw += gain * np.sin(inst.TAU * inst.hz(note + detune) * rank * t)
    env = (1 - np.exp(-t / .1)) * np.exp(-np.maximum(t - duration, 0) / .16)
    return inst.finish_voice(inst.edges(inst.filter_audio(raw * env, 6500 if bright else 3200), .025, .15))


@lru_cache(maxsize=160)
def flute(note, duration, variant=0):
    t = np.arange(round((duration + .18) * FS)) / FS
    phase = inst.TAU * inst.hz(note) * t + .055 * np.sin(inst.TAU * 4.8 * t)
    raw = np.sin(phase) + .2 * np.sin(2 * phase) + .045 * np.sin(3 * phase)
    rng = np.random.default_rng(3200 + note + variant)
    raw += inst.filter_audio(rng.normal(size=len(t)), [1800, 4500], "bandpass") * .045
    env = (1 - np.exp(-t / .05)) * np.exp(-np.maximum(t - duration * .92, 0) / .065)
    return inst.finish_voice(inst.edges(raw * env, .012, .07))


class Score(inst.Arrangement):
    def __init__(self, key):
        super().__init__(key)
        self.loop_sample = round(self.config.get("intro_bars", 0) * 4 * self.beat * FS)
        self.carry = {name: np.zeros((FS * 5, 2), np.float32) for name in self.buses}

    def add(self, bus, voice, beat, gain=1., pan=0., jitter=0.):
        offset = max(0, round((beat * self.beat + jitter) * FS))
        stereo = np.asarray(voice, dtype=np.float32)[:, None] * np.array(
            [np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)], np.float32
        )[None, :] * gain
        end = min(offset + len(stereo), self.n)
        if offset < self.n:
            self.buses[bus][offset:end] += stereo[:end - offset]
        spill = offset + len(stereo) - self.n
        if spill > 0:
            self.carry[bus][:spill] += stereo[-spill:]

    def note(self, bus, instrument, pitch, beat, length, gain, pan=0., *args):
        self.add(bus, instrument(pitch, round(length * self.beat, 4), *args), beat, gain, pan)

    def phrase(self, notes, bar, instrument, bus, gain, pan=0., transpose=0, stretch=1.):
        pos = bar * 4
        for pitch, length in notes:
            if pitch is not None:
                self.note(bus, instrument, pitch + transpose, pos, length * stretch * .92, gain, pan)
            pos += length * stretch

    def harmony(self, notes, bar, gain=.1, voices="strings", beats=3.8):
        instrument = {"strings": inst.strings, "pad": inst.choir, "brass": inst.brass, "organ": organ}[voices]
        for i, note in enumerate(notes):
            pan = (i / max(1, len(notes) - 1) * 2 - 1) * .65
            if voices == "pad":
                self.note("pad", instrument, note, bar * 4, beats, gain, pan, i % 3)
            else:
                self.note("pad" if voices == "organ" else voices, instrument, note, bar * 4, beats, gain, pan)

    def guitars(self, bar, root, pattern, gain=.28):
        for i, (pos, length, interval) in enumerate(pattern):
            for side, pan in enumerate((-.82, .82)):
                self.note("guitar", inst.guitar, root + interval, bar * 4 + pos + side * .014,
                          length, gain * (1 if pos % 1 == 0 else .8), pan, length < .8, (bar + side) % 4)
            self.note("bass", inst.bass, root - 12 + interval, bar * 4 + pos, length,
                      gain * 1.1, 0., i % 4)

    def war_drums(self, bar, style, strength=1.):
        patterns = {
            "march": ([0, 1.5, 2, 2.75], [1, 3], 8),
            "doom": ([0, .75, 2.5], [2], 4),
            "hunt": ([0, .25, 1.75, 2.5, 2.75, 3.5], [2], 8),
            "anthem": ([0, .5, 1.5, 2, 2.5, 3.5], [1, 3], 8),
        }
        kicks, snares, hats = patterns[style]
        for p in kicks:
            self.hit("kick", bar * 4 + p, .65 * strength)
        for p in snares:
            self.hit("snare", bar * 4 + p, .54 * strength, -.1)
        for i in range(hats):
            self.hit("ride" if style == "anthem" else "hat", bar * 4 + i * 4 / hats,
                     (.12 if i % 2 == 0 else .07) * strength, .42)
        if bar % 4 == 0:
            self.hit("crash", bar * 4, .28 * strength, -.5)
        if bar % 8 == 7:
            for i, kind in enumerate(("tom-high", "tom-mid", "tom-low", "tom-low")):
                self.hit(kind, bar * 4 + 3 + i / 4, (.28 + .05 * i) * strength, -.4 + .25 * i)

    def normal(self):
        chords = [(38, 3), (41, 4), (43, 4), (36, 4), (34, 4), (41, 4), (43, 4), (33, 4)]
        # A clear upward arc; the historic opening becomes a small leitmotif.
        melody = [inst.THEME[0], [(77, .5), (79, .5), (81, 1.5), (84, .5), (81, 1)],
                  [(79, .5), (81, .5), (83, 1), (86, 1), (83, 1)],
                  [(84, 1.5), (79, .5), (76, 1), (79, 1)],
                  [(77, 1), (74, .5), (77, .5), (82, 1.5), (81, .5)],
                  [(81, 1.5), (84, .5), (89, 1), (88, 1)],
                  [(86, 1), (83, 1), (81, .5), (79, .5), (83, 1)],
                  [(81, 1.5), (76, .5), (73, 1), (None, .5), (76, .5)]]
        for bar in range(32):
            root, third = chords[bar % 8]
            bridge = 16 <= bar < 24
            pattern = [(0, .55, 0), (.75, .22, 0), (1.5, .35, 7), (2, .55, 0), (2.75, .2, 0), (3.5, .32, 7)]
            if not bridge:
                self.guitars(bar, root, pattern, .25 if bar < 8 else .29)
                self.war_drums(bar, "march")
            else:
                for i, step in enumerate((0, 7, 12, third + 12, 19, 12, 7, 12)):
                    self.note("melody", lambda n, d: inst.melody(n, d, "lute"), root + step,
                              bar * 4 + i * .5, .6, .2, -.5)
                self.note("bass", inst.bass, root - 12, bar * 4, 3.8, .25, 0, bar % 4)
                self.war_drums(bar, "march", .46)
            self.phrase(melody[bar % 8], bar, flute if bridge else inst.strings,
                        "melody" if bridge else "strings", .25 if bridge else .3, -.15,
                        transpose=-12 if bridge else 0)
            if bar >= 24:
                self.phrase(melody[bar % 8], bar, inst.brass, "brass", .12, .25, -12)
            if bar % 2 == 0:
                self.harmony([root + 12, root + 19, root + 24 + third], bar, .065, beats=7.5)
            if bar in (0, 8, 24):
                self.add("bell", inst.bell(86), bar * 4, .075, .5)

    def boss(self):
        roots = [37, 37, 38, 37, 33, 38, 36, 37]
        menace = [[(61, 1.5), (60, .5), (56, 1), (None, 1)],
                  [(55, .75), (56, .25), (49, 2), (None, 1)],
                  [(62, 2), (61, 1), (57, 1)],
                  [(56, .5), (55, .5), (49, 2), (None, 1)]]
        for bar in range(28):
            root = roots[bar % 8]
            bridge = 12 <= bar < 16
            pattern = [(0, .4, 0), (.75, .22, 0), (1, .2, 1), (2.5, .4, 0), (3.5, .3, -1)]
            if 8 <= bar < 12 or 20 <= bar < 24:
                pattern += [(.25, .18, 0), (1.75, .22, 0), (2.75, .22, 0)]
            self.guitars(bar, root, [(0, 1.8, 0), (2.75, .7, 1)] if bridge else pattern, .22 if bridge else .36)
            self.war_drums(bar, "hunt" if 8 <= bar < 12 or bar >= 20 else "doom", .65 if bridge else 1.1)
            self.harmony([root, root + 7, root + 12], bar, .11, beats=3.5)
            for p in (0, 2.5):
                self.add("orchestra-drums", inst.timpani(root, bar % 3), bar * 4 + p, .35, -.25)
            if bar in (14, 15):
                # Only two bars resemble normal: fragmented, low and reharmonized.
                self.phrase(inst.THEME[bar - 14], bar, inst.strings, "strings", .22, .25, -13)
            elif not bridge:
                self.phrase(menace[bar % 4], bar, inst.brass, "brass", .32, -.22)
                if bar >= 16:
                    self.phrase(menace[bar % 4], bar, inst.strings, "strings", .16, .42, 12)
            else:
                self.harmony([49, 56, 62], bar, .085, "pad")
                self.add("bell", inst.bell(61 + bar % 2), bar * 4 + 1.5, .09, .48)
            if bar % 4 == 3:
                for p in (2, 2.5, 3, 3.5):
                    self.note("strings", inst.strings, root + 25, bar * 4 + p, .22, .11, .4, True)

    def final(self):
        major = [(38, 4), (35, 3), (31, 4), (33, 4), (38, 4), (42, 3), (31, 4), (33, 4)]
        hymn = [[(74, 2), (81, 2)], [(78, 3), (76, 1)], [(74, 1.5), (78, .5), (79, 2)],
                [(81, 3), (None, 1)], [(86, 2), (81, 1), (78, 1)], [(78, 1.5), (76, .5), (73, 2)],
                [(74, 1), (78, 1), (79, 2)], [(76, 3), (73, 1)]]
        for bar in range(40):
            root, third = major[(bar - 4) % 8] if bar >= 4 else [(38, 4), (31, 4), (35, 3), (33, 4)][bar]
            if 16 <= bar < 20:
                root, third = inst.CHORDS[bar - 16]
            chord = [root + 12, root + 19, root + 24 + third, root + 36]
            intro = bar < 4
            breakdown = 24 <= bar < 28
            self.harmony(chord, bar, .095 if intro else .075, "organ")
            self.harmony([root + 24, root + 24 + third, root + 31, root + 36], bar,
                         .15 if intro else .115, "pad")
            self.harmony([root + 12, root + 24 + third, root + 31], bar, .055 if intro else .1)
            if intro:
                if bar in (0, 2):
                    self.add("bell", inst.bell(74 + (7 if bar == 2 else 0)), bar * 4, .13, .35)
                if bar >= 2:
                    for i in range(4 if bar == 2 else 8):
                        self.add("orchestra-drums", inst.timpani(38, i % 3), bar * 4 + i * (1 if bar == 2 else .5), .07 + .013 * i, -.3)
                continue
            if not breakdown:
                pattern = [(0, .85, 0), (1, .22, 0), (1.5, .22, 0), (2, .7, 0), (3, .22, 7), (3.5, .25, 0)]
                self.guitars(bar, root, pattern, .19 if bar < 8 else .25)
                self.war_drums(bar, "anthem", .75 if bar < 8 else .9)
                for p in (0, 2):
                    self.add("orchestra-drums", inst.timpani(root, bar % 3), bar * 4 + p, .27, -.25)
            else:
                self.add("orchestra-drums", inst.timpani(root), bar * 4, .18, -.25)
                self.add("bell", inst.bell(root + 36), bar * 4 + 2, .075, .4)
            if 12 <= bar < 20 or 32 <= bar < 36:
                notes = inst.THEME[(bar - 12) % 8]
                if bar < 16 or bar >= 32:
                    notes = [(n + (1 if n % 12 in (5, 10, 0) else 0), length) for n, length in notes]
                self.phrase(notes, bar, inst.strings, "strings", .3, -.3)
                self.phrase(notes, bar, inst.brass, "brass", .14, .25, -12)
            else:
                self.phrase(hymn[(bar - 4) % 8], bar, flute if breakdown else inst.brass,
                            "melody" if breakdown else "brass", .16 if breakdown else .25,
                            -.15, -12 if not breakdown else 0)
                if not breakdown:
                    self.phrase(hymn[(bar - 4) % 8], bar, inst.strings, "strings", .2, .3)
            if 8 <= bar < 24 or bar >= 28:
                for i, interval in enumerate((12, 19, 24 + third, 19, 24, 19, 24 + third, 31)):
                    self.note("strings", inst.strings, root + interval, bar * 4 + i * .5, .24, .08, -.48, True)
            if bar in (4, 12, 28, 36):
                self.add("bell", inst.bell(86), bar * 4, .1, .45)

    def ambient(self):
        key = self.key
        chords = {
            "menu": [(38, 3), (34, 4), (41, 4), (36, 4), (38, 3), (43, 3), (34, 4), (33, 4)],
            "map": [(43, 4), (38, 4), (40, 3), (36, 4), (43, 4), (35, 3), (36, 4), (38, 4)],
            "event": [(38, 3), (39, 4), (38, 3), (33, 3), (34, 4), (39, 4), (36, 3), (33, 4)],
            "shop": [(41, 4), (38, 3), (43, 3), (36, 4), (41, 4), (34, 4), (36, 4), (41, 4)],
        }[key]
        for bar in range(16):
            root, third = chords[bar % 8]
            if key == "menu":
                self.harmony([root + 12, root + 24 + third, root + 31], bar, .12)
                self.harmony([root + 24, root + 31], bar, .065, "pad")
                if bar % 2 == 0:
                    self.phrase([[(62, 3), (69, 3), (65, 2)], [(65, 3), (72, 2), (69, 3)],
                                 [(69, 3), (74, 3), (72, 2)], [(65, 3), (64, 2), (61, 3)]][(bar // 2) % 4],
                                bar, inst.brass, "brass", .13, -.2)
                for p, interval in ((0, 24), (1.5, 31), (3, 24 + third)):
                    self.note("melody", lambda n, d: inst.melody(n, d, "lute"), root + interval, bar * 4 + p, 1, .085, .35)
                if bar % 4 == 0:
                    self.add("bell", inst.bell(root + 36), bar * 4, .075, .45)
            elif key == "map":
                self.harmony([root + 12, root + 24 + third, root + 31], bar, .085)
                for i, interval in enumerate((12, 19, 24 + third, 31, 24, 19)):
                    self.note("melody", lambda n, d: inst.melody(n, d, "lute"), root + interval,
                              bar * 4 + i * .625, .8, .14, -.45 + i * .15)
                if bar % 2 == 0:
                    self.phrase([(root + 36 + third, 2), (root + 31, 1), (root + 36, 2), (None, 3)],
                                bar, flute, "melody", .18, .18)
            elif key == "event":
                self.harmony([root + 12, root + 19], bar, .11)
                self.harmony([root + 24, root + 31], bar, .065, "pad")
                for i, (p, interval) in enumerate(((.5, 36), (1.75, 24 + third), (3.25, 31))):
                    self.add("bell", inst.bell(root + interval, i), bar * 4 + p, .075 if i else .11, -.6 + i * .6)
                if bar % 4 == 2:
                    self.phrase([(root + 31, 1), (root + 32, .5), (None, .5), (root + 24, 2)],
                                bar, flute, "melody", .11, -.2)
            else:
                for p, interval in ((0, 0), (2, 7)):
                    self.note("bass", inst.bass, root - 12 + interval, bar * 4 + p, .6, .21, .05, bar % 4)
                for i, p in enumerate((0, .66, 1, 1.66, 2, 2.66, 3, 3.66)):
                    note = root + [12, 19, 24 + third, 19, 24, 19, 24 + third, 31][i]
                    self.note("melody", lambda n, d: inst.melody(n, d, "lute"), note, bar * 4 + p, .55, .24, -.35)
                if bar % 4 in (0, 1):
                    self.phrase([(root + 31, 1), (root + 36, .66), (root + 36 + third, .34),
                                 (root + 31, 1.5), (None, .5)], bar, flute, "melody", .13, .4)
                for p in (1, 3):
                    self.hit("hat", bar * 4 + p, .045, .45)

    def reverb(self, data, seconds, wet, seed, loop):
        # Intro is causal. The body reverberates periodically, never back into the intro.
        rng = np.random.default_rng(seed)
        ir_n = round(seconds * FS)
        t = np.arange(ir_n) / FS
        kernel = np.zeros((ir_n, 2), np.float32)
        for channel in range(2):
            noise = inst.filter_audio(rng.normal(size=ir_n), [250, 5500], "bandpass")
            noise *= np.exp(-6 * t / seconds) * (1 - np.exp(-t / .04))
            kernel[:, channel] = noise / max(np.linalg.norm(noise), 1e-8) * .55
            for delay, gain in ((.043, .18), (.071, .15), (.113, .11)):
                tap = round((delay + .003 * channel) * FS)
                if tap < ir_n:
                    kernel[tap, channel] += gain
        full = signal.fftconvolve(data, kernel, mode="full", axes=0)
        result = data + full[:len(data)] * wet
        tail = full[len(data):] * wet
        result[loop:loop + len(tail)] += tail
        return result

    def mix(self):
        loop = self.loop_sample
        cathedral = self.key == "final"
        mix = np.zeros((self.n, 2), np.float64)
        for i, (bus, data) in enumerate(self.buses.items()):
            data[loop:loop + len(self.carry[bus])] += self.carry[bus]
            if not np.any(data):
                continue
            seconds = {"guitar": .45, "bass": .18, "drums": .65, "melody": 1.3,
                       "pad": 3.8 if cathedral else 2.2, "bell": 3.8,
                       "strings": 2.8 if cathedral else 1.65, "brass": 2.3 if cathedral else 1.2,
                       "orchestra-drums": 2.2}[bus]
            wet = .65 if bus in ("pad", "bell") else .48 if bus in ("strings", "brass", "melody") else .16
            if self.key == "shop":
                seconds *= .55
            mix += self.reverb(data, seconds, wet, 4500 + i, loop)
        sos = signal.butter(2, [28, 16000], btype="bandpass", fs=FS, output="sos")
        mix = signal.sosfilt(sos, mix, axis=0)
        mix -= np.mean(mix, axis=0)
        mix *= .17 / max(np.sqrt(np.mean(mix * mix)), 1e-8)
        mix = .88 * np.tanh(mix / .88)
        mix *= min(1, .84 / np.max(np.abs(mix)))
        # A short smooth blend at the actual loop point, not the start of the prelude.
        width = 256
        weights = np.linspace(0, 1, width) ** 2
        mix[-width:] += (mix[loop] - mix[-1]) * weights[:, None]
        if loop:
            mix[:round(FS * .08)] *= np.linspace(0, 1, round(FS * .08))[:, None]
        return mix.astype(np.float32)

    def render(self):
        print(f"Composing {self.key}: {self.config['form']}", flush=True)
        if self.key in ("normal", "boss", "final"):
            getattr(self, self.key)()
        else:
            self.ambient()
        return self.mix()


def encode(key, ffmpeg, work, output, validate_only=False):
    config = SCORES.get(key, inst.TRACKS["forbidden"])
    path, master = output / f"{key}.mp3", work / f"{key}-master.wav"
    if not validate_only and key != "forbidden":
        pcm = Score(key).render()
        wavfile.write(master, FS, pcm)
        measure = inst.loudness(ffmpeg, master)
        pcm *= 10 ** (min(-18 - measure["lufs"], -1.8 - measure["true_peak_db"]) / 20)
        wavfile.write(master, FS, pcm)
        args = ["-y", "-i", str(master), "-c:a", "libmp3lame", "-b:a", "160k", "-ar", str(FS),
                "-write_xing", "1", "-id3v2_version", "3", "-metadata", f"title={config['title']}",
                "-metadata", "artist=Ashen Gates Original Score", "-metadata", "album=Ashen Gates 1.0",
                "-metadata", "comment=Original synthesized instrumental; no third-party recordings", str(path)]
        inst.command(ffmpeg, args)
        measure = inst.loudness(ffmpeg, path)
        correction = min(-18 - measure["lufs"], -1.8 - measure["true_peak_db"])
        if abs(correction) > .08:
            pcm *= 10 ** (correction / 20)
            wavfile.write(master, FS, pcm)
            inst.command(ffmpeg, args)
    decoded = work / f"{key}-decoded.wav"
    inst.command(ffmpeg, ["-y", "-i", str(path), "-c:a", "pcm_f32le", str(decoded)])
    rate, pcm = wavfile.read(decoded)
    loop = round(config.get("intro_bars", 0) * 4 * 60 / config["bpm"] * FS)
    report = {**config, "file": path.name, "bytes": path.stat().st_size,
              "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "sample_rate": rate,
              "channels": pcm.shape[1], "loop_start_sample": loop, "loop_start_seconds": loop / FS,
              "codec": "MP3 / LAME 160 kbps CBR, gapless metadata",
              "decoded": inst.pcm_stats(pcm), "loop": inst.pcm_stats(pcm[loop:]),
              "loudness": inst.loudness(ffmpeg, path)}
    if master.exists():
        master_rate, master_pcm = wavfile.read(master)
        report["master"] = inst.pcm_stats(master_pcm)
        assert master_rate == rate and len(master_pcm) == len(pcm)
    assert rate == FS and pcm.shape[1] == 2 and 35 <= len(pcm) / FS <= 180
    assert report["decoded"]["clipped_samples"] == 0 and report["loudness"]["true_peak_db"] < -1
    assert abs(report["loudness"]["lufs"] + 18) < .5
    assert report["loop"]["seam_to_p99"] < 1.5
    if key == "forbidden":
        assert report["sha256"] == FORBIDDEN_HASH
    print(json.dumps({"track": key, "seconds": report["decoded"]["seconds"], "lufs": report["loudness"]["lufs"],
                      "loop": report["loop"]["seam_to_p99"], "bytes": report["bytes"]}), flush=True)
    for value in vars(inst).values():
        if hasattr(value, "cache_clear"):
            value.cache_clear()
    organ.cache_clear()
    flute.cache_clear()
    return report


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--work-dir", type=Path, default=ROOT / "artifacts/music-v1")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "public/audio")
    parser.add_argument("--only", nargs="+", choices=[*SCORES, "forbidden"])
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    args.work_dir.mkdir(parents=True, exist_ok=True)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    # This path only ever reads the established forbidden score.
    forbidden = args.output_dir / "forbidden.mp3"
    assert hashlib.sha256(forbidden.read_bytes()).hexdigest() == FORBIDDEN_HASH
    reports = [encode(k, args.ffmpeg, args.work_dir, args.output_dir, args.validate_only)
               for k in args.only or [*SCORES, "forbidden"]]
    assert hashlib.sha256(forbidden.read_bytes()).hexdigest() == FORBIDDEN_HASH
    result = {"version": "1.0.0", "target_lufs": -18, "total_bytes": sum(r["bytes"] for r in reports), "tracks": reports}
    (args.work_dir / "music-report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Completed {len(reports)} tracks.", flush=True)


if __name__ == "__main__":
    main()
