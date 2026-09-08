"""Original v1.2 orchestral-metal score for the final Ascension Stair.

No recordings or third-party melodies. Reuses the project's oscillator instruments
but composes a new 72-bar form, new theme, countermelodies and harmonic development.
All existing MP3s are read-only and hash-checked. Masters stay in artifacts/music-v12.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

import numpy as np
from scipy.io import wavfile

spec = importlib.util.spec_from_file_location("score_v1", Path(__file__).with_name("generate-score-v1.py"))
score = importlib.util.module_from_spec(spec)
spec.loader.exec_module(score)
inst, FS, ROOT = score.inst, score.FS, score.ROOT
CONFIG = {
    "title": "破雾登神 · 长阶终誓", "bpm": 128, "bars": 72, "intro_bars": 8,
    "seed": 120901, "form": "无词圣咏前奏—长阶主题—逆风疾行—故旅回忆—白金重奏—转调登神—誓言再起",
}
inst.TRACKS["ascension"] = CONFIG

# The new theme rises through a sixth and answers downwards, unlike normal's riff.
# Each phrase is four quarter-note beats; the second half opens into a high octave.
ANTHEM = [
    [(74, 1.5), (77, .5), (81, 1), (86, 1)],
    [(84, 1.5), (81, .5), (79, 1), (77, 1)],
    [(77, 1), (81, .5), (84, .5), (89, 1.5), (88, .5)],
    [(86, 1.5), (84, .5), (81, 1), (79, 1)],
    [(82, 1.5), (81, .5), (77, 1), (74, 1)],
    [(79, 1), (81, .5), (84, .5), (86, 1.5), (84, .5)],
    [(81, 1.5), (79, .5), (77, .5), (76, .5), (74, 1)],
    [(73, 1), (76, .5), (79, .5), (81, 1.5), (None, .5)],
]
CHORDS = [(38, 3), (36, 4), (41, 4), (43, 3), (34, 4), (36, 4), (38, 3), (33, 4)]


class Ascension(score.Score):
    def __init__(self):
        super().__init__("ascension")

    def choir_chord(self, pitches, bar, gain, beats=7.6):
        for i, pitch in enumerate(pitches):
            self.note("pad", inst.choir, pitch, bar * 4, beats, gain,
                      -.68 + i * .34, i % 3)

    def string_run(self, bar, root, third, gain=.08, reverse=False):
        pattern = [0, 7, 12, third + 12, 19, third + 12, 12, 7]
        if reverse:
            pattern.reverse()
        for i, offset in enumerate(pattern):
            self.note("strings", inst.strings, root + 24 + offset,
                      bar * 4 + i * .5, .36, gain, -.5 if i % 2 else .5, True)

    def driving_drums(self, bar, intensity=1., double=False):
        self.war_drums(bar, "anthem", intensity)
        # Galloping bass drums push forward between orchestral downbeats.
        for beat in ((.25, .75, 2.25, 2.75) if double else (.75, 2.75)):
            self.hit("kick", bar * 4 + beat, .3 * intensity)
        if bar % 4 == 3:
            for beat in (3.25, 3.5, 3.75):
                self.hit("snare", bar * 4 + beat, (.18 + .05 * (beat - 3)) * intensity, -.1)

    def render(self):
        print("Composing ascension: " + CONFIG["form"], flush=True)
        # 0:00–0:15, quiet human-scale petition opening into a distant cathedral.
        for bar in range(8):
            root, third = CHORDS[(bar // 2) * 2]
            if bar % 2 == 0:
                self.choir_chord([root + 12, root + 19, root + 24 + third], bar, .08)
                self.harmony([root, root + 12, root + 19], bar, .045, "organ", 7.5)
            self.phrase(ANTHEM[bar], bar, score.flute, "melody", .16, -.16, -12)
            if bar in (0, 4):
                self.add("bell", inst.bell(74 + bar), bar * 4, .13, .44)
            if bar >= 4:
                self.add("orchestra-drums", inst.timpani(38, bar % 3), bar * 4, .12 + (bar - 4) * .065, -.25)
                self.string_run(bar, root, third, .026 + (bar - 4) * .014)
            if bar == 7:
                for i in range(8):
                    self.hit("tom-low" if i < 4 else "snare", bar * 4 + i * .5,
                             .12 + i * .042, -.3 + i * .08)

        for bar in range(8, 72):
            local = bar - 8
            root, third = CHORDS[local % 8]
            remembrance = 32 <= bar < 40
            counterwind = 24 <= bar < 32
            climax = 48 <= bar < 64
            major = 56 <= bar < 64
            cadence = bar >= 64
            if major:
                # Parallel D major reframes the same melody as a hard-won release.
                root, third = [(38, 4), (45, 4), (47, 3), (43, 4),
                               (38, 4), (43, 4), (45, 4), (45, 4)][local % 8]
            if remembrance:
                for i, interval in enumerate([0, 7, 12, third + 12, 19, 12, 7, 12]):
                    self.note("melody", lambda n, d: inst.melody(n, d, "lute"), root + 12 + interval,
                              bar * 4 + i * .5, .7, .12, -.55)
                # A brief audible recollection of the existing campaign theme.
                recalled = inst.THEME[local % 8]
                self.phrase(recalled, bar, score.flute, "melody", .19, .12, -12)
                self.note("bass", inst.bass, root - 12, bar * 4, 3.8, .16, 0, bar % 4)
                self.war_drums(bar, "march", .25 if bar < 36 else .42)
            else:
                pattern = [(0, .68, 0), (1, .22, 0), (1.25, .22, 0),
                           (1.5, .32, 7), (2, .68, 0), (3, .22, 0),
                           (3.25, .22, 0), (3.5, .32, 7)]
                if counterwind:
                    pattern = [(0, .35, 0), (.5, .2, 0), (.75, .2, 0),
                               (1.5, .35, third), (2, .35, 0), (2.75, .2, 0), (3.5, .35, 7)]
                if cadence and bar % 2 == 0:
                    pattern = [(0, 1.75, 0), (2, 1.6, 7)]
                self.guitars(bar, root, pattern, .26 if climax else .215)
                self.driving_drums(bar, 1.03 if climax else .87, counterwind or climax)
                phrase = ANTHEM[local % 8]
                if major:
                    phrase = [(pitch + (1 if pitch % 12 in (5, 0, 10) else 0) if pitch is not None else None,
                               duration) for pitch, duration in phrase]
                if counterwind:
                    # A lower answering line and sharper rhythm make this a distinct bridge.
                    phrase = [[(69, .5), (74, .5), (72, 1), (69, 1.5), (None, .5)],
                              [(70, 1), (69, .5), (65, .5), (67, 1), (69, 1)],
                              [(67, .5), (70, .5), (74, 1), (72, .5), (70, .5), (67, 1)],
                              [(69, 1.5), (73, .5), (76, 1), (73, 1)]][bar % 4]
                self.phrase(phrase, bar, inst.strings, "strings", .25 if climax else .21, -.16)
                if bar >= 16 and not counterwind:
                    self.phrase(phrase, bar, inst.brass, "brass", .18 if climax else .105, .24, -12)
                if not cadence:
                    self.string_run(bar, root, third, .067 if climax else .043, counterwind)
                # Sustained choir supports melody, leaving the guitar attack intelligible.
                if bar % 2 == 0:
                    self.choir_chord([root + 12, root + 19, root + 24 + third], bar,
                                     .095 if climax else .065)
            self.harmony([root + 12, root + 19, root + 24 + third], bar,
                         .045 if remembrance else .075, "strings")
            if climax and bar % 2 == 0:
                self.harmony([root, root + 12, root + 19, root + 24 + third], bar, .045, "organ", 7.5)
            if bar % 4 == 0:
                self.add("orchestra-drums", inst.timpani(root, bar % 3), bar * 4, .32, -.2)
            if bar in (8, 16, 40, 48, 56, 60, 64):
                self.add("bell", inst.bell(root + 36), bar * 4, .105, .48)
            if bar in (31, 39, 47, 55, 63, 71):
                for i, kind in enumerate(("tom-high", "tom-mid", "tom-low", "tom-low")):
                    self.hit(kind, bar * 4 + 2 + i * .5, .24 + i * .035, -.4 + i * .23)

        print("Mixing cathedral hall and stereo orchestra", flush=True)
        # Select the existing long cathedral impulse responses without changing any score.
        self.key = "final"
        return self.mix()


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--work-dir", type=Path, default=ROOT / "artifacts/music-v12")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "public/audio")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    args.work_dir.mkdir(parents=True, exist_ok=True)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    original_paths = [args.output_dir / (key + ".mp3") for key in
                      ("normal", "boss", "final", "forbidden", "menu", "map", "event", "shop")]
    original_hashes = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in original_paths}
    master = args.work_dir / "ascension-master.wav"
    path = args.output_dir / "ascension.mp3"
    if not args.validate_only:
        pcm = Ascension().render()
        wavfile.write(master, FS, pcm)
        measure = inst.loudness(args.ffmpeg, master)
        pcm *= 10 ** (min(-18 - measure["lufs"], -1.8 - measure["true_peak_db"]) / 20)
        encode_args = ["-y", "-i", str(master), "-c:a", "libmp3lame", "-b:a", "192k", "-ar", str(FS),
                       "-write_xing", "1", "-id3v2_version", "3", "-metadata", f"title={CONFIG['title']}",
                       "-metadata", "artist=Ashen Gates Original Score", "-metadata", "album=Ashen Gates 1.2",
                       "-metadata", "comment=Original synthesized instrumental; no third-party recordings", str(path)]
        wavfile.write(master, FS, pcm)
        inst.command(args.ffmpeg, encode_args)
        measure = inst.loudness(args.ffmpeg, path)
        correction = min(-18 - measure["lufs"], -1.8 - measure["true_peak_db"])
        if abs(correction) > .08:
            pcm *= 10 ** (correction / 20)
            wavfile.write(master, FS, pcm)
            inst.command(args.ffmpeg, encode_args)
    decoded = args.work_dir / "ascension-decoded.wav"
    inst.command(args.ffmpeg, ["-y", "-i", str(path), "-c:a", "pcm_f32le", str(decoded)])
    rate, pcm = wavfile.read(decoded)
    loop = round(CONFIG["intro_bars"] * 4 * 60 / CONFIG["bpm"] * FS)
    report = {"version": "1.2.0", **CONFIG, "file": path.name, "bytes": path.stat().st_size,
              "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "sample_rate": rate,
              "channels": pcm.shape[1], "loop_start_sample": loop, "loop_start_seconds": loop / FS,
              "codec": "MP3 / LAME 192 kbps CBR, gapless metadata", "target_lufs": -18,
              "decoded": inst.pcm_stats(pcm), "loop": inst.pcm_stats(pcm[loop:]),
              "loudness": inst.loudness(args.ffmpeg, path), "preserved_tracks": original_hashes,
              "sections": [
                  {"seconds": [0, 15], "name": "无词圣咏前奏"},
                  {"seconds": [15, 45], "name": "长阶主题"},
                  {"seconds": [45, 60], "name": "逆风疾行"},
                  {"seconds": [60, 75], "name": "故旅回忆"},
                  {"seconds": [75, 105], "name": "白金重奏"},
                  {"seconds": [105, 120], "name": "转调登神"},
                  {"seconds": [120, 135], "name": "誓言再起"},
              ]}
    if master.exists():
        master_rate, master_pcm = wavfile.read(master)
        report["master"] = inst.pcm_stats(master_pcm)
        assert master_rate == rate and len(master_pcm) == len(pcm)
    for section in report["sections"]:
        lo, hi = [round(t * FS) for t in section["seconds"]]
        section["rms_dbfs"] = float(20 * np.log10(max(np.sqrt(np.mean(pcm[lo:hi] ** 2)), 1e-12)))
    assert rate == FS and pcm.shape[1] == 2 and len(pcm) == 135 * FS
    assert report["decoded"]["clipped_samples"] == 0
    assert report["loudness"]["true_peak_db"] < -1
    assert abs(report["loudness"]["lufs"] + 18) < .5
    assert report["loop"]["seam_to_p99"] < 1.5
    assert original_hashes == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in original_paths}
    result = json.dumps(report, ensure_ascii=False, indent=2)
    (args.work_dir / "music-report.json").write_text(result, encoding="utf-8")
    print(json.dumps({"seconds": report["decoded"]["seconds"], "lufs": report["loudness"]["lufs"],
                      "loop": report["loop"]["seam_to_p99"], "bytes": report["bytes"],
                      "preserved_tracks": len(original_hashes)}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
