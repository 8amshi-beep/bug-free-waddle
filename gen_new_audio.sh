#!/bin/bash
# 为新词（time/numbers 分类）生成单词音频，幂等：已存在且>2KB则跳过
set -u
PROJ="$HOME/workspace/english-game-v2"
MIN_BYTES=2000
WORDS=(monday tuesday wednesday thursday friday saturday sunday
 january february march april may june july august september october november december
 today tomorrow yesterday afternoon noon second minute hour day week month year century time date
 one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty
 thirty forty fifty hundred thousand million first third once twice half quarter pair dozen
 many much few little several some any all both each every)
ok=0; fail=()
for w in "${WORDS[@]}"; do
  out="$PROJ/audio/w/$w.mp3"
  sz=0; [ -f "$out" ] && sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$sz" -gt "$MIN_BYTES" ]; then echo "SKIP $w"; ok=$((ok+1)); continue; fi
  printf '%s' "$w" | /opt/hatch/bin/tts speak --output "$out" --text-stdin >/dev/null 2>&1
  sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$sz" -gt "$MIN_BYTES" ]; then echo "OK $w (${sz}b)"; ok=$((ok+1)); else echo "FAIL $w (${sz}b)"; fail+=("$w"); fi
done
echo "=== ok: $ok/${#WORDS[@]}, failed: ${fail[*]:-none} ==="
