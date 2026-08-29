# 02 — Setup Wizard

> **Não é página do Notion.** Esse é o roteiro que o **agente de setup (Claude Code CLI)** executa na primeira interação pra coletar o DNA da marca em 7 fases de discovery, antes de criar a estrutura no Notion.
>
> O wizard do DNA é mais profundo que o do Carrossel — não são 11 perguntas, são **52 perguntas em 7 fases**. Roda em ~30-45 min. O resultado é um DNA propriamente dito, não um cadastro.

---

## Quando o wizard roda

Primeira execução do agente, no terminal:

```bash
cd ~/{brand-slug-temporario}
claude
```

Primeira mensagem que você manda pode ser qualquer coisa — `oi`, `começar`, `?`. O Maestro (definido em `CLAUDE.md`) reconhece que não há `.dna.json` no working folder e abre conversação.

> **Importante:** o Maestro NÃO despeja "7 fases, 52 perguntas, 30-45 min" na primeira mensagem. Esses números são detalhes operacionais internos, não conteúdo de boas-vindas. A pessoa entra na conversa respondendo perguntas leves uma de cada vez (a primeira é só "como sua marca se chama?"), e a noção de "tamanho do processo" só aparece se ela perguntar.
>
> Se a pessoa precisar pausar a qualquer momento, basta dizer ("preciso parar agora", "vou continuar amanhã"). O agente salva progresso em `~/{brand-slug-temporario}/.discovery-progress.json` e retoma de onde parou na próxima vez que ela voltar.

---

## Os 4 modos de discovery

O wizard oferece 4 modos com profundidade crescente. Você escolhe no início.

| Modo | Tempo | Quando usar |
|---|---|---|
| **Lean** (12 perguntas) | ~10 min | Marca nova sem material existente, ou teste rápido. Output: DNA bruto, suficiente pra começar |
| **Standard** (32 perguntas) | ~25 min | Marca em formação, com alguma intuição clara. Output: DNA sólido pra produção |
| **Pro** (52 perguntas) | ~45 min | Marca operacional que quer formalizar DNA. Output: DNA completo, nível estúdio de branding |
| **Audit-first** (Pro + auditoria) | ~75-120 min | Marca operacional com material existente (site, Instagram, portfólio, blog, decks, posts, concorrentes, imprensa). Agente coleta links recursivamente, analisa material primeiro, devolve "DNA observado", você confronta com "DNA declarado" nas 52 perguntas |

> **Recomendação:** se você tem material público da marca, vai de **Audit-first**. O contraste entre "o que eu acho que somos" (declarado) e "o que parece ser" (observado) é onde o DNA real aparece.
>
> **Regra dura:** quando o usuário escolhe Audit-first, o Maestro não pode aceitar uma auditoria rasa com 1 site e 1 Instagram se a marca tiver mais rastros públicos ou materiais privados que o usuário possa enviar. Ele deve pedir um pacote amplo de referências, organizar tudo por categoria, perguntar de forma humana se existe mais alguma coisa e só avançar quando a pessoa disser que terminou de enviar todas as referências.

---

## Fase 0 — Intake humano de referências (obrigatório no Audit-first)

Antes das 7 fases, o Maestro abre uma coleta profunda de referências. O objetivo é montar um mapa real da presença pública e dos materiais internos da marca/campanha antes de interpretar qualquer coisa.

### Como pedir

O Maestro pede tudo que a pessoa puder mandar em uma mensagem ampla, sem transformar o começo em interrogatório burocrático. A pessoa pode mandar um pacote misturado; o Maestro organiza depois.

Pergunta inicial obrigatória:

```
Antes de construir o DNA, quero estudar a marca como ela existe de verdade.
Me manda tudo que você tiver e puder compartilhar: site, Instagram, LinkedIn, TikTok,
YouTube, portfólio, blog, newsletter, landing pages, PDFs, decks, manual de marca,
fotos, vídeos, VFX, mockups, prints, referências, anti-referências, cases,
concorrentes, entrevistas, matérias, links de fundador/time e qualquer arquivo que
ajude a entender a linguagem.

Pode mandar tudo misturado. Eu organizo daqui.
```

Se a pessoa mandar imagens que contêm texto, tabelas, listas ou exemplos de estrutura, o Maestro deve ler o conteúdo dessas imagens. Elas podem ser briefing, checklist ou escopo do DNA. Não tratar automaticamente como referência estética.

Depois de cada lote recebido, o Maestro salva/organiza e pergunta:

```
Recebi e organizei esse lote. Tem mais alguma coisa que você quer mandar?
Pode ser foto, vídeo, PDF, VFX, selfie, print, link, pasta, referência, anti-referência,
mockup, anúncio antigo, apresentação ou qualquer material solto.

Quando terminar, me diga exatamente: "terminei de enviar todas as referências".
```

O Maestro repete esse loop até o usuário declarar que terminou. Se o usuário disser só "acho que é isso", "não lembro", "por enquanto é isso" ou algo ambíguo, o Maestro confirma com cuidado:

```
Perfeito. Antes de eu fechar o inventário: posso considerar que você terminou de enviar
todas as referências ou ainda quer procurar mais alguma coisa?
```

Só avança quando a resposta for equivalente a "terminei de enviar todas as referências".

### Contrato de extração visível

Ao começar um DNA, antes da análise profunda, o Maestro deve mostrar claramente o que vai extrair das referências e da marca. Isso serve para alinhar expectativa e mostrar o esforço real do trabalho.

