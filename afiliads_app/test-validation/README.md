# /test-validation

Pasta de **cases reais** usados para validar os agentes e pipelines do AfiliAds contra mercados de verdade — não fixtures sintéticos.

Cada case traz dados coletados de fonte primária (Google Ads Transparency Center, Meta Ad Library, sites dos concorrentes) + benchmarks públicos, com marcação explícita de **[VERIFICADO]** vs **[ESTIMATIVA]**, para servir de gabarito quando um agente do app rodar sobre o mesmo insumo.

## Cases

| Arquivo | Mercado | Alvo | Coleta | Status |
|---|---|---|---|---|
| `case-fisioterapia-nyc-in-touch.md` | Physical Therapy — Manhattan / NYC Metro (EUA) | In Touch NYC Physical Therapy (itnycpt.com) | 2026-08-15 → 2026-08-18 | baseline coletado |

## Como usar um case como validação

1. **Insumo:** dê ao agente só o que estaria disponível no início (domínio do alvo + mercado). Nada das conclusões.
2. **Gabarito:** compare a saída com as seções do case.
3. **O que medir:**
   - descobriu os mesmos anunciantes ativos? (seção 1.2)
   - a taxonomia de keywords bate? (seção 4.1)
   - o modelo econômico converge no mesmo break-even? (seção 3.3)
   - o compliance guard bloqueou o que deveria? (seção 5)
4. **Registre o resultado** como `case-<nome>-run-<data>.md` na mesma pasta.

## Checklist aberto (case fisioterapia NYC)

- [ ] Pipeline de keywords do AfiliAds × taxonomia da seção 4.1
- [ ] Gerador de RSA × criativos reais da seção 1.1
- [ ] Compliance guard bloqueia Enhanced Conversions e remarketing por condição (seção 5)
- [ ] Calculador de break-even × seção 3.3
- [ ] Fechar lacuna do Meta Ad Library coletando Page IDs

## Espelho no Obsidian

`Vaults/notes/Projetos/afiliados/Case — Mídia Paga Fisioterapia NYC.md`
