#!/usr/bin/env python3
"""Generate neural-voice MP3s for the 7 classic public-domain passages (c01-c07).

Mirrors the app's audio layout for passages:
  audio/p/<id>.mp3               full passage
  audio/p/<id>_<pi>_<si>.mp3     paragraph pi, sentence si

Sentence segmentation MUST match app.js splitSens():
    t.match(/[^.!?]+[.!?]+["\u201d']?/g) || [t]

Same request as the original voice pack: default voice = Meta AI Smooth (Smooth),
English, mp3. Per tts-skill rules: never substitute voice/engine on failure.
Idempotent: skips files already generated (> MIN_BYTES). On success copies the
file into both audio/p/ (source) and dist/audio/p/ (deploy dir), like the
original batch. Dry run: --dry-run prints the segment list without calling TTS.

Run only after the user confirms the CLASSICS content in passages-classics-draft.js.
"""
import os, re, sys, subprocess

PROJ = os.path.expanduser("~/workspace/english-game-v2")
DRAFT = os.path.join(PROJ, "passages-classics-draft.js")
WORK = "/tmp/lexi-audio-classics"
MIN_BYTES = 2000
TTS = "/opt/hatch/bin/tts"
DRY = "--dry-run" in sys.argv

def split_sens(t):
    # exact mirror of app.js: (t.match(/[^.!?]+[.!?]+["\u201d']?/g) || [t])
    m = re.findall(r'[^.!?]+[.!?]+["\u201d\']?', t)
    segs = [s.strip() for s in (m or [t])]
    return [s for s in segs if s]

def parse_classics(path):
    src = open(path, encoding="utf-8").read()
    out = []
    for m in re.finditer(r'\{id:"(c\d+)",\s*t:"((?:[^"\\]|\\.)*)"', src):
        pid, title = m.group(1), m.group(2)
        # grab text:[...] following this entry
        tm = re.search(r'text:\[(.*?)\],\s*trans:', src[m.end():], re.S)
        if not tm:
            print(f"WARN {pid}: no text[] found", file=sys.stderr)
            continue
        paras = re.findall(r'"((?:[^"\\]|\\.)*)"', tm.group(1))
        # draft file is UTF-8 with literal punctuation; no escape decoding needed
        # (unicode_escape would mojibake the literal em-dashes)
        out.append((pid, title, paras))
    return out

def ok(p):
    return os.path.isfile(p) and os.path.getsize(p) > MIN_BYTES

def main():
    os.makedirs(WORK, exist_ok=True)
    passages = parse_classics(DRAFT)
    print(f"passages: {len(passages)}")
    jobs = []  # (outfile, text)
    for pid, title, paras in passages:
        full = " ".join(paras)
        jobs.append((f"{pid}.mp3", full))
        for pi, para in enumerate(paras):
            for si, sen in enumerate(split_sens(para)):
                jobs.append((f"{pid}_{pi}_{si}.mp3", sen))
    print(f"segments: {len(jobs)}")
    if DRY:
        for fn, txt in jobs:
            print(f"{fn}\t{len(txt.split())}w\t{txt[:60]}")
        return 0
    fails = []
    for fn, txt in jobs:
        out = os.path.join(WORK, fn)
        if ok(out):
            print(f"SKIP {fn}")
        else:
            print(f"SYNTH {fn} ({len(txt.split())} words) ...", flush=True)
            try:
                r = subprocess.run([TTS, "speak", "--output", out, "--text-stdin",
                                    "--timeout-secs", "300"],
                                   input=txt.encode("utf-8"),
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                   timeout=420)
                sz = os.path.getsize(out) if os.path.isfile(out) else 0
                print(("OK " if sz > MIN_BYTES else "FAIL ") + f"{fn} ({sz}b)")
            except Exception as e:
                print(f"FAIL {fn} ({e})")
        if ok(out):
            for d in ("audio/p", "dist/audio/p"):
                dst = os.path.join(PROJ, d, fn)
                with open(out, "rb") as f, open(dst, "wb") as g:
                    g.write(f.read())
        else:
            fails.append(fn)
    print(f"done: {len(jobs)-len(fails)}/{len(jobs)}, failed: {fails or 'none'}")
    return 1 if fails else 0

sys.exit(main())