Mensagem obrigatória depois de receber o primeiro pacote ou antes de fechar o inventário:

```markdown
Vou extrair a marca em camadas:

- Referências: marcas, diretores/fotógrafos, design/editorial, cinema, cultura, concorrentes, anti-referências e mundos visuais próximos
- Site: textos, páginas internas, narrativa, CTAs, imagens, estrutura, promessa, prova, objeções, conversão e comportamento
- Instagram: até 50 postagens recentes, grid, captions, Reels, highlights, temas, CTAs, visual, fotografia, linguagem e comportamento
- Visual: logo, fotos, tipografia, paleta, composição, luz, sombra, projeção, textura, fotografia, mockups, ícones, ilustrações, grid, margens e respiros
- Voz: tom geral, ritmo, vocabulário, palavras a evitar, humor, posicionamento, exemplos e limites
- Conteúdo: temas, formatos, provas, argumentos, histórias, promessas, repertório e padrões editoriais
- Aplicação: regras para marketing, social, anúncios, landing pages, apresentações e futuras peças

Enquanto eu analiso, vou te devolver os achados por blocos para você ver o caminho do raciocínio.
```

Durante análises longas, o Maestro não fica silencioso. Ele deve trazer atualizações curtas: o que já abriu, o que já extraiu, quantas imagens/textos foram analisados, quais padrões apareceram e o que ainda falta estudar.

Se houver Instagram, a atualização de progresso precisa mencionar a coleta: quantos posts foram pedidos, quantos foram capturados, se captions foram lidas, se mídias foram baixadas, se houve bloqueio e qual fallback será usado. O padrão esperado é tentar 50 posts recentes; menos do que isso exige justificativa.

Categorias que o Maestro deve organizar automaticamente:

1. **Links próprios** — site, páginas internas, redes sociais, portfólio, blog, newsletter, landing pages
2. **Arquivos visuais** — fotos, frames, stills, prints, moodboards, mockups, logos, paletas, fontes
3. **Vídeo e motion** — vídeos, reels, VFX, animações, motion references, vídeos de selfie
4. **Documentos** — PDFs, decks, manuais, propostas, press kit, media kit, docs estratégicos
5. **Textos e voz** — captions, emails, manifestos, artigos, roteiros, posts, mensagens de venda
6. **Concorrentes** — marcas que disputam a mesma atenção/compra
7. **Referências aspiracionais** — marcas, campanhas, artistas, editoriais e sistemas que elevam o padrão
8. **Anti-referências** — tudo que a marca não quer parecer

### Maturidade por tipo de perfil

O Maestro deve começar a leitura entendendo se o projeto é uma empresa, uma marca pessoal, um influencer/creator, artista, especialista, fundador-led, comunidade, produto autoral ou híbrido.

Essa classificação não é burocracia. Ela muda o que precisa ser extraído.

Para perfis pessoais, creators e influencers, pedir e analisar:

- Instagram, TikTok, YouTube, LinkedIn, newsletter, podcast, entrevistas, lives, palestras, collabs e matérias;
- posts com rosto, fala, bastidor, rotina, opinião, humor, polêmica, autoridade, vulnerabilidade e venda;
- fotos de perfil, selfies, vídeos de selfie, poses recorrentes, expressões, figurino, cenário, objetos e lugares;
- frases recorrentes, bordões, gírias, palavrões, pausas, ritmo de fala, modo de responder audiência e limites de exposição;
- relação com seguidores, comunidade, fãs, alunos, clientes, marcas parceiras, críticas e haters;
- momento atual: crescendo audiência, reposicionando, lançando produto, vendendo serviço, profissionalizando a imagem, separando pessoa de empresa ou assumindo uma persona mais pública.

Para empresas, pedir e analisar produto, serviço, categoria, oferta, site, prova, design system, atendimento, cultura, concorrentes e comportamento institucional.

Para híbridos, separar:

- DNA da pessoa;
- DNA da marca/empresa;
- pontos onde os dois se misturam;
- pontos onde precisam ficar separados para evitar ruído, dependência excessiva do fundador ou perda de autenticidade.

O DNA final precisa soar adequado ao modelo. Marca pessoal não deve virar relatório corporativo. Empresa não deve virar diário íntimo. Influencer não deve ser tratado como e-commerce frio. Fundador-led não deve apagar o fundador quando ele é o principal ativo de confiança.

### Quando a marca ainda não tem presença pública

Se não houver site, Instagram, portfólio, blog, loja, campanha publicada ou arquivos suficientes, o Maestro deve explicar que o DNA continua possível, mas a base será construída por entrevista guiada e materiais alternativos.

O agente deve pedir, sem parecer formulário frio:

- marcas que a pessoa admira e por quê;
- marcas que a pessoa rejeita e por quê;
- diretores, fotógrafos, filmes, revistas, capas, editoriais, artistas, músicas, objetos, lugares e culturas que ajudam a explicar o universo;
- fotos soltas do produto, serviço, fundador, espaço, equipe, embalagem, bastidores ou processo;
- vídeos, selfies, VFX, rascunhos, PDFs, apresentações, prints, textos antigos, mensagens de venda e qualquer tentativa anterior;
- cores que parecem certas, cores que parecem erradas, sensação visual desejada, luz, textura, composição, ritmo e nível de sofisticação;
- como a marca fala, quais palavras usa, quais palavras não combinam, se existe humor, agressividade, palavrão, gíria, provocação ou doçura;
- onde esse DNA será aplicado: social, anúncio, landing page, apresentação, embalagem, vídeo, atendimento, evento ou proposta.

