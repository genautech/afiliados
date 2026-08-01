#!/bin/bash

# Define o caminho para o arquivo .env
ENV_FILE="./.env"

# Verifica se o arquivo .env existe
if [ ! -f "$ENV_FILE" ]; then
  echo "Erro: Arquivo .env não encontrado em $ENV_FILE"
  echo "Crie um .env com DATABASE_URL e outras variáveis."
  exit 1
fi

# Carrega as variáveis de ambiente do .env para o script
# Usamos `grep` e `sed` para extrair DATABASE_URL de forma segura
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | sed -E 's/^DATABASE_URL=(.*)/\1/')

if [ -z "$DATABASE_URL" ]; then
  echo "Erro: DATABASE_URL não encontrada no arquivo .env"
  exit 1
fi

# Extrai o host do DATABASE_URL para exibir de forma mais amigável
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|')
if [ -z "$DB_HOST" ] || [ "$DB_HOST" = "$DATABASE_URL" ]; then
    DB_HOST="UNKNOWN (URL completa: $DATABASE_URL)"
fi

echo "=================================================="
echo "  CONFIRMAÇÃO DE PRISMA DB PUSH"
echo "=================================================="
echo ""
echo "Você está prestes a executar 'npx prisma db push'."
echo "O DATABASE_URL atual no seu .env aponta para:"
echo "  Host: $DB_HOST"
echo ""

# Pergunta ao usuário se ele deseja continuar
read -p "Deseja continuar com o 'prisma db push' para ESTE banco de dados? (sim/não): " CONFIRMATION

if [[ "$CONFIRMATION" == "sim" || "$CONFIRMATION" == "s" ]]; then
  echo "Continuando com 'npx prisma db push'..."
  # Executa o comando real do prisma
  npx prisma db push "$@"
else
  echo "Operação 'prisma db push' cancelada."
  exit 0
fi
