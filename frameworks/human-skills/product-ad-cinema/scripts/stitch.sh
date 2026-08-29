#!/usr/bin/env bash
#
# stitch.sh — Monta os 5 takes em 1 ad de 15s com ffmpeg.
#
# Uso:
#   stitch.sh <takes_dir> <saida_mp4>
#
# Ordem fixa da timeline: 01-hook → 02-reveal → 03-detail → 04-action → 05-hero
# Estratégia: tenta concat lossless (-c copy, zero re-encode). Se os codecs/timebase
# não baterem, faz fallback pra H.264 CRF 16 (visualmente sem perda).

set -euo pipefail

TAKES_DIR="${1:?uso: stitch.sh <takes_dir> <saida_mp4>}"
OUT="${2:?uso: stitch.sh <takes_dir> <saida_mp4>}"

[[ -d "$TAKES_DIR" ]] || { echo "ERRO: pasta de takes não encontrada: $TAKES_DIR" >&2; exit 1; }
mkdir -p "$(dirname "$OUT")"

ORDER=(01-hook 02-reveal 03-detail 04-action 05-hero)

LIST=$(mktemp /tmp/stitch_XXXXXX.txt)
trap 'rm -f "$LIST"' EXIT

for name in "${ORDER[@]}"; do
  clip="$TAKES_DIR/$name.mp4"
  [[ -f "$clip" ]] || { echo "ERRO: take faltando: $clip" >&2; exit 1; }
  printf "file '%s'\n" "$(cd "$(dirname "$clip")" && pwd)/$(basename "$clip")" >> "$LIST"
done

echo "Tentando concat sem perda (-c copy)..." >&2
if ffmpeg -y -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$OUT" 2>/dev/null; then
  echo "Concat sem perda OK → $OUT" >&2
else
  echo "Concat -c copy falhou (codecs/timebase diferentes). Re-encodando em H.264 CRF 16..." >&2
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$LIST" \
    -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart \
    "$OUT"
  echo "Re-encode OK → $OUT" >&2
fi

DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT")
RES=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$OUT")
CODEC=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$OUT")
SIZE=$(du -h "$OUT" | cut -f1)
echo "Ad final: $OUT" >&2
echo "Duração: ${DUR}s | Resolução: $RES | Codec: $CODEC | Tamanho: $SIZE" >&2
