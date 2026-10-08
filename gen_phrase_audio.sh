#!/bin/bash
# 为 200 个常用词组生成音频，幂等：已存在且>2KB则跳过
set -u
PROJ="$HOME/workspace/english-game-v2"
MIN_BYTES=2000
mapfile -t WORDS < <(python3 -c "
import re
txt = open('$PROJ/data.js', encoding='utf-8').read()
for m in re.finditer(r'\{w:\"([^\"]+)\",zh:\"[^\"]*\",c:\"phrases\"\}', txt):
    print(m.group(1))
")
ok=0; fail=()
for w in "${WORDS[@]}"; do
  fn=$(printf '%s' "$w" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/_/g')
  out="$PROJ/audio/w/$fn.mp3"
  sz=0; [ -f "$out" ] && sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$sz" -gt "$MIN_BYTES" ]; then ok=$((ok+1)); continue; fi
  printf '%s' "$w" | /opt/hatch/bin/tts speak --output "$out" --text-stdin >/dev/null 2>&1
  sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$sz" -gt "$MIN_BYTES" ]; then echo "OK $w"; ok=$((ok+1)); else echo "FAIL $w (${sz}b)"; fail+=("$w"); fi
done
echo "=== ok: $ok/${#WORDS[@]}, failed: ${fail[*]:-none} ==="