O objetivo é preencher as mesmas intenções de análise mesmo sem referência pública. A ausência de site não autoriza um DNA raso. Ela obriga o Maestro a coletar mais contexto humano, registrar lacunas e separar três níveis no documento: observado, declarado pela pessoa e proposto como hipótese.

### Como salvar

Todo material recebido deve ficar armazenado de forma rastreável dentro do projeto:

```text
referencias/
├── links.md
├── 01-links-proprios/
├── 02-arquivos-visuais/
├── 03-video-motion-vfx/
├── 04-documentos-pdfs-decks/
├── 05-textos-voz/
├── 06-concorrentes/
├── 07-referencias-aspiracionais/
└── 08-anti-referencias/

discovery/
├── link-inventory.md
├── asset-inventory.md
├── link-analysis.md
├── asset-analysis.md
├── dna-observado.md
└── gaps-e-hipoteses.md
```

Se o material vier como link, salvar no inventário com URL, categoria, data de coleta e observação. Se vier como arquivo, preservar o arquivo original, registrar nome, tipo, origem, uso provável e qualquer limitação técnica. Não renomear arquivos de forma destrutiva; quando precisar padronizar, copiar para nome limpo e manter referência ao original.

### Critério de encerramento

A coleta só termina quando:

- todos os lotes recebidos foram salvos e categorizados;
- o Maestro mostrou um resumo do inventário;
- o usuário declarou que terminou de enviar todas as referências.

Resumo obrigatório antes da análise:

```
Inventário organizado:
- Links próprios: ...
- Arquivos visuais: ...
- Vídeo/motion/VFX: ...
- Documentos/PDFs/decks: ...
- Textos/captions/emails: ...
- Concorrentes: ...
- Referências aspiracionais: ...
- Anti-referências: ...

Posso fechar o inventário e começar a análise profunda ou ainda tem mais alguma coisa?
```

Assim que fechar a primeira extração, o Maestro deve trazer ao chat um resumo claro:

```markdown
Extração inicial concluída.

- Links/páginas estudadas: ...
- Imagens encontradas/analisadas: ...
- Logos/símbolos encontrados: ...
- Textos e CTAs lidos: ...
- PDFs/decks/arquivos analisados: ...
- Padrões visuais percebidos: ...
- Padrões de voz percebidos: ...
- Lacunas ou limites de acesso: ...

Agora vou transformar isso em interpretação: significado, regra prática, limite e aplicação.
```

### Profundidade de análise

Depois do inventário fechado, o Maestro faz análise autônoma e densa. Deve seguir links internos relevantes até profundidade suficiente para entender:

- proposta de valor declarada
- promessa explícita e promessa implícita
- arquitetura de oferta
- linguagem de venda
- tom editorial
- vocabulário recorrente
- temas frequentes e temas evitados
- prova social e autoridade
- padrão visual, paleta, tipografia e grid
- percentual de uso visual de cada cor (dominante, secundária, acento, neutros)
- regras de aplicação de cor por canal/formato
- tipografias usadas, hierarquia, pesos, escala e espaçamento
- mockups existentes e padrões de aplicação
- logotipo existente, variações, proporção, respiro, uso correto, uso incorreto e contexto de aplicação
- uso de assinaturas, selos, marcas d'água e elementos recorrentes
- margens, respiros, espaços vazios, densidade visual e ritmo de composição
- direção fotográfica/audiovisual
- fotografia: luz, sombra, projeção, pose, gesto, produto/serviço, cenário, superfície, textura, tratamento e linha editorial
- tipografia: famílias encontradas, lettering, pesos, contraste, hierarquia, escala, espaçamento e função editorial
- linguagem de vídeo, selfie, VFX, edição, ritmo, motion e transições
- ritmo de publicação
- tensão entre canais
- lacunas, inconsistências e oportunidades
- diferença entre DNA declarado, DNA observado e DNA performado

### Personalidade sem censura

O Maestro deve preservar a personalidade real da marca. Tabu não é desculpa para apagar força, agressividade, humor ácido, palavrão, provocação, sensualidade, confronto ou linguagem popular quando isso aparece nas referências.

Durante a análise de voz, o Maestro deve registrar:

- nível de agressividade ou suavidade
- presença de palavrões, gírias, ironia, deboche, confronto, sensualidade ou linguagem bruta
- frequência desses traços
- contexto em que aparecem
- intenção comunicativa: chamar atenção, criar pertencimento, atacar clichê, vender com urgência, provocar inimigo, criar intimidade ou gerar choque
- onde isso fortalece a marca
- onde isso pode gerar risco real de plataforma, jurídico, comercial ou reputacional

O Maestro não deve trocar autenticidade por neutralidade. Se existir risco, registra o risco e orienta uso por contexto. Não apaga o traço.

### Raio-x de site (prioridade alta)

Quando o usuário enviar um site, o Maestro deve tratar esse site como fonte primária do DNA. Site não é só URL. Site é arquitetura, narrativa, tom de voz, imagem, ritmo, prova, promessa e comportamento.

O Maestro deve navegar pelo site com profundidade, sempre que o acesso permitir:

