#!/usr/bin/env bash
#
# gen_takes.sh — Anima os 5 frames em 5 takes de 3s via Kling 3.0 (1080p), em paralelo.
#
# Uso:
#   gen_takes.sh <frames_dir> <movimento_file> <out_dir>
#
# Espera em <frames_dir>: 01-hook.png 02-reveal.png 03-detail.png 04-action.png 05-hero.png
# movimento_file: 5 linhas não-vazias (# = comentário), na ordem dos frames acima.
#                 Cada linha = descrição do MOVIMENTO daquele take (a cena já está no frame).
# Saída: 01-hook.mp4 ... 05-hero.mp4 em <out_dir>.

set -euo pipefail

FRAMES_DIR="${1:?uso: gen_takes.sh <frames_dir> <movimento_file> <out_dir>}"
MOV_FILE="${2:?uso: gen_takes.sh <frames_dir> <movimento_file> <out_dir>}"
OUT_DIR="${3:?uso: gen_takes.sh <frames_dir> <movimento_file> <out_dir>}"

[[ -d "$FRAMES_DIR" ]] || { echo "ERRO: pasta de frames não encontrada: $FRAMES_DIR" >&2; exit 1; }
[[ -f "$MOV_FILE" ]]   || { echo "ERRO: arquivo de movimento não encontrado: $MOV_FILE" >&2; exit 1; }
mkdir -p "$OUT_DIR"

NAMES=(01-hook 02-reveal 03-detail 04-action 05-hero)

PROMPTS=()
while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*$ ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  PROMPTS+=("$line")
done < "$MOV_FILE"

if [[ "${#PROMPTS[@]}" -ne 5 ]]; then
  echo "ERRO: esperava 5 linhas de movimento, recebi ${#PROMPTS[@]}" >&2
  exit 1
fi

# Confere que todos os frames existem antes de gastar créditos
for name in "${NAMES[@]}"; do
  [[ -f "$FRAMES_DIR/$name.png" ]] || { echo "ERRO: frame faltando: $FRAMES_DIR/$name.png" >&2; exit 1; }
done

anim_one() {
  local name="$1" prompt="$2"
  local frame="$FRAMES_DIR/$name.png"
  local out="$OUT_DIR/$name.mp4" log="$OUT_DIR/$name.log"

  if [[ -f "$out" ]] && [[ $(stat -f%z "$out" 2>/dev/null || stat -c%s "$out" 2>/dev/null) -gt 50000 ]]; then
    echo "[$name] já existe, pulando" >&2
    return 0
  fi
  echo "[$name] animando ($frame)..." >&2
  local resp
  if ! resp=$(higgsfield generate create kling3_0 \
        --prompt "$prompt" \
        --image "$frame" \
        --aspect_ratio 9:16 \
        --duration 3 \
        --mode pro \
        --sound off \
        --wait --wait-timeout 15m \
        --json 2>"$log"); then
    echo "[$name] FALHOU na geração — veja $log" >&2
    return 1
  fi
  local url
  url=$(echo "$resp" | tr -d '\000-\010\013\014\016-\037' \
    | jq -r '.[0].result_url // .result_url // (.result_urls // [])[0] // empty')
  if [[ -z "$url" ]]; then
    echo "[$name] FALHOU — sem URL. JSON em $log" >&2
    echo "$resp" > "$log"
    return 1
  fi
  if ! curl -sSL --fail -o "$out" "$url"; then
    echo "[$name] download falhou de $url" >&2
    return 1
  fi
  rm -f "$log"
  echo "[$name] pronto → $out" >&2
}

PIDS=()
for i in 0 1 2 3 4; do
  anim_one "${NAMES[$i]}" "${PROMPTS[$i]}" &
  PIDS+=($!)
done

FAILED=0
for pid in "${PIDS[@]}"; do
  wait "$pid" || FAILED=$((FAILED+1))
done

if [[ $FAILED -gt 0 ]]; then
  echo "$FAILED take(s) falharam. Confira os .log em $OUT_DIR" >&2
  exit 1
fi

echo "Todos os 5 takes gerados em $OUT_DIR" >&2
