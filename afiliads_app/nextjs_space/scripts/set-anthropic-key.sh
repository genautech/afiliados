#!/usr/bin/env bash
# Troca a ANTHROPIC_API_KEY sem que ela passe pelo terminal visível nem pelo histórico.
# Lê em modo silencioso, valida contra a API real e só grava se a chave responder.
#
#   ./scripts/set-anthropic-key.sh
#
# Grava em ~/.hermes/.env (fonte canônica), no .env do app e, se existir a variável lá,
# no .env.local — que tem precedência no Next.js e já mascarou chave morta antes.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HERMES_ENV="$HOME/.hermes/.env"
TARGETS=("$HERMES_ENV" "$APP_DIR/.env")
[ -f "$APP_DIR/.env.local" ] && grep -qE '^\s*(export\s+)?ANTHROPIC_API_KEY=' "$APP_DIR/.env.local" \
  && TARGETS+=("$APP_DIR/.env.local")

printf 'Cole a ANTHROPIC_API_KEY (não vai aparecer na tela): '
read -rs KEY
printf '\n'

[ -n "$KEY" ] || { echo "Chave vazia. Nada foi alterado."; exit 1; }
case "$KEY" in
  sk-ant-*) ;;
  *) echo "Aviso: não começa com sk-ant-. Continuando mesmo assim." ;;
esac

echo "Validando contra api.anthropic.com..."
STATUS=$(curl -s -o /tmp/anthropic-probe.$$ -w '%{http_code}' https://api.anthropic.com/v1/messages \
  -H "x-api-key: $KEY" \
  -H 'anthropic-version: 2023-06-01' \
  -H 'content-type: application/json' \
  -d '{"model":"claude-opus-4-8","max_tokens":16,"messages":[{"role":"user","content":"diga apenas: pong"}]}')

if [ "$STATUS" != "200" ]; then
  echo "FALHOU (HTTP $STATUS). Nada foi alterado."
  sed -E 's/sk-ant-[A-Za-z0-9_-]+/sk-ant-***/g' "/tmp/anthropic-probe.$$" | head -c 400; echo
  rm -f "/tmp/anthropic-probe.$$"
  exit 1
fi
rm -f "/tmp/anthropic-probe.$$"
echo "OK — a chave responde."

STAMP=$(date +%Y%m%d%H%M%S)
for f in "${TARGETS[@]}"; do
  [ -f "$f" ] || { echo "$f não existe — pulado"; continue; }
  cp -p "$f" "$f.bak-anthropic-$STAMP"
  if grep -qE '^\s*(export\s+)?ANTHROPIC_API_KEY=' "$f"; then
    python3 - "$f" "$KEY" <<'PY'
import re, sys
path, key = sys.argv[1], sys.argv[2]
with open(path) as fh:
    lines = fh.readlines()
for i, line in enumerate(lines):
    if re.match(r'^\s*(export\s+)?ANTHROPIC_API_KEY\s*=', line):
        prefix = 'export ' if line.lstrip().startswith('export ') else ''
        lines[i] = f'{prefix}ANTHROPIC_API_KEY="{key}"\n'
with open(path, 'w') as fh:
    fh.writelines(lines)
PY
    echo "  $f: substituída (backup em $f.bak-anthropic-$STAMP)"
  else
    [ -n "$(tail -c1 "$f")" ] && printf '\n' >> "$f"
    printf 'ANTHROPIC_API_KEY="%s"\n' "$KEY" >> "$f"
    echo "  $f: adicionada (backup em $f.bak-anthropic-$STAMP)"
  fi
done

unset KEY
echo
echo "Pronto. Confira com:"
echo "  RUN_LIVE_LLM=1 npx vitest run lib/providers.live.test.ts"
echo
echo "Obs: o shell atual ainda tem a ANTHROPIC_API_KEY antiga exportada"
echo "(~/.secrets/.env, carregado no ~/.zshrc). Atualize lá também ou abra um shell novo."