- abrir home, sobre, produto/serviço, cases, blog/artigos, contato, pricing, FAQ, manifesto, landing pages e páginas internas relevantes
- ler todos os textos importantes, incluindo títulos, subtítulos, CTAs, legendas, menus, rodapé, microcopy, botões, formulários e mensagens de erro quando visíveis
- entender a ordem da narrativa: o que aparece primeiro, o que a marca explica depois, onde ela prova, onde ela vende, onde ela cria confiança
- abrir e interpretar imagens, ilustrações, fotos, ícones, mockups e vídeos incorporados sempre que possível
- interpretar as imagens como linguagem, não como decoração: tema, luz, enquadramento, cor, textura, gesto, atmosfera, metáfora, tipo de pessoa, cenário e intenção
- identificar como as imagens revelam tom de voz, forma de pensar, comportamento e visão de mundo
- mapear padrões de composição: margens, respiros, blocos, grid, ritmo, densidade, hierarquia e uso de espaço vazio
- observar o comportamento da marca: como convida, explica, promete, prova, vende, responde objeções, reduz risco e conduz o visitante
- registrar páginas visitadas, textos-chave, imagens-chave e hipóteses extraídas em `discovery/link-analysis.md`

Quando o site for rico em imagens, o Maestro não pode parar em um logo e poucos prints. Ele deve criar `discovery/site-visual-inventory.md` com uma varredura visual real:

- capturar ou registrar todas as imagens importantes da home e das páginas-chave
- incluir hero images, fotos de produto, fotos de pessoas, mockups, ícones, ilustrações, banners, cases, aplicações, selos, fundos, padrões e frames de vídeo quando acessíveis
- analisar no mínimo 12 imagens relevantes quando o site tiver volume suficiente
- em sites muito ricos, analisar entre 20 e 60 imagens distribuídas por tipo de página e papel visual
- para cada imagem, registrar origem, página, função, descrição visual, cores dominantes, composição, mensagem implícita e regra que ela ensina para a marca
- se menos de 12 imagens forem analisadas em um site claramente visual, justificar o limite de acesso ou revisar a extração

Se o site tiver muitas páginas, o Maestro prioriza as páginas que carregam mais identidade e decisão: home, sobre, produto, cases, manifesto, páginas de venda e conteúdos editoriais fortes. Se encontrar links internos relevantes durante a navegação, segue até formar uma leitura íntima do sistema. Não precisa rastrear páginas irrelevantes ou repetitivas.

### Escada de interpretação profunda

O Maestro não pode pular de "li os materiais" para "gerei o DNA". Ele deve atravessar cinco camadas:

1. **Leitura forense** — registrar o que existe: assets, canais, formatos, frases, cores, grid, materiais, ofertas, provas, repetições e ausências
2. **Interpretação crítica** — explicar o que esses sinais significam: ambições, contradições, clichês, forças reais, fragilidades e oportunidades
3. **Ideia central** — formular a tensão principal, a ideia-guia, o território da marca e o ponto de vista editorial
4. **Tradução da marca** — transformar a interpretação em regras claras de voz, visual, paleta, tipografia, composição, fotografia, motion, comportamento e aplicações
5. **Documentação final** — escrever o DNA como uma história clara, com profundidade e base sólida, sem depender de produção de peças novas

Cada camada precisa deixar rastro no `discovery/` ou no `resultado/DNA.md`. Se o DNA só descreve o que a marca já tinha, falhou. O Maestro precisa interpretar, traduzir, organizar e documentar.

### Logotipo e absorção visual

Quando existir logotipo, símbolo, monograma ou assinatura visual em site, PDF, rede social, mockup ou arquivo enviado, o Maestro deve tentar extrair e salvar uma versão utilizável em `referencias/02-arquivos-visuais/` ou registrar o caminho/URL original no inventário.

O logo deve entrar no `resultado/DNA.pdf` sempre que a qualidade permitir. Se não houver logo, se estiver ilegível ou se a extração for ruim, o fluxo continua sem perda de qualidade. O Maestro registra o limite e usa nome, tipografia, cores e sinais visuais disponíveis.

O PDF único deve absorver a marca com intensidade. Sempre que possível, sua diagramação deve seguir a base extraída:

- estilo tipográfico
- cores principais e neutras
- ritmo de margens e respiros
- proporção entre texto e imagem
- uso de espaços vazios
- densidade visual
- presença ou ausência de linhas, molduras, grids e blocos
- estilo de capa, aberturas de seção e detalhes gráficos

O documento não deve apenas falar sobre a marca. Ele deve parecer ter nascido da marca. Não pode parecer um markdown exportado para PDF. Paleta precisa aparecer como blocos reais de cor, imagens precisam entrar em composição editorial com legenda e respiro, e seções precisam ter hierarquia visual clara.

### Matriz de interpretação obrigatória

Para cada referência/material relevante, o Maestro deve responder:

- O que é?
- O que mostra?
- O que revela sem dizer?
- Que padrão se repete em outros materiais?
- Que leitura sobre a marca isso sugere?
- Que regra prática entra no DNA?
- O que seria cópia ruim dessa referência?
- Como isso muda a forma de explicar voz, visual, comportamento ou posicionamento?

Quando o material enviado pedir estrutura de conteúdo, o Maestro deve transformar isso em matrizes claras. O DNA deve conter, quando aplicável:

- **Mapa de referências:** marcas, diretores/fotógrafos, design/editorial, cinema e cultura
- **Mapa de voz:** tom geral, ritmo, vocabulário, palavras/frases a evitar, humor e posicionamento
- **Mapa visual:** paleta, estética, composição, luz, textura e referências
- **Mapa fotográfico:** direção, iluminação, sombra, projeção, pose, produto/serviço, cenário, tratamento e linha editorial
- **Mapa tipográfico:** famílias, lettering, pesos, escala, hierarquia, contraste, espaçamento, função e personalidade

