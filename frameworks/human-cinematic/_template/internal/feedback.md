# Feedback — {{PROJECT_NAME}}

Registro do feedback do usuário sobre cada resultado gerado. Substitui a antiga planilha — agora é tudo aqui, simples.

**Como funciona:** depois de gerar, o Claude pergunta no chat ("gostou do shot 01? e do 02?"). O usuário olha os arquivos na pasta `output/` e responde. O Claude anota o resultado nesta tabela.

**Antes de cada nova geração**, o Claude lê este arquivo: o que está ✅ vira referência do que repetir; o que está ❌, do que evitar; as notas pesam bastante.

## Legenda

- ✅ Aprovado — gostei, repetir essa direção
- ❌ Rejeitado — não gostei, evitar
- ⏳ Pendente — ainda não avaliado

---

## Resultados

| # | Arquivo (em `output/`) | Tipo | Status | Notas do usuário |
|---|------------------------|------|--------|------------------|
| | | | | |

*(O Claude preenche uma linha por resultado gerado.)*
