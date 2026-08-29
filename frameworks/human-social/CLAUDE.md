# Desdobramento de Carrossel

Pega uma pasta com texto + imagens, gera peças nativas pra Instagram Feed, Instagram Stories e LinkedIn Feed via Higgsfield CLI + **GPT Image 2** (`gpt_image_2`). Cada peça é um **desdobramento direto da arte-mãe**: mesma foto/visual, mesma linguagem de fonte, mesmas cores, mesmos elementos gráficos, com adaptação de formato, copy e safe zones.

Uma skill (`/desdobrar`), um script de infra, zero ceremônia. O usuário é fotógrafo/diretor de arte, **não é técnico** — toda configuração é descoberta, perguntada e salva pelo próprio agente no fluxo da skill.

---

## Como o usuário usa

```
/desdobrar /caminho/da/pasta
```

(No Mac, ele arrasta a pasta do Finder pro chat — o path absoluto cola sozinho.)

A pasta precisa ter:
- 1 arquivo `.txt` com a legenda/briefing original (qualquer nome)
- 1+ imagens (`.png`, `.jpg`, `.jpeg`, `.webp`)

Saída fica em `<pasta>/desdobramento/`:
```
desdobramento/
├── instagram-feed.png             1080×1440, 3:4
├── instagram-feed.txt             legenda IG nativa curta (gancho + CTA)
├── instagram-stories/
│   ├── story-01.png               1080×1920, safe zones respeitadas
│   ├── story-02.png
│   ├── story-03.png
│   └── roteiro.txt                roteiro frame-a-frame + stickers
├── linkedin-feed.png              1920×1080, 16:9, mesma arte-mãe em registro LinkedIn
├── linkedin-feed.txt              legenda LinkedIn (substantiva, 1ª pessoa)
├── apresentacao-desdobramento.pdf PDF com base, peças e textos
├── output/                        pasta limpa com os finais para o usuário
└── manifest.json                  mapa técnico do que foi gerado
```

Ao terminar, a pasta mais amigável para o usuário é `<pasta>/desdobramento/output/`. Ela reúne Feed, Stories, LinkedIn e PDF sem logs, prompts ou arquivos técnicos misturados.

Ao finalizar, informe essa pasta final em link clicável e liste todos os arquivos gerados em links clicáveis, usando caminho absoluto. Não liste arquivos `.md` individualmente, a menos que a pessoa peça. Se houver muitos arquivos, ainda assim liste todos os não-`.md`, agrupados por formato ou subpasta. A pasta técnica completa fica em `<pasta>/desdobramento/`.

---

## Primeira execução — onboarding zero-técnico

A primeira vez que o usuário rodar `/desdobrar`, o agente:

1. Verifica se o Higgsfield CLI está instalado e logado (`check-cli`).
2. Se não tiver CLI: explica em linguagem simples que precisa instalar o Higgsfield CLI (`npm install -g @higgsfield/cli`).
3. Se tiver CLI mas faltar login: pede para o usuário concluir `higgsfield auth login`.
4. Depois confirma com `higgsfield account status`.
5. Se estiver ok: segue sem falar de token, API key ou configuração interna.

**Usuário nunca toca em arquivo de configuração.** Não vê `.env`, token ou API key. Pra ele é "o Higgsfield está conectado" e pronto.

---

## Como cada rede é tratada (desdobramento, não redesign)

| Eixo | IG Feed | IG Stories | LinkedIn Feed |
|---|---|---|---|
| **Consumo** | Polegar rolando, 1-2s | 3-7s vertical mobile | Leitura ativa 30-90s |
| **Viralização** | Save + share + comment | View-through rate | Comentário substantivo + reshare |
| **Imagem** | Mesma arte-mãe em 3:4 | 3 variações em 9:16 da mesma campanha/personagem | Mesma arte-mãe em 16:9 |
| **Iluminação** | Preservar a original | Preservar a original | Preservar a original |
| **Paleta** | Preservar a original | Preservar a original | Preservar a original |
| **Headline** | Manter estilo tipográfico da arte-mãe | Mesmo estilo, safe zones | Mesmo estilo, mais legível se necessário |
| **Copy densidade** | 60-120 palavras, gancho-em-2-linhas | Mínima, 1 ideia/frame | 160-320 palavras articuladas |
| **Registro copy** | Oral, rítmico | Telegrama mobile | Editorial substantivo, 1ª pessoa |
| **CTA** | Leve ("salva", "comenta") | Micro ("responde aqui") | Pergunta aberta ou silêncio |
| **Hashtag** | 3-7 no final | Não usa | 2-4 no final |

Imagem-base não deve mudar por plataforma. A primeira decisão do agente é escolher a **arte-mãe**:

- Se houver uma imagem já diagramada com foto + lettering, ela é a arte-mãe.
- Se houver várias imagens, escolha a mais próxima de uma peça final.
- Se não houver peça diagramada, escolha a imagem principal e mantenha a linguagem visual dela.

Todos os formatos nascem dessa mesma arte-mãe, usando `--base`. Outras imagens só entram como referência secundária quando forem claramente parte do mesmo sistema visual. O padrão do script é `--reference-mode base-only` para evitar deriva.