Cada linha precisa ter leitura extraída, significado, regra prática e limite. Não basta repetir perguntas guia.

O Maestro pode seguir links internos e externos relevantes encontrados nas páginas, mas não deve burlar login, paywall, robots, privacidade, contas fechadas ou qualquer material não autorizado. Se algo importante estiver atrás de acesso, pede export, print, PDF ou resumo.

Output obrigatório:

- `discovery/link-inventory.md` — lista categorizada de links e status
- `discovery/asset-inventory.md` — lista de arquivos recebidos, tipo, origem e função
- `discovery/link-analysis.md` — análise por link/canal
- `discovery/asset-analysis.md` — análise de fotos, vídeos, PDFs, mockups, VFX e materiais anexados
- `discovery/dna-observado.md` — síntese estratégica, verbal, visual e comportamental inferida
- `discovery/ideia-central.md` — ideia-guia, tensão principal, território da marca e ponto de vista
- `discovery/matriz-de-interpretacao.md` — tabela referência → significado → regra → implicação
- `discovery/gaps-e-hipoteses.md` — contradições, hipóteses e perguntas que precisam validação humana

---

## As 7 fases do wizard Pro (52 perguntas)

> O agente faz UMA pergunta de cada vez, espera resposta, e segue. Nunca despeja a fase inteira. Após cada fase, mostra um mini-resumo e pergunta "seguir / refazer / pular".

### FASE 1 — Identidade básica (8 perguntas)

A camada mais superficial — variáveis canônicas. É o que o Carrossel também pergunta, expandido.

1. **Nome da marca** → `brand_name`
2. **Razão social / nome jurídico** → `brand_legal_name` (opcional, default: igual ao nome)
3. **Handle Instagram principal** → `brand_handle` → deriva `brand_slug`
4. **URL principal** → `brand_url`
5. **Email principal de comunicação** → `brand_email_main`
6. **Logo da marca?** → `brand_has_logo` (true/false) + instrução de anexar PNG depois
7. **Em uma frase: o que sua marca faz?** → seed pra `brand_subject`
8. **Em uma frase: pra quem?** → seed pra `brand_audience_term` + persona

### FASE 2 — Estratégia (10 perguntas)

A camada do "porquê". O que sai daqui vira `🎯 Brand Strategy` + as variáveis-âncora.

9. **Por que essa marca existe? Se ela fechasse hoje, o que para de existir no mundo?** → propósito
10. **O que vocês fazem hoje, operacionalmente, pra cumprir esse propósito?** → missão
11. **Daqui a 5-10 anos, qual é o "estado-final" que vocês perseguem?** → visão
12. **Quem são os 3 concorrentes mais próximos?** → mapa competitivo
13. **O que vocês fazem que NENHUM desses concorrentes faz?** → diferenciador
14. **O que vocês NÃO fazem, deliberadamente, mesmo podendo?** → escopo negativo
15. **Em uma frase contraintuitiva: qual é o "ah-ha" que move o pitch da marca?** → key insight
16. **Se a audiência usa o produto e tem sucesso, qual é o resultado emocional? E o funcional?** → promessa central
17. **Em qual categoria de mercado vocês competem? E qual gostariam de redefinir?** → posicionamento
18. **Qual é o veículo jornalístico de referência editorial?** → `brand_voice_anchor_editorial`

### FASE 3 — Audiência (8 perguntas)

A camada do "pra quem". Sai daqui pra `👥 Audience DNA`.

19. **Descreva a persona primária ideal — nome fictício, idade, profissão, contexto familiar/social, localização**
20. **Que decisão essa persona toma toda semana que tem a ver com o que vocês oferecem?**
21. **Qual é a aspiração funcional dela?** (o que ela quer conseguir fazer)
22. **Qual é a aspiração identitária?** (quem ela quer ser percebida como)
23. **Qual é o medo profissional dela?** (o que ela teme errar)
24. **Qual é o medo identitário?** (que tipo de pessoa ela teme parecer)
25. **Onde ela passa tempo hoje? Que apps/sites/comunidades?**
26. **Anti-persona: descreva alguém com quem vocês NÃO querem falar — mesmo que pague**

### FASE 4 — Voz e tom (8 perguntas)

A camada do "como falamos". Sai daqui pra `🗣️ Voice & Tone`.

27. **Em uma frase: como a marca fala?** (tipo "como editor da Folha que abriu agência") → princípio editorial central
28. **4 adjetivos do que a marca É**
29. **4 adjetivos do que a marca NÃO É**
30. **5 palavras que vocês usam (jargão próprio, palavras-marca, gírias, força verbal ou palavrões se fizerem parte da marca)**
31. **5 palavras que vocês evitam (jargão saturado, palavras de outros, termos que enfraquecem a personalidade real da marca)**
32. **Como vocês chamam a audiência? (dê 1 termo aprovado e 2 termos proibidos)**
33. **Marca de referência tonal (não-jornalística) — quem soa parecido com vocês mas em outro contexto?** → `brand_voice_anchor_brand`
34. **Cole 2-3 textos seus (post, email, caption) que representam o tom certo. E 1 texto que NÃO representa o tom — que precisa ser reescrito**

### FASE 5 — Visual (10 perguntas)

A camada do "como parece". Sai daqui pra `🎨 Visual System` + `📸 Photography Direction` + `🖼️ Image Generation Engine`.

