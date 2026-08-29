#!/usr/bin/env bash
#
# gen_variations.sh — Gera as 4 variações ANCORADAS na hero aprovada (Nano Banana 2), em paralelo.
#
# A hero entra como imagem de referência (--image), então cada variação herda cena, luz,
# paleta, grade e textura. O prompt deve pedir pra mudar SÓ o ângulo de câmera.
#
# Uso:
#   gen_variations.sh <hero_png> <prompts_file> <out_dir>
#
# prompts_file: 4 linhas não-vazias (# = comentário), na ordem:
#               01-hook, 02-reveal, 03-detail, 04-action.
# Saída: 01-hook.png 02-reveal.png 03-detail.png 04-action.png em <out_dir>.

set -euo pipefail

HERO="${1:?uso: gen_variations.sh <hero_png> <prompts_file> <out_dir>}"
PROMPTS_FILE="${2:?uso: gen_variations.sh <hero_png> <prompts_file> <out_dir>}"
OUT_DIR="${3:?uso: gen_variations.sh <hero_png> <prompts_file> <out_dir>}"

[[ -f "$HERO" ]]        || { echo "ERRO: hero não encontrada: $HERO" >&2; exit 1; }
[[ -f "$PROMPTS_FILE" ]] || { echo "ERRO: prompts não encontrado: $PROMPTS_FILE" >&2; exit 1; }
mkdir -p "$OUT_DIR"

NAMES=(01-hook 02-reveal 03-detail 04-action)

PROMPTS=()
while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*$ ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  PROMPTS+=("$line")
done < "$PROMPTS_FILE"

if [[ "${#PROMPTS[@]}" -ne 4 ]]; then
  echo "ERRO: esperava 4 prompts (hook, reveal, detail, action), recebi ${#PROMPTS[@]}" >&2
  exit 1
fi

gen_one() {
  local name="$1" prompt="$2"
  local out="$OUT_DIR/$name.png" log="$OUT_DIR/$name.log"
  echo "[$name] gerando (ancorado na hero)..." >&2
  local resp
  if ! resp=$(higgsfield generate create nano_banana_flash \
        --prompt "$prompt" \
        --image "$HERO" \
        --aspect_ratio 9:16 \
        --resolution 2k \
        --wait --wait-timeout 8m \
        --json 2>"$log"); then
    echo "[$name] FALHOU na geração — veja $log" >&2
    return 1
  fi
  local url
  url=$(echo "$resp" | tr -d '\000-\010\013\014\016-\037' \
    | jq -r '.result_url // (.result_urls // [])[0] // .[0].result_url // empty')
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
for i in 0 1 2 3; do
  gen_one "${NAMES[$i]}" "${PROMPTS[$i]}" &
  PIDS+=($!)
done

FAILED=0
for pid in "${PIDS[@]}"; do
  wait "$pid" || FAILED=$((FAILED+1))
done

if [[ $FAILED -gt 0 ]]; then
  echo "$FAILED variação(ões) falharam. Confira os .log em $OUT_DIR" >&2
  exit 1
fi

echo "4 variações geradas em $OUT_DIR (+ 05-hero.png já deve estar lá)" >&2
