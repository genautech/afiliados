#!/usr/bin/env bash
#
# gen_hero.sh — Gera a HERO da campanha a partir da foto original do produto (Nano Banana 2).
#
# Uso:
#   gen_hero.sh <foto_original> <prompt_file> <saida_png>
#
# prompt_file: arquivo de texto com o prompt (linhas iniciadas por # são ignoradas).
# Saída: 1 PNG em <saida_png>. Em caso de erro, deixa um .log ao lado.

set -euo pipefail

INPUT="${1:?uso: gen_hero.sh <foto_original> <prompt_file> <saida_png>}"
PROMPT_FILE="${2:?uso: gen_hero.sh <foto_original> <prompt_file> <saida_png>}"
OUT="${3:?uso: gen_hero.sh <foto_original> <prompt_file> <saida_png>}"

[[ -f "$INPUT" ]]       || { echo "ERRO: foto não encontrada: $INPUT" >&2; exit 1; }
[[ -f "$PROMPT_FILE" ]] || { echo "ERRO: prompt não encontrado: $PROMPT_FILE" >&2; exit 1; }
mkdir -p "$(dirname "$OUT")"

PROMPT="$(grep -vE '^[[:space:]]*(#|$)' "$PROMPT_FILE" | tr '\n' ' ')"
[[ -n "$PROMPT" ]] || { echo "ERRO: prompt vazio em $PROMPT_FILE" >&2; exit 1; }

LOG="${OUT%.png}.log"
echo "[hero] gerando a partir de $INPUT ..." >&2

if ! resp=$(higgsfield generate create nano_banana_flash \
      --prompt "$PROMPT" \
      --image "$INPUT" \
      --aspect_ratio 9:16 \
      --resolution 2k \
      --wait --wait-timeout 8m \
      --json 2>"$LOG"); then
  echo "[hero] FALHOU na geração — veja $LOG" >&2
  exit 1
fi

url=$(echo "$resp" | tr -d '\000-\010\013\014\016-\037' \
  | jq -r '.result_url // (.result_urls // [])[0] // .[0].result_url // empty')
if [[ -z "$url" ]]; then
  echo "[hero] FALHOU — sem URL na resposta. JSON salvo em $LOG" >&2
  echo "$resp" > "$LOG"
  exit 1
fi

if ! curl -sSL --fail -o "$OUT" "$url"; then
  echo "[hero] download falhou de $url" >&2
  exit 1
fi

rm -f "$LOG"
echo "[hero] pronto → $OUT" >&2