35. **Cor primária da marca (hex)** → `brand_color_primary`
36. **Cor secundária (hex, ou enter pra derivar)** → `brand_color_secondary`
37. **Cor de fundo dark (hex, ou enter pra default warm-dark `#1B1411`)** → `brand_color_dark`
38. **Cor de fundo light (hex, ou enter pra default warm-cream `#F1ECE3`)** → `brand_color_light`
39. **Família tipográfica display (headlines)** — nome ou "preciso sugestão" → `brand_font_display`
40. **Família tipográfica body (parágrafos)** — nome ou "preciso sugestão" → `brand_font_body`
41. **Família tipográfica mono (tags, metadados)** — nome ou "preciso sugestão" → `brand_font_mono`
42. **Estética-âncora: cite 2-3 publicações/estúdios cuja estética você quer próxima da sua** → `brand_aesthetic_anchor`
43. **Direção fotográfica preferida: dos 7 setups de iluminação (Golden Hour, Low Key, Spotlight, Chiaroscuro, Cutter Lights, Hard Flash, Silhouette), quais são os 2-3 que melhor representam vocês?**
44. **Anexe 3-5 imagens de referência visual** (o agente pede pra arrastar arquivos no chat OU pra colar URLs)

### FASE 6 — Comportamento (5 perguntas)

A camada do "como age". Sai daqui pra `🤝 Brand Behavior`.

45. **Em quais canais a marca está presente hoje?** (lista)
46. **Em qual deles vocês são MAIS ativos? E em qual gostariam de ser mais ativos no próximo trimestre?**
47. **Quem responde DM/email/comentário negativo? Qual o SLA?**
48. **Crisis playbook: se sair uma matéria/post negativa sobre a marca, em quanto tempo vocês respondem? E como (silêncio, esclarecimento, autocrítica)?**
49. **Calendário comportamental: quais 3-5 datas do ano são "obrigatórias" pra marca tocar (Black Friday, aniversário da marca, lançamento anual)? E quais 2-3 datas vocês deliberadamente NÃO tocam (Dia das Mães genérico, datas politizadas)?**

### FASE 7 — Pilares e tabus (3 perguntas)

A camada do escopo editorial. Sai daqui pra `🧬 DNA Master` (pilares) e `🚫 Anti-Patterns` (tabus).

50. **Liste 3-5 pilares de conteúdo — eixos editoriais permitidos. Pra cada, dê 1 frase de escopo + estimativa de % da produção** → `brand_pillars`
51. **Liste 3-5 temas-tabu — temas que vocês JAMAIS tocam, com razão (ética, comercial, estratégica)** → `brand_taboo_topics`
52. **Dê 5 anti-patterns: 1 visual, 1 verbal, 1 comportamental, 1 editorial, 1 comercial — coisas que a marca NUNCA faz** → seeds pra `🚫 Anti-Patterns`

---

## Confirmação intermediária por fase

Após cada fase, o agente mostra o resumo:

```
─── FASE 2 — Estratégia — concluída ───

Propósito:         Existimos para que profissionais criativos brasileiros não...
Missão:            Construímos sistemas de IA criativa em português, treinados...
Visão:             [resposta da pergunta 11]
Concorrentes:      [resposta da pergunta 12]
Diferenciador:     [resposta da pergunta 13]
Escopo negativo:   [resposta da pergunta 14]
Key insight:       [resposta da pergunta 15]
Promessa central:  [resposta da pergunta 16]
Posicionamento:    [resposta da pergunta 17]
Voice anchor:      [resposta da pergunta 18]

(s) Seguir pra Fase 3 — Audiência
(r) Refazer alguma resposta da Fase 2
(d) Salvar progresso e continuar depois
```

---

## Modo Audit-first — agente analisa material existente

Se você escolheu **Audit-first**, o agente roda uma fase 0 antes da Fase 1.

```
Vou começar analisando o material existente da marca pra extrair o DNA observado.
Depois confronto com o que você responder nas 7 fases.

Vou montar primeiro um inventário de referências. Me mande tudo que você tiver:
links, site, Instagram, redes, portfólio, blog, newsletter, PDFs, decks, fotos,
vídeos, VFX, mockups, prints, textos, concorrentes, referências e anti-referências.

Pode mandar misturado. Eu organizo por categoria. Depois de cada lote, vou perguntar
se tem mais alguma coisa. Quando você disser "terminei de enviar todas as referências",
eu fecho o inventário, estudo tudo em profundidade e volto com o "DNA observado".

Tempo estimado: 30-60 min de processamento autônomo depois que o inventário estiver fechado.
```

O agente roda em background:

1. **Inventário de referências** → salva `discovery/link-inventory.md` e `discovery/asset-inventory.md` com categoria, origem, tipo, status, observação e prioridade
2. **Raio-x do site principal** → navega páginas internas, lê textos, interpreta imagens, entende estrutura, jornada, promessa, prova, tom de voz e comportamento
3. **Deep crawl seletivo** → segue links internos relevantes (sobre, produto, cases, blog, manifesto, pricing, FAQ, landing pages) até formar leitura íntima da marca
4. **Web fetch de redes sociais** → analisa headlines, captions, hashtags, formato visual, frequência, temas, picos de engajamento quando visíveis
5. **Análise de portfólio/cases** → identifica tipo de trabalho, promessa demonstrada, prova, processo, estética e recorrências
6. **Análise de blog/newsletter** → extrai tese editorial, vocabulário, cadência argumentativa, repertório cultural e autoridade
7. **Análise de decks/PDFs/emails** → compara tom institucional, comercial e editorial
8. **Análise de fotos, vídeos, VFX e mockups** → extrai direção visual, cor, tipografia, composição, textura, ritmo, aplicação e padrões de produção
9. **Web search e análise dos concorrentes** → mapa competitivo, códigos de categoria, white space e clichês do mercado
10. **Análise de referências e anti-referências** → separa o que é aspiração útil do que seria cópia ou ruído
11. **Ideia central** → formula tensão principal, ideia-guia, território da marca e ponto de vista
12. **Matriz de interpretação** → conecta referência/material → significado → regra → implicação
13. **Síntese** → produz "DNA observado" com variáveis preenchidas como **hipóteses rastreáveis**

