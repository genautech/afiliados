# Checklist e Guia de Rollout do Módulo de Experimentos A/B (Tarefa 16)

Este documento descreve os passos operacionais obrigatórios para migração de banco e rollout em produção no Railway.

---

## 1. Passo A — Backup do Banco de Dados (Railway PostgreSQL)

Antes de executar qualquer comando de alteração de DDL no ambiente de produção:

1. Acesse o painel do **Railway** e selecione o serviço PostgreSQL.
2. Na aba **Backups**, acione a criação de um snapshot/backup manual do banco de dados `afiliads`.
3. Valide o `DATABASE_URL` no arquivo `.env` para garantir a seleção da instância correta (staging ou produção).

---

## 2. Passo B — Aplicação do DDL/Migration SQL

O SQL de criação das tabelas dedicadas foi elaborado em formato **100% aditivo** (não remove nem altera tabelas ou colunas existentes no schema):

Arquivo: `prisma/migrations/20260729040000_google_ads_experiments/migration.sql`

**Comando de Aplicação:**
```bash
npx prisma db push
# ou via migração gerenciada:
npx prisma migrate deploy
```

---

## 3. Passo C — Backfill Idempotente de Campanhas Legadas

O script de backfill localiza campanhas com o flag protótipo `isExperiment: true` e cria os registros correspondentes nos modelos `GoogleAdsExperiment` e `GoogleAdsExperimentArm`.

**1. Executar o teste em modo Dry-Run (apenas leitura):**
```bash
npx tsx scripts/backfill-google-ads-experiments.ts
```

**2. Executar a gravação de dados (com confirmação explícita):**
```bash
npx tsx scripts/backfill-google-ads-experiments.ts --apply
```

A chave de idempotência `legacy-backfill-<campaignId>` garante que rodadas repetidas do script pulem registros já migrados sem duplicá-los.

---

## 4. Passo D — Regeneração de Tipos e Reinicialização

Após a atualização do banco de dados:

```bash
# 1. Regenerar o Prisma Client local/produção
npx prisma generate

# 2. Reiniciar o processo do Next.js dev/server para recarregar o client Prisma na memória
npm run build
```

---

## 5. Passo E — Roteiro de Teste com Conta de Anúncios Real

1. **Criação de Experimento em Modo SETUP:**
   - Na tela do Wizard (Passo 7), crie o experimento A/B.
   - Verifique que o experimento foi criado com o status `SETUP / PAUSED` e que a verificação de custo indica **R$ 0.00 / $ 0.00** no Google Ads.
2. **Confirmação Humana Obrigatoria para Agendamento:**
   - O agendamento (`SCHEDULED`) só deve ser acionado mediante clique e marcação explícita do checkbox do modal de ciência de custos de anúncios.
