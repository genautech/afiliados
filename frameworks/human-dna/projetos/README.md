# 📁 projetos/ — uma pasta por marca

Esta pasta é o **container de todos os projetos/marcas** que você constrói usando o sistema. Cada projeto vive em sua própria sub-pasta, isolada das outras.

---

## Estrutura

```
projetos/
├── README.md          ← este arquivo
├── marca-x/           ← projeto real
├── marca-y/           ← projeto real
└── marca-z/           ← projeto real
```

> O **molde-base** dos projetos não vive aqui — vive em `../inteligencias/_template/`. Faz parte do kernel do sistema, não da área de trabalho. O Maestro copia dele quando você cria um projeto novo.

---

## Como funciona

Quando você roda `claude` na pasta-raiz `02. DNA Criativo/` e manda "oi", o Maestro:

1. **Lista projetos existentes** (subpastas dentro de `projetos/`)
2. **Pergunta:** "Quer trabalhar num projeto novo ou em um existente?"
3. **Roteia conforme:**
   - **Novo** → cria `projetos/[nome-novo]/` copiando estrutura de `inteligencias/_template/`, define como working folder, vai pra Caminho A (briefing inicial)
   - **Existente** → carrega DNA daquele projeto, mostra resumo curto que prova que entendeu a marca, oferece próximos passos (gerar peça, auditar, editar DNA, consultar)

---

## Cada projeto tem

- **`materiais/`** — entrada de matéria-prima (logos, fontes, refs visuais, exemplos de tom, concorrentes, anti-refs, outros)
- **`dna-criativo/`** — saída do entregável (`DNA.md` + snapshots + manifesto opcional)
- **`.brand.json`** — variáveis canônicas da marca (criado durante setup)
- Outros arquivos técnicos invisíveis (`.discovery-progress.json`, `notion-ids.json` se sincronizou Notion, etc.)

---

## Como criar projeto novo manualmente (raro)

Geralmente o Maestro cria automaticamente. Mas se quiser fazer manual:

1. Copie o molde do kernel pra novo nome:
   ```bash
   cp -r ../inteligencias/_template marca-nova
   ```
2. Rode `claude` na pasta-raiz e diga "trabalhar no projeto marca-nova"

---

## Não mexa em `inteligencias/_template/`

Esse template é a estrutura-modelo usada pra criar novos projetos. Mexer nele afeta criação futura. Se quiser personalizar molde, edite com cuidado — mas geralmente o template padrão atende todos os projetos.