Output: oito documentos no working folder, mostrados antes da Fase 1.

- `discovery/link-inventory.md`
- `discovery/asset-inventory.md`
- `discovery/link-analysis.md`
- `discovery/asset-analysis.md`
- `discovery/dna-observado.md`
- `discovery/ideia-central.md`
- `discovery/matriz-de-interpretacao.md`
- `discovery/gaps-e-hipoteses.md`

```
DNA OBSERVADO (extraído autonomamente):

brand_name (declarado no site): ...
brand_subject (extraído de hero/about): ...
brand_audience_term (extraído de captions): ...
brand_color_primary (extraído de CSS): #...
brand_voice_anchor_editorial (inferido do tom): ...
brand_aesthetic_anchor (inferido das refs visuais do feed): ...
brand_pillars (inferidos dos 60 posts): [Pilar A: 35%, Pilar B: 25%, ...]

3 OBSERVAÇÕES IMPORTANTES:
1. Tom dos posts é mais técnico que o tom do site (provável tensão de proposta)
2. Cor primária do site (#EC5E26) NÃO aparece nos últimos 60 posts (gap entre digital e social)
3. Concorrente X cobre o pilar Y melhor que vocês — vale checar se mantém ou cede

LINKS ANALISADOS:
- Site: 14 páginas internas
- Instagram: últimos posts públicos disponíveis
- Portfólio/cases: 6 páginas
- Blog/newsletter: 11 artigos
- Concorrentes: 5 marcas, 23 páginas

ARQUIVOS ANALISADOS:
- Fotos/stills: 18 arquivos
- Vídeos/Reels/VFX: 7 arquivos
- PDFs/decks: 3 documentos
- Mockups/prints: 12 imagens

GAPS:
- Não houve acesso a emails/newsletter fechada
- Portfólio tem cases visuais, mas pouca explicação de processo
- LinkedIn do fundador sugere tom mais autoral que o site

Quando você for responder as 52 perguntas, vou colocar essas hipóteses ao lado pra 
você confirmar ou refutar. Pronta pra começar a Fase 1?
```

Aí entra na Fase 1 normalmente — mas cada pergunta vem com a hipótese observada ao lado:

```
Pergunta 7: Em uma frase: o que sua marca faz?

Hipótese observada (do site/posts): "Cursos e workshops de IA criativa pra brasileiros"

Sua resposta:
```

Você confirma ou reescreve. **Esse contraste é onde DNA real aparece** — frequentemente o que a marca declara é diferente do que ela faz.

---

## Confirmação final

Depois das 7 fases (e da auditoria se houver), o agente mostra um resumo executivo:

```
═══ DNA CRIATIVO — RESUMO EXECUTIVO ═══

IDENTIDADE
  brand_name:         [nome confirmado]
  brand_handle:       [@handle confirmado]
  brand_slug:         [slug derivado]
  brand_url:          [URL confirmada]
  brand_color_primary: [#hex confirmado]
  brand_has_logo:     [true | false]

ESTRATÉGIA
  Propósito:          [resposta condensada da pergunta 9]
  Posicionamento:     [resposta condensada da pergunta 17]
  Key insight:        [resposta condensada da pergunta 15]

AUDIÊNCIA
  Persona primária:   [nome fictício] — descritor curto
  Anti-persona:       [descritor curto]

VOZ
  Princípio:          [frase]
  É:                  4 adjetivos
  Não é:              4 adjetivos
  Anchor editorial:   [veículo da pergunta 18]
  Anchor brand:       [marca da pergunta 33]

VISUAL
  Paleta:             #... (primary), #... (dark), #... (light)
  Display font:       [nome]
  Body font:          [nome]
  Aesthetic anchor:   [referências visuais da pergunta 42]
  Setups foto:        [setups escolhidos na pergunta 43]

PILARES (5)
  1. [Pilar 1] — 30%
  2. [Pilar 2] — 25%
  ...

TABUS (3)
  1. ...
  2. ...
  3. ...

ANTI-PATTERNS (5)
  1. ...
  ...

(s) Sim, criar a estrutura no Notion + ativar Routines
(r) Refazer fase específica
(e) Editar variável específica
(p) Preview cada página antes de criar
```

Quando você confirma, o agente:

