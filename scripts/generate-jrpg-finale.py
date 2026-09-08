"""Two original JRPG finale themes and a deity prelude edition.

Render GeneralUser GS 2.0.3 through official FluidSynth, then mix separate stems.
Only the three named MP3s are written to public/audio. MIDI, stems and masters
remain in artifacts/music-jrpg. No existing music or user recording is sampled.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass, field
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parents[1]
FS = 44100
spec = importlib.util.spec_from_file_location("old_music", Path(__file__).with_name("generate-music.py"))
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)

CONFIG = {
    "stair-heaven": {"title": "星穹长阶 · 云上的誓歌", "seconds": 136, "loop_start": 8,
                      "bpm": 90, "meter": "6/8", "key": "E major / C-sharp minor", "theme": "pilgrimage"},
    "crown-fracture": {"title": "碎冕之战 · 向神挥刃", "seconds": 120, "loop_start": 0,
                       "bpm": 144, "meter": "4/4", "key": "E minor / G major", "theme": "defiance"},
    "dawn-judgment": {"title": "黎明的裁决 · 光与誓言", "seconds": 144, "loop_start": 24,
                      "bpm": [90, 144], "meter": "6/8 → 4/4", "key": "E major → E minor", "theme": "defiance with prelude"},
}

# GM program indices are zero-based. Human-readable roles are kept in the MIDI names.
PARTS = {
    "piano": (0, 0, -0.12, "piano"),
    "harp": (1, 46, -0.36, "harp"),
    "celesta": (2, 8, 0.38, "harp"),
    "flute": (3, 73, 0.18, "woodwind"),
    "violin": (4, 40, -0.22, "strings"),
    "ensemble": (5, 48, -0.34, "strings"),
    "choir": (6, 52, 0.10, "choir"),
    "horn": (7, 60, 0.26, "brass"),
    "bass": (8, 33, 0.0, "bass"),
    "drums": (9, 0, 0.0, "drums"),
    "pizz": (10, 45, 0.36, "strings"),
    "oboe": (11, 68, 0.08, "woodwind"),
    "organ": (12, 19, 0.0, "choir"),
    "timpani": (13, 47, -0.20, "percussion"),
    "cello": (14, 42, 0.27, "strings"),
    "glock": (15, 9, 0.40, "harp"),
}

# A new long-breathed 6/8 theme. It opens E–F#–G#–B and resolves through a ninth.
HEAVEN = [
    [(76, 1.5), (78, .5), (80, 1)], [(83, 1), (80, .5), (78, .5), (75, 1)],
    [(76, 1), (73, .5), (76, .5), (80, 1)], [(78, 1.5), (75, .5), (71, 1)],
    [(73, 1), (76, .5), (80, .5), (78, 1)], [(76, 2), (71, 1)],
    [(69, .5), (73, .5), (76, 1), (78, 1)], [(75, 1.5), (73, .5), (71, 1)],
    [(83, 1.5), (85, .5), (88, 1)], [(87, 1), (83, .5), (80, .5), (78, 1)],
    [(80, 1.5), (76, .5), (73, 1)], [(78, 1), (75, .5), (71, .5), (75, 1)],
    [(76, 1), (80, 1), (83, 1)], [(80, 1.5), (78, .5), (76, 1)],
    [(73, .5), (76, .5), (78, 1), (80, 1)], [(78, 1), (75, .5), (73, .5), (71, 1)],
]
# Voiced extensions/inversions, not root-position triads throughout.
SKY = [
    (40, [52, 59, 63, 66, 68]), (39, [54, 59, 63, 66, 68]),
    (37, [52, 56, 59, 63, 68]), (32, [51, 56, 59, 63, 66]),
    (33, [52, 56, 59, 61, 64]), (32, [52, 59, 64, 66, 68]),
    (30, [52, 57, 61, 64, 68]), (35, [54, 57, 59, 63, 66]),
]

# A separate 4/4 battle theme. Accented pickups, falling answers and longer lyric arcs.
DEFIANCE = [
    [(76,.5),(79,.25),(83,.75),(81,.5),(79,.5),(78,.5),(76,1)],
    [(74,.75),(76,.25),(79,1),(78,.5),(74,.5),(71,1)],
    [(76,.5),(79,.5),(84,1.5),(83,.5),(79,.5),(76,.5)],
    [(78,.75),(81,.25),(86,1),(84,.5),(81,.5),(78,1)],
    [(83,1.5),(81,.5),(79,.5),(78,.5),(76,1)],
    [(79,.5),(83,.5),(88,1),(86,.75),(83,.25),(81,1)],
    [(81,.5),(79,.5),(78,.5),(74,.5),(76,1),(78,1)],
    [(75,1),(78,.5),(83,.5),(81,.75),(78,.25),(75,1)],
    [(88,1),(86,.5),(83,.5),(79,1),(83,1)],
    [(86,.75),(84,.25),(83,1),(81,.5),(79,.5),(78,1)],
    [(84,1.5),(83,.5),(79,.5),(76,.5),(79,1)],
    [(81,.5),(84,.5),(86,1),(88,.5),(86,.5),(84,1)],
    [(83,1),(79,.5),(76,.5),(78,.5),(79,.5),(83,1)],
    [(84,.5),(83,.5),(81,1),(79,.5),(76,.5),(74,1)],
    [(78,.5),(79,.5),(81,1),(83,.75),(81,.25),(78,1)],
    [(75,.75),(78,.25),(83,1.5),(81,.5),(78,.5),(75,.5)],
]
FIGHT = [
    (40,[52,55,59,64]), (38,[54,57,62,66]), (36,[52,55,59,64]), (38,[54,57,62,66]),
    (40,[52,55,59,64]), (36,[52,55,60,64]), (33,[52,57,60,64]), (35,[51,57,59,63]),
]
LYRIC = [
    [(79,2),(83,1),(86,1)], [(84,1.5),(83,.5),(79,2)],
    [(81,1),(84,1),(88,1.5),(86,.5)], [(83,3),(81,1)],
    [(79,1.5),(78,.5),(76,1),(79,1)], [(81,1),(79,.5),(76,.5),(74,2)],
    [(76,1),(78,.5),(79,.5),(81,1),(78,1)], [(75,2),(78,1),(83,1)],
]


@dataclass
class Score:
    name: str
    seconds: float
    notes: dict = field(default_factory=lambda: {p: [] for p in PARTS})
    controls: dict = field(default_factory=lambda: {p: [] for p in PARTS})
    sections: list = field(default_factory=list)
    seed: int = 91899100

    def note(self, part, pitch, at, duration, velocity=75, loosen=.006):
        if pitch is None:
            return
        index = len(self.notes[part])
        rng = np.random.default_rng(self.seed + index * 17 + PARTS[part][0] * 101)
        offset = rng.uniform(-loosen, loosen) if at > .02 else 0
        vel = int(np.clip(velocity + rng.integers(-3, 4), 10, 120))
        self.notes[part].append((int(pitch), max(0, at + offset), max(.025, duration), vel))

    def phrase(self, part, phrase, start, beat, velocity, transpose=0, gate=.94):
        pos = 0
        for pitch, length in phrase:
            self.note(part, None if pitch is None else pitch + transpose, start + pos * beat,
                      length * beat * gate, velocity)
            pos += length

    def chord(self, part, notes, at, duration, velocity, roll=.015):
        for i, n in enumerate(notes):
            self.note(part, n, at + i * roll, duration, velocity - i)

    def swell(self, part, at, duration, low=72, high=112):
        for i in range(9):
            shape = np.sin(i / 8 * np.pi) ** .65
            self.controls[part].append((at + duration * i / 8, 11, round(low + (high - low) * shape)))


def heaven_body(score, offset=8):
    beat, bar_seconds = 2/3, 2
    for bar in range(64):
        at = offset + bar * bar_seconds
        root, chord = SKY[bar % 8]
        intimate = 24 <= bar < 32
        grand = 40 <= bar < 56
        ending = bar >= 56
        # Quiet delayed bass and wide inversions leave real space around the tune.
        score.note("cello", root + 12, at, 2.02, 53 if intimate else 63)
        score.chord("ensemble", [chord[0], chord[2], chord[4]], at + .05, 2.08, 39 if intimate else 51 if grand else 44)
        if bar % 2 == 0:
            score.swell("ensemble", at, 3.7, 62, 105 if grand else 88)
        score.chord("choir", [chord[1], chord[3], chord[4] + 12], at + .12, 1.86,
                    39 if intimate else 52 if grand else 43, .024)
        if bar % 2 == 0:
            score.swell("choir", at, 3.9, 62, 106 if grand else 91)
        # Harp compound-meter accompaniment with alternating registral answers.
        arp = [chord[0], chord[1], chord[2], chord[4], chord[3], chord[1]]
        if bar % 4 >= 2:
            arp = [chord[0], chord[2], chord[4], chord[1]+12, chord[3], chord[2]]
        for i, pitch in enumerate(arp):
            score.note("harp", pitch + 12, at + i * beat / 2, .9, 55 if i in (0,3) else 43)
        if not intimate:
            score.note("piano", root + 12, at, 1.7, 54)
            score.chord("piano", chord[1:4], at + 1, .9, 46, .022)
        tune = HEAVEN[bar % 16]
        if bar < 16:
            score.phrase("piano", tune, at, beat, 70, 0, .86)
            if bar >= 8:
                score.phrase("flute", tune, at, beat, 54, -12, .98)
        elif intimate:
            score.phrase("oboe", HEAVEN[(bar + 8) % 16], at, beat, 64, -12)
            score.phrase("piano", tune, at, beat, 51, -12, .85)
        elif bar < 24 or ending:
            score.phrase("flute", tune, at, beat, 68 if not ending else 60, -12)
            score.phrase("celesta", [(n, d) for n,d in tune if d >= 1], at, beat, 42)
        else:
            score.phrase("violin", tune, at, beat, 70 if grand else 63)
            score.phrase("piano", tune, at + .014, beat, 55, -12, .88)
            # A slow oboe countermelody, neither a copied unison nor a faster version.
            answer = [(chord[2]+12,1.5),(chord[1]+12,.5),(chord[3]+12,1)]
            score.phrase("oboe", answer, at, beat, 47)
        if bar % 4 == 0:
            score.note("glock", chord[4]+12, at + .08, 2.8, 41)
        if grand and bar % 2 == 0:
            score.chord("horn", [root+24, chord[2], chord[3]], at + .03, 3.8, 42)
            score.note("timpani", root+12, at, 1.1, 40)
        if 16 <= bar < 24 or 32 <= bar < 56:
            score.note("drums", 36, at, .15, 35 if grand else 27, 0)
            score.note("drums", 54, at + 1, .2, 25, 0)
        if bar in (15,31,39,55):
            for i in range(6):
                score.note("harp", chord[i % 5] + 24, at + 1 + i / 6, 1, 42+i*3)
    score.sections += [
        {"start":offset,"end":offset+32,"name":"云上的誓歌：钢琴主旋律与竖琴"},
        {"start":offset+32,"end":offset+48,"name":"羽光回廊：长笛接句"},
        {"start":offset+48,"end":offset+64,"name":"凡人的祈愿：双簧管与稀疏钢琴"},
        {"start":offset+64,"end":offset+80,"name":"星门渐开：弦乐接入"},
        {"start":offset+80,"end":offset+112,"name":"穹顶之光：弦乐、合唱、圆号展开"},
        {"start":offset+112,"end":offset+128,"name":"回望来路：收束到循环开端"},
    ]


def heaven_intro(score, seconds=8, deity=False):
    bars = round(seconds / 2)
    for bar in range(bars):
        at = bar * 2
        root,chord = SKY[(bar // 2) % 8]
        if deity and bar >= 8:
            root,chord = [(36,[52,55,59,64]), (33,[52,57,60,64]),
                          (35,[51,57,59,63]), (35,[51,57,59,63])][bar-8]
        score.chord("choir", [chord[1],chord[2]+12,chord[-1]+12], at, 2.3, 40 + min(bar,8), .04)
        score.swell("choir", at, 1.9, 60, 88 + min(bar,10))
        score.note("cello", root+12, at, 2.1, 44)
        score.note("piano", chord[0]+12, at + .2, 1.7, 57)
        score.note("piano", chord[3]+12, at + .82, 1.7, 54)
        score.note("harp", chord[-1]+12, at + 1.32, 1.8, 48)
        if bar % 4 == 0:
            score.note("glock", 88 if bar < 8 else 83, at, 3.4, 43)
        if deity and 2 <= bar < 8:
            score.phrase("flute", HEAVEN[(bar-2) % 16], at, 2/3, 54, -12)
            score.chord("ensemble", chord[1:4], at + .1, 1.95, 42)
        if deity and bar >= 8:
            for i in range(6):
                score.note("pizz", chord[i % 4] + 12, at + i / 3, .18, 48 + (bar-8)*6)
            score.note("timpani", root+12, at, .8, 42 + (bar-8)*7)
        if deity and bar == 11:
            for i in range(8):
                score.note("drums", 38 if i < 6 else 45, at + i / 4, .16, 37+i*6, 0)
                score.note("harp", 59 + [0,3,4,8,12,15,16,20][i], at + i / 4, .45, 52+i*2)
    score.sections.append({"start":0,"end":seconds,"name":"空灵前奏：远处圣咏、钢琴与调式转暗" if deity else "前奏：一束未落地的光"})


def drum_bar(score, at, beat, intensity, bar, breakdown=False):
    if breakdown:
        for t in [0,2.5]: score.note("drums",36,at+t*beat,.13,round(58*intensity),0)
        score.note("drums",37,at+2*beat,.1,round(62*intensity),0)
    else:
        kicks = [0,.75,1.5,2,2.75,3.5] if bar % 4 < 2 else [0,.5,1.75,2.5,3.25]
        for t in kicks: score.note("drums",36,at+t*beat,.15,round(91*intensity),.001)
        for t in [1,3]: score.note("drums",38,at+t*beat,.15,round(89*intensity),.003)
        for t in [2.75,3.75]: score.note("drums",38,at+t*beat,.08,round(29*intensity),.003)
    for i in range(8):
        score.note("drums",51 if bar >= 40 else 42,at+i*.5*beat,.1,
                   round((47 if i % 2 == 0 else 32)*intensity),.002)
    if bar % 8 == 0: score.note("drums",49,at,1.4,round(69*intensity),0)
    if bar % 8 == 7:
        for i,n in enumerate([50,50,47,45,43,41]):
            score.note("drums",n,at+(2.5+i*.25)*beat,.16,round((52+i*5)*intensity),.002)


def fight_body(score, offset=0):
    beat = 5/12
    for bar in range(72):
        at = offset + bar * 4 * beat
        root,chord = FIGHT[bar % 8]
        bridge = 24 <= bar < 32
        lyric = 32 <= bar < 40
        climax = 48 <= bar < 64
        ending = bar >= 64
        if lyric:
            root,chord = [(43,[55,59,62,67]),(38,[54,57,62,66]),(36,[52,55,59,64]),(38,[54,57,62,66]),
                          (40,[52,55,59,64]),(36,[52,55,60,64]),(33,[52,57,60,64]),(35,[51,57,59,63])][bar%8]
        # 16ths/8ths alternate in independent inner parts, while the tune gets room to sing.
        pattern = [0,2,1,3,2,1,3,2,0,2,1,3,2,1,3,1]
        if bridge:
            pattern = [0,2,1,3,2,3,1,2]
        for i,step in enumerate(pattern):
            t = i * 4 / len(pattern)
            pitch = chord[step] + (12 if i % 8 < 4 else 0)
            score.note("pizz",pitch,at+t*beat,.13 if len(pattern)==16 else .23,60 if i%4==0 else 45)
        if not bridge:
            for i in range(8):
                pitch = chord[[0,2,1,3,0,2,3,1][i]]
                score.note("ensemble",pitch,at+i*.5*beat,.17,67 if i%2==0 else 52)
            score.chord("ensemble",[chord[0],chord[2],chord[3]],at,1.64,47 if lyric else 42)
        bass_pattern = [(0,.45,0),(.75,.2,0),(1,.4,12),(1.5,.3,7),(2,.45,0),(2.75,.2,0),(3,.35,12),(3.5,.4,7)]
        if bridge: bass_pattern = [(0,1.4,0),(2,1.3,7)]
        for pos,duration,step in bass_pattern:
            score.note("bass",root-12+step,at+pos*beat,duration*beat,87 if climax else 79)
        if bridge:
            score.phrase("piano",LYRIC[bar%8],at,beat,83,-12,.88)
            score.phrase("oboe",LYRIC[bar%8],at,beat,67,-12,.98)
        elif lyric:
            score.phrase("violin",LYRIC[bar%8],at,beat,84)
            score.phrase("horn",LYRIC[bar%8],at,beat,67,-12,.96)
            score.phrase("piano",LYRIC[bar%8],at+.006,beat,71,-12,.86)
        else:
            phrase = DEFIANCE[bar%16]
            score.phrase("violin",phrase,at,beat,86 if climax else 79)
            score.phrase("piano",phrase,at+.008,beat,79 if climax else 70,-12,.83)
            if bar >= 8:
                score.phrase("horn",phrase,at,beat,65 if climax else 54,-12,.87)
        if climax or lyric:
            # Choir sings a slow inner line under the rapid lead instead of doubling it.
            score.chord("choir",[chord[1],chord[2],chord[3]+12],at+.06,1.56,51 if climax else 46)
            score.swell("choir",at,1.55,74,106)
        elif bar % 2 == 0:
            score.chord("choir",[chord[1],chord[3]],at+.07,3.15,39)
        if bar >= 16 and not bridge:
            score.note("cello",root+12,at,1.6,58)
        if not bridge:
            # Piano left-hand syncopation and harp turnaround glints are separate voices.
            for p in [.75,2.75]: score.chord("piano",chord[1:4],at+p*beat,.25,64,.007)
            for i,p in enumerate([1.5,2,2.5,3,3.5]):
                score.note("harp",chord[i%4]+12,at+p*beat,.45,46)
        drum_bar(score,at,beat,.60 if bridge else .84 if lyric else 1 if climax else .91,bar,bridge)
        if bar % 4 == 0:
            score.note("timpani",root,at,1.0,67 if climax else 56)
            score.note("glock",chord[-1]+12,at,.8,47)
        if bar % 8 == 7:
            for i in range(6):
                score.note("piano",[63,66,69,71,75,78][i],at+(2.5+i*.25)*beat,.26,59+i*3)
        if ending and bar % 2 == 0:
            score.chord("organ",[root+12,chord[1],chord[3]],at,3.15,40)
    score.sections += [
        {"start":offset,"end":offset+40,"name":"碎冕主题：切分弦乐、钢琴与鼓组"},
        {"start":offset+40,"end":offset+160/3,"name":"裂隙中的呼吸：钢琴与双簧管"},
        {"start":offset+160/3,"end":offset+200/3,"name":"反抗者的誓言：宽广副歌"},
        {"start":offset+200/3,"end":offset+80,"name":"再起：主旋律变奏"},
        {"start":offset+80,"end":offset+320/3,"name":"向神挥刃：合唱与全乐队展开"},
        {"start":offset+320/3,"end":offset+120,"name":"战意不熄：回到主调循环"},
    ]


def compose(key):
    score = Score(key,CONFIG[key]["seconds"])
    if key == "stair-heaven":
        heaven_intro(score)
        heaven_body(score)
    elif key == "crown-fracture":
        fight_body(score)
    else:
        heaven_intro(score,24,True)
        fight_body(score,24)
    return score


def vlq(value):
    result = [value & 127]
    while value >> 7:
        value >>= 7
        result.insert(0,(value & 127) | 128)
    return bytes(result)


def midi_file(score, parts, path):
    # A fixed 960 ticks/second clock represents both tempo grids exactly.
    events = [(0,0,b'\xff\x51\x03\x0f\x42\x40')]
    for part in parts:
        channel,program,pan,_ = PARTS[part]
        for cc,value in [(7,100),(10,round(64+pan*50)),(11,100),(91,0),(93,0),(1,7 if part in ('violin','flute','oboe') else 0)]:
            events.append((0,0,bytes([0xb0+channel,cc,value])))
        events.append((0,0,bytes([0xc0+channel,program])))
        for pitch,start,duration,velocity in score.notes[part]:
            events.append((round(start*960),2,bytes([0x90+channel,pitch,velocity])))
            events.append((round((start+duration)*960),1,bytes([0x80+channel,pitch,0])))
        for when,cc,value in score.controls[part]:
            events.append((round(when*960),0,bytes([0xb0+channel,cc,value])))
    events.sort(key=lambda e:(e[0],e[1]))
    data = bytearray(); last = 0
    for tick,_,body in events:
        data += vlq(tick-last)+body; last=tick
    end = max(last,round((score.seconds+6)*960))
    data += vlq(end-last)+b'\xff\x2f\x00'
    path.write_bytes(b'MThd'+struct.pack('>IHHH',6,0,1,960)+b'MTrk'+struct.pack('>I',len(data))+data)


def hall(data, seconds, wet, seed):
    rng = np.random.default_rng(seed)
    n = round(seconds*FS); t = np.arange(n)/FS
    ir = np.zeros((n,2),np.float32)
    for channel in range(2):
        noise = old.filter_audio(rng.normal(size=n),[220,6500],'bandpass')
        noise *= np.exp(-7*t/seconds)*(1-np.exp(-t/.032))
        ir[:,channel] = noise/max(np.linalg.norm(noise),1e-8)*.44
        for delay,gain in [(.029,.16),(.053,.12),(.089,.085),(.137,.06)]:
            ir[round((delay+channel*.004)*FS),channel] += gain
    return data + signal.fftconvolve(data,ir,axes=0)[:len(data)]*wet


BUS_MIX = {
    'piano': (1.08,1.6,.34,75), 'harp': (.78,2.8,.61,180),
    'woodwind': (.94,2.3,.45,120), 'strings': (.81,2.1,.42,145),
    'choir': (.69,3.7,.75,190), 'brass': (.78,1.8,.40,140),
    'bass': (.90,.16,.04,32), 'drums': (.82,.5,.15,36), 'percussion': (.72,2.2,.42,45),
}


def render(score,args):
    folder = args.work_dir/score.name
    folder.mkdir(parents=True,exist_ok=True)
    n = round((score.seconds+6)*FS)
    mix = np.zeros((n,2),np.float32)
    stats = {}
    for bus,(gain,seconds,wet,highpass) in BUS_MIX.items():
        parts = [p for p in PARTS if PARTS[p][3]==bus and score.notes[p]]
        if not parts: continue
        midi = folder/(bus+'.mid'); wav = folder/(bus+'-dry.wav')
        midi_file(score,parts,midi)
        if not args.reuse_stems or not wav.exists():
            command = [args.fluidsynth,'-q','-n','-i','-R','0','-C','0','-g','.6',
                       '-r',str(FS),'-o','synth.polyphony=512','-o','synth.sample-rate=44100',
                       '-T','wav','-O','float','-F',str(wav),str(args.soundfont),str(midi)]
            result = subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
            if result.returncode:
                raise RuntimeError(result.stderr.decode(errors='replace')+result.stdout.decode(errors='replace'))
        rate,data = wavfile.read(wav)
        assert rate==FS and data.ndim==2
        stem=np.zeros((n,2),np.float32); stem[:min(n,len(data))]=data[:n]
        stem=signal.sosfilt(signal.butter(2,highpass,btype='highpass',fs=FS,output='sos'),stem,axis=0).astype(np.float32)
        # Gentle warmth keeps upper strings/choir from becoming a thin MIDI sheen.
        if bus in ('strings','choir','brass'):
            stem=signal.sosfilt(signal.butter(2,9000 if bus=='strings' else 7600,fs=FS,output='sos'),stem,axis=0).astype(np.float32)
        if score.name=='stair-heaven':
            seconds*=1.24; wet*=1.12
        stem=hall(stem,seconds,wet,4000+list(BUS_MIX).index(bus)).astype(np.float32)
        mix += stem*gain
        stats[bus]={'parts':parts,'notes':sum(len(score.notes[p]) for p in parts),
                    'gain':gain,'hall_seconds':seconds,'wet':wet,
                    'dry_peak_dbfs':float(20*np.log10(max(np.max(np.abs(data)),1e-12)))}
        print(f'{score.name}: rendered {bus} ({stats[bus]["notes"]} notes)',flush=True)
    length=round(score.seconds*FS); loop=round(CONFIG[score.name]['loop_start']*FS)
    tail=mix[length:]
    mix=mix[:length].copy()
    # End-of-loop note/reverb tails wrap into the musical body, never into the prelude.
    mix[loop:loop+len(tail)]+=tail
    mix=signal.sosfilt(signal.butter(2,[28,16500],btype='bandpass',fs=FS,output='sos'),mix,axis=0)
    mix-=np.mean(mix,axis=0)
    # Conservative RMS trim followed by soft saturation keeps the drum attacks rounded.
    rms=np.sqrt(np.mean(mix*mix)); mix*=.17/max(rms,1e-8)
    mix=.92*np.tanh(mix/.92)
    mix*=min(1,.82/np.max(np.abs(mix)))
    edge=384; shape=np.linspace(0,1,edge)**2
    mix[-edge:]+=(mix[loop]-mix[-1])*shape[:,None]
    if loop: mix[:2205]*=np.linspace(0,1,2205)[:,None]
    return mix.astype(np.float32),stats


def export(key,score,pcm,args,stems):
    master=args.work_dir/(key+'-master.wav')
    output=args.output_dir/(key+'.mp3')
    wavfile.write(master,FS,pcm)
    measure=old.loudness(args.ffmpeg,master)
    gain=min(-18-measure['lufs'],-1.8-measure['true_peak_db'])
    pcm*=10**(gain/20); wavfile.write(master,FS,pcm)
    command=['-y','-i',str(master),'-c:a','libmp3lame','-b:a','224k','-ar',str(FS),
             '-write_xing','1','-id3v2_version','3','-metadata',f'title={CONFIG[key]["title"]}',
             '-metadata','artist=Ashen Gates Original Score','-metadata','album=Ashen Gates - The Last Stair',
             '-metadata','comment=Original composition; GeneralUser GS instruments by S. Christian Collins',str(output)]
    old.command(args.ffmpeg,command)
    measure=old.loudness(args.ffmpeg,output)
    correction=min(-18-measure['lufs'],-1.8-measure['true_peak_db'])
    if abs(correction)>.08:
        pcm*=10**(correction/20);wavfile.write(master,FS,pcm);old.command(args.ffmpeg,command)
    return validate(key,score,args,stems)


def validate(key,score,args,stems=None):
    output=args.output_dir/(key+'.mp3'); decoded=args.work_dir/(key+'-decoded.wav')
    old.command(args.ffmpeg,['-y','-i',str(output),'-c:a','pcm_f32le',str(decoded)])
    rate,pcm=wavfile.read(decoded);loop=round(CONFIG[key]['loop_start']*FS)
    report={**CONFIG[key],'file':output.name,'bytes':output.stat().st_size,
            'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
            'sample_rate':rate,'channels':pcm.shape[1],'codec':'LAME MP3 224kbps CBR, Xing gapless metadata',
            'decoded':old.pcm_stats(pcm),'loop':old.pcm_stats(pcm[loop:]),
            'loudness':old.loudness(args.ffmpeg,output),'stems':stems,'sections':score.sections}
    for section in report['sections']:
        part=pcm[round(section['start']*FS):round(section['end']*FS)]
        section['rms_dbfs']=round(float(20*np.log10(max(np.sqrt(np.mean(part*part)),1e-12))),3)
    assert rate==FS and len(pcm)==round(CONFIG[key]['seconds']*FS)
    assert report['decoded']['clipped_samples']==0
    assert report['loudness']['true_peak_db'] < -1
    assert abs(report['loudness']['lufs']+18)<.5
    assert report['loop']['seam_to_p99']<1.5
    return report


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fluidsynth',required=True)
    parser.add_argument('--soundfont',type=Path,required=True)
    parser.add_argument('--ffmpeg',required=True)
    parser.add_argument('--work-dir',type=Path,default=ROOT/'artifacts/music-jrpg')
    parser.add_argument('--output-dir',type=Path,default=ROOT/'public/audio')
    parser.add_argument('--tracks',nargs='+',choices=list(CONFIG),default=list(CONFIG))
    parser.add_argument('--reuse-stems',action='store_true')
    parser.add_argument('--validate-only',action='store_true')
    args=parser.parse_args();args.work_dir.mkdir(parents=True,exist_ok=True);args.output_dir.mkdir(parents=True,exist_ok=True)
    originals={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in args.output_dir.glob('*.mp3') if p.stem not in CONFIG}
    sf_hash=hashlib.sha256(args.soundfont.read_bytes()).hexdigest()
    assert sf_hash=='9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe','Use the documented GeneralUser GS 2.0.3 bank'
    reports=[]
    for key in args.tracks:
        score=compose(key)
        (args.work_dir/(key+'-score.json')).write_text(json.dumps({'config':CONFIG[key],'notes':score.notes,'controls':score.controls},ensure_ascii=False),encoding='utf-8')
        if args.validate_only: report=validate(key,score,args)
        else:
            pcm,stems=render(score,args)
            report=export(key,score,pcm,args,stems)
        reports.append(report)
        print(json.dumps({k:report[k] for k in ('file','seconds','loop_start','loudness','bytes')},ensure_ascii=False),flush=True)
    assert originals=={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in args.output_dir.glob('*.mp3') if p.stem not in CONFIG}
    report={'version':'1.2 finale revision','soundfont':{'name':'GeneralUser GS 2.0.3','sha256':sf_hash,
            'source':'https://github.com/mrbumpy409/GeneralUser-GS','license':'GeneralUser GS License v2.0'},
            'engine':'FluidSynth 2.6.0 official Windows x64 release','tracks':reports,'preserved_tracks':originals}
    (args.work_dir/'jrpg-music-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':main()
