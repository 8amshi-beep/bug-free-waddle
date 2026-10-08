#!/bin/bash
# 为功能词生成单词音频，幂等
set -u
PROJ="$HOME/workspace/english-game-v2"
MIN_BYTES=2000
WORDS=(i you he she it we they me him her us them my your his our their this that these those who which what whose in on at of to for with from by about into over after before between through during under above up down off out around near behind across without very too so just only also even still already yet now then here there again always never sometimes often usually ever away back together alone almost enough well and but or because although while when where why how if however else be am is are was were do does did have has had will would could might must should)
ok=0; fail=()
for w in "${WORDS[@]}"; do
  out="$PROJ/audio/w/$w.mp3"
  sz=0; [ -f "$out" ] && sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$sz" -gt "$MIN_BYTES" ]; then echo "SKIP $w"; ok=$((ok+1)); continue; fi
  printf '%s' "$w" | /opt/hatch/bin/tts speak --output "$out" --text-stdin >/dev/null 2>&1
  sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$sz" -gt "$MIN_BYTES" ]; then echo "OK $w"; ok=$((ok+1)); else echo "FAIL $w (${sz}b)"; fail+=("$w"); fi
done
echo "=== ok: $ok/${#WORDS[@]}, failed: ${fail[*]:-none} ==="
