#!/bin/bash
# Retry TTS synthesis for the Lexi voice-pack words whose MP3s are zero-byte
# (backend returned truncated/empty audio on 2026-10-06 and again on 2026-10-07;
# 2026-10-07 added "be" from the function-words batch).
# Idempotent: skips words already generated, deploys once when all are done.
# Per tts-skill rules: same voice (Meta AI Smooth), same text, same engine — never substitute.
set -u
PROJ="$HOME/workspace/english-game-v2"
WORK="/tmp/lexi-audio-fix"
DEPLOYED_MARKER="$PROJ/.audio_fix_13_deployed"
MIN_BYTES=2000
mkdir -p "$WORK"

declare -A WORDS=(
  [generous]="generous" [eggnog]="eggnog" [gin]="gin"
  [jasmine_tea]="jasmine tea" [tuna_salad]="tuna salad"
  [toy]="toy" [tailor]="tailor" [sailor]="sailor" [seat]="seat"
  [gondola]="gondola" [sew]="sew" [wake]="wake" [meditate]="meditate"
  [be]="be"
)

ok_count=0; fail_list=()
for f in "${!WORDS[@]}"; do
  out="$WORK/$f.mp3"
  sz=0; [ -f "$out" ] && sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$sz" -gt "$MIN_BYTES" ]; then
    echo "SKIP $f (already ok, ${sz}b)"
  else
    echo "RETRY $f ..."
    # same request as the original batch: default voice = Meta AI Smooth, en
    printf '%s' "${WORDS[$f]}" | /opt/hatch/bin/tts speak --output "$out" --text-stdin >/dev/null 2>&1
    sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
    if [ "$sz" -gt "$MIN_BYTES" ]; then echo "OK $f (${sz}b)"; else echo "FAIL $f (${sz}b)"; fi
  fi
  sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$sz" -gt "$MIN_BYTES" ]; then
    cp -f "$out" "$PROJ/audio/w/$f.mp3"
    cp -f "$out" "$PROJ/dist/audio/w/$f.mp3"
    ok_count=$((ok_count+1))
  else
    fail_list+=("$f")
  fi
done

echo "done: $ok_count/13, failed: ${fail_list[*]:-none}"

if [ "$ok_count" -eq 13 ] && [ ! -f "$DEPLOYED_MARKER" ]; then
  echo "All 13 words generated — deploying to Cloudflare Pages..."
  if "$HOME/workspace/skills/cloudflare/bin/pages_deploy.py" "$PROJ/dist" lexi-english; then
    date -u +%FT%TZ > "$DEPLOYED_MARKER"
    echo "DEPLOYED"
  else
    echo "DEPLOY FAILED (will retry on next scheduled run)"
    exit 1
  fi
elif [ "$ok_count" -eq 13 ]; then
  echo "Already deployed."
fi

[ "${#fail_list[@]}" -eq 0 ]