O prompt deve ser curto. O GPT Image 2 entende a imagem: não faça uma análise longa da arte. Diga só o formato destino, o texto que precisa entrar e o que muda: corte, fundo/canvas, hierarquia, safe area ou lettering. Reforce fidelidade aos elementos visíveis da arte-mãe: não remover, não trocar, não inventar objetos.

Stories sempre são 3 frames. Os três usam a mesma arte-mãe como referência de identidade, mas não podem ser uma cópia com texto trocado. A imagem por trás do texto precisa mudar no trio. Cada Story precisa ter texto e background/imagem próprios: varie crop, ângulo, pose, iluminação, fundo estendido, área sólida, respiro ou uma situação próxima com o mesmo personagem/produto/campanha. Um frame pode ficar mais perto do original, mas o trio precisa parecer uma sequência com ritmo visual, sem trocar marca, fonte, paleta ou linguagem.

Se o usuário pedir uma troca pontual numa peça já criada, use a própria peça como `--base` e peça só a troca. Exemplo: manter tudo igual e substituir a headline por outra, sem mudar foto, fundo, fonte, paleta ou layout.

---

## Arquitetura

```
08. Desdobramento/
├── AGENTS.md                          regras de roteamento e compatibilidade
├── CLAUDE.md                          este arquivo (refs internas pra mim)
├── .claude/
│   ├── settings.local.json            permissões pré-aprovadas
│   └── skills/desdobrar/SKILL.md      pipeline completo + prompts inline
├── .Codex/skills/desdobrar/SKILL.md   wrapper de compatibilidade
└── scripts/desdobrar.py               infra Python stdlib chamando Higgsfield CLI
```

Subcomandos do script (uso interno do agente, não exposto ao usuário):
```
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" check-cli                                # status JSON
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" prep <pasta>                             # scaffold + lista inputs
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" generate <pasta> <formato> <prompt> ...  # chama Higgsfield CLI + baixa
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" presentation-pdf <pasta>                 # PDF final da entrega
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" download <url> <out>                     # debug
```

Formatos aceitos pelo `generate`: `ig-feed`, `ig-stories`, `linkedin-feed`.

`generate` sobe a arte-mãe com `higgsfield upload create`, captura o UUID e chama `higgsfield generate create gpt_image_2` com `--image`. Usa `--base <nome>` para definir a arte-mãe. Por padrão, o script envia só essa base (`--reference-mode base-only`) para manter consistência; use `--reference-mode all` apenas quando as outras imagens forem referências deliberadas do mesmo sistema.

`presentation-pdf` monta a entrega final em PDF:
```
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" presentation-pdf <pasta>
```
O PDF mostra texto-base, imagens-base, peças geradas e copies finais em uma apresentação 16:9, com seções explícitas para Base, Instagram Feed, Instagram Stories, roteiro dos Stories, LinkedIn e entrega limpa. Ele deve ter layout claro, fonte com acentos corretos, páginas identificáveis e sem nomes de arquivo na página.

---

## Configuração interna

A geração depende do login local do Higgsfield CLI.

Variável opcional:

```text
HIGGSFIELD_SOCIAL_IMAGE_MODEL=gpt_image_2
HIGGSFIELD_SOCIAL_IMAGE_QUALITY=high
HIGGSFIELD_IMAGE_RESOLUTION=2k
```

Se não existir, o script usa `gpt_image_2`, qualidade `high` e resolução `2k`. Este é o modelo obrigatório para todos os desdobramentos do Human Social, porque as peças finais têm lettering, design e texto renderizados junto da imagem.

---

## Princípios

- **Onboarding zero-técnico.** Toda config necessária é pergunta no chat, não instrução de arquivo.
- **GPT Image 2 sempre.** Todo desdobramento visual do Human Social usa `gpt_image_2`.
- **Desdobramento, não redesign.** A peça nova precisa parecer irmã direta da arte-mãe, não uma campanha nova inspirada nela.
- **Imagem-base sempre junto.** O `generate` manda a arte-mãe como primeira referência. O padrão é usar só essa base para preservar foto, fonte, paleta, elementos e hierarquia.
- **Prompt mínimo.** O modelo já enxerga a peça; o agente só informa formato, texto exato e ajustes permitidos.
- **Stories em trio.** Sempre gerar 3 Stories a partir da mesma arte-mãe, com textos diferentes, imagens/backgrounds diferentes e variação controlada de composição/cena/iluminação.
- **Vision nativa real.** Claude abre cada imagem com Read tool e decodifica paleta/mood na hora. Sem cache, sem decodificação prévia salva.
- **3 copies diferentes do zero.** IG ≠ LinkedIn. Se ficarem parecidas, refaz.
- **Entrega final em PDF.** Toda execução concluída precisa gerar `apresentacao-desdobramento.pdf` com base, peças e textos.
- **Output limpo.** Toda execução concluída sincroniza `desdobramento/output/` com os arquivos finais para o usuário.
- **Stateless.** Cada execução é fresca. Sem state, sem multi-projeto, sem multi-marca.
- **Falha em 1 formato não derruba os outros.** Manifest registra `pronto` ou `parcial`.