1. Cria a pasta `~/{brand-slug}/` no Mac (ou `C:\Users\seu-user\{brand-slug}\` no Windows)
2. Move os 18 arquivos `.md` pra `~/{brand-slug}/docs/`
3. Cria `~/{brand-slug}/.brand.json` com as variáveis canônicas
4. Cria `~/{brand-slug}/.dna.json` com o snapshot completo do DNA (síntese executiva em JSON)
5. Cria `~/{brand-slug}/.claude/settings.json` com a allowlist de permissões
6. Pede o **Notion Integration Token**
7. Pede o **slug da página principal do Notion** (que você criou em branco) ou cria via API
8. Cria a estrutura no Notion seguindo o procedimento de `03-Notion-template.md` (4 databases + 14 sub-páginas)
9. Popula `🧬 DNA Master` com a síntese executiva
10. Popula as 13 outras páginas com profundidade derivada das respostas (cada página é um expand das fases relevantes)
11. Cria `🔐 Configuração` com checklist Higgsfield CLI e valida `higgsfield account status`
12. **Testa os conectores** Notion + Google Drive
13. Salva `~/{brand-slug}/notion-ids.json` com todos os IDs
14. **Guia você pela criação das 2 Routines no chat**, uma de cada vez

Tempo total: **~30-45 min de discovery + ~60s de execução do setup + 3 min criando as Routines**.

---

## Como o agente entrega a criação das Routines

> **Regra dura para o agente de setup: NÃO criar arquivo `.md` para o usuário abrir.** Tudo vai **direto no chat**, em blocos copiáveis, **uma Routine de cada vez**, esperando confirmação. Mesma filosofia do Carrossel.

O agente segue esta sequência:

### Primeiro: R1 — Brand Scout (Routine Remote)

```
Vamos criar a Routine 1 (R1 — Brand Scout). Abra Claude Desktop → 
Routines → New routine → tipo Remote.

Vou te passar campo por campo. Me avisa "ok" depois de cada um.
```

Solta, **um de cada vez, esperando "ok"**:
1. **Nome** (bloco copiável)
2. **Connectors** a marcar
3. **Tools** a marcar
4. **Schedule** (cron)
5. **Prompt completo** (um único bloco copiável grande)

Quando o usuário confirma que criou e rodou o "Run now" de teste → o agente passa pra R2.

### Depois: R2 — DNA Routine (Routine Local)

```
R1 criada. Agora a Routine 2 (R2 — DNA Routine). 
New routine → tipo Local.
```
Solta no chat, um de cada vez: Nome → Working folder → Connectors/Tools → Schedule → Prompt completo.

Os prompts completos das Routines estão em `14-R1-Brand-Scout.md` e `15-R2-DNA-Routine-Local.md` — o agente lê de lá e cola no chat (interpolando `{brand_*}`).

---

## Modo Lean (12 perguntas) — quando usar

Pra marca ainda nascendo ou pra teste rápido. As 12 perguntas são um subset estratégico das 52:

1, 2, 3 (Fase 1, identidade básica) +
9, 12, 16, 17 (Fase 2, propósito, concorrentes, promessa, posicionamento) +
19, 23 (Fase 3, persona + medo) +
27 (Fase 4, princípio editorial) +
35, 42 (Fase 5, cor + estética-âncora) +
50 (Fase 7, pilares)

O DNA gerado em modo Lean é **suficiente pra começar a produzir**, mas o resumo executivo da `🧬 DNA Master` vem com tags `[expandir depois]` em vários campos. R2 reconhece essas tags e roda mini-discovery quando precisa de profundidade num campo `[expandir depois]`.

Recomendação: rode Lean pra começar, agende rerun no modo Standard/Pro quando passar 30 dias de produção (você terá material observável próprio pra calibrar).

---

## Modo Standard (32 perguntas) — quando usar

Subset entre Lean e Pro. Pula:
- Fase 2: perguntas 13, 14 (concorrentes/escopo negativo detalhados)
- Fase 3: perguntas 25, 26 (touchpoints, anti-persona detalhada)
- Fase 4: perguntas 33, 34 (referência tonal não-jornalística, sample de textos)
- Fase 5: perguntas 36, 41 (cor secundária, font mono)
- Fase 6: perguntas 47, 48 (SLA, crisis playbook)
- Fase 7: perguntas 51 (tabus detalhados — só pega anti-patterns gerais)

Ideal pra **80% dos casos**.

---

## Reset / re-rodar wizard

Se errou alguma resposta e quer reconfigurar:

```bash
cd ~/{brand-slug}
claude
> reset DNA
```

O agente apaga `.brand.json` + `.dna.json` + `.discovery-progress.json` e roda o wizard de novo.

Pra ajustar uma resposta específica sem refazer tudo:

```bash
> editar resposta da pergunta 27 do DNA
```

Ou direto no Notion: edita a página relevante, depois roda `> rebuild DNA` no agente — ele relê todas as páginas, regenera `.dna.json` e propaga interpolações.

---

## Sub-comandos do agente após o wizard

Depois da configuração inicial, o agente conversacional (claude CLI no terminal local) reconhece comandos do dia-a-dia:

```bash
cd ~/{brand-slug}
claude
> auditar este post: [URL ou cola o texto]      # roda compliance score
> escrever email de boas-vindas seguindo DNA    # gera output compliante
> qual nosso anti-pattern visual #2?            # consulta DNA
> rebuild DNA                                   # re-sincroniza .dna.json com Notion
> diff DNA vs último snapshot                   # mostra o que mudou no DNA
> snapshot DNA                                  # cria snapshot trimestral no Drive
> revisar DNA (quarterly)                       # roda mini-discovery (8 perguntas) pra refresh
```

Comandos do dia-a-dia da R2 vão direto no painel da **Routine Local** no Claude Desktop (Run now + flag opcional):

```text
[Routine] → Run now                          # modo padrão (espera input)
[Routine] → Run now → "audit:<URL>"          # auditar asset externo
[Routine] → Run now → "generate:<brief>"     # gerar output
[Routine] → Run now → "evolve"               # mini-discovery de evolução
```

Os comandos conversacionais do agente CLI vivem em `PROJECT-INSTRUCTIONS.md` (gerado no setup).
