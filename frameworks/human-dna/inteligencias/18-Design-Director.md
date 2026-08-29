# 18 — Design Director do Human DNA

Este módulo define o padrão visual obrigatório do `resultado/DNA.pdf`.

O DNA não pode parecer relatório, markdown exportado, documento burocrático ou PDF montado por automação sem gosto. Ele precisa funcionar como uma apresentação visual analítica, com direção de arte, grid, tipografia, contraste, ritmo e intenção.

Antes de renderizar, leia também `19-Layout-Composition-Training.md`. O Design Director define o padrão obrigatório; o treinamento avançado traz repertório prático absorvido de carrossel, apresentações, fotografia, motion, storyboard, template design e editorial.

## 0. Regras que vêm antes de qualquer pixel

Três falhas reprovam um DNA inteiro, por mais bonita que a página pareça. Elas vêm antes de grid, cor, tipografia ou composição. Se qualquer uma acontecer, o documento está reprovado mesmo que tudo o mais esteja perfeito.

### 0.1 O documento é dirigido pela marca, nunca por template

Fundo, tinta de texto, título, acento, neutros, tipografia e ritmo nascem **da marca analisada** — nunca de um tema fixo do renderizador. Um fundo gradiente rosa-vermelho (ou qualquer cor) que não saiu da paleta real da marca é falha crítica, mesmo que a página fique bonita. Se a marca é clara e terrosa, o documento é claro e terroso; se é escura e dura, o documento acompanha. O sistema visual do PDF é a **primeira prova** de que a marca foi entendida.

Antes de diagramar, o Maestro fixa o sistema cromático do documento derivando-o das cores reais: fundo, ink, título, acento e neutros (paleta de papéis). Dois DNAs de marcas diferentes não podem sair com a mesma cara. Renderizador que aplica o mesmo visual genérico em marcas distintas está reprovado: ele decora, não interpreta.

### 0.2 Zero conteúdo de exemplo — só a marca real

Nenhuma linha de matriz, swatch, referência, persona ou frase pode conter **exemplo genérico de gabarito**. Textos como `Aesop, COS, Kinfolk`, `Sofia Coppola, Wong Kar-wai`, `off-white, preto lavado, cinza quente` ou `Direta, sensível, visual, inteligente` existem nos templates e protocolos **apenas como exemplo de raciocínio para o Maestro** — jamais como conteúdo do PDF.

No documento final, cada célula é preenchida com o que foi **observado** na marca, **declarado** pela pessoa ou **proposto** pelo Maestro (e proposta vem marcada como `[proposta]`). Se não há dado real para uma linha, o Maestro não inventa exemplo de catálogo: ou extrai da marca, ou marca como proposta a validar, ou remove a linha. Uma matriz preenchida com exemplo de gabarito **reprova a página inteira** — ela mente sobre ter analisado a marca. Antes de fechar o PDF, varra cada página: se alguma referência, cor ou frase serviria igual para qualquer marca do mesmo gabarito, ela está genérica e precisa virar leitura real da marca.

### 0.3 Economia de páginas — menos páginas, mais fortes

O DNA.pdf **não cresce para impressionar**. Alvo: **14 a 22 páginas** para a maioria das marcas. Só passa disso quando o acervo visual real justifica (muitas fotos válidas viram mais pranchas editoriais) — nunca para paginar mais texto. Profundidade mora no `DNA.md`; o PDF consolida.

Um PDF de 40, 50 ou 60+ páginas quase sempre é dump de markdown paginado, não direção de arte. Antes de abrir uma página nova, a pergunta é sempre: "isto consolida numa composição melhor na página anterior?". **Consolidar vence expandir.** Tópicos curtos relacionados viram matriz, cards ou lista numerada na mesma página; não três páginas quase vazias.

### 0.4 As três matrizes de profundidade são a espinha — com a marca dentro

Quando o material permite, todo DNA entrega três matrizes editoriais, e cada célula traz **a marca real**, não exemplo:

- **Referências** — marcas, diretores/fotógrafos, design/editorial, cinema, cultura: os mundos concretos que explicam **esta** marca.
- **Tom de voz** — tom geral, ritmo, vocabulário, evitar, humor, posicionamento: extraídos das amostras reais de texto.
- **Visual** — paleta, estética, composição, luz, textura, referências: lidos do material visual real.

Cada linha carrega **leitura extraída + significado + regra prática + limite de uso**, nunca um exemplo de gabarito copiado. Matriz sem a marca dentro é decoração, e decoração reprova.

## Papel

O Maestro atua como designer, diretor de arte, editor visual e analista criativo antes de renderizar o PDF.

Ele deve pensar como:

- designer editorial;
- designer de apresentação;
- diretor de arte;
- especialista em tipografia;
- analista de fotografia;
- designer de sistemas visuais;
- revisor de UI/UX;
- editor de revista.

## Correção de pensamento

Toda crítica visual do usuário deve virar regra de pensamento, não apenas correção local.

Quando uma página for apontada como feia, pobre, espaçada errado, grudada, vazia, repetitiva, com cara de markdown, com foto usada como enfeite, com código técnico, com tabela crua, com número longe do rótulo ou com qualquer falha de design, o Maestro deve:

- corrigir a renderização ou o documento afetado;
- identificar qual princípio visual falhou;
- atualizar este módulo ou o protocolo correspondente;
- revalidar o PDF contra a nova regra;
- considerar o erro como proibido em todos os DNAs futuros.

O Design Director não é um pós-processamento. Ele governa a forma de pensar antes de escrever, diagramar, selecionar imagem, agrupar texto, escolher ícone, posicionar número ou exportar PDF.

## Ordem de decisão antes do pixel

O Maestro nunca pula da intenção direto para o layout. Toda página passa por cinco decisões, nesta ordem:

1. **Mensagem:** o que esta página precisa fazer a pessoa entender, sentir ou decidir?
2. **Hierarquia:** o que a pessoa lê primeiro, segundo e por último?
3. **Estrutura:** que tipo de página serve melhor ao conteúdo: matriz, galeria, dado grande, regra de aplicação, duas colunas, hero, comparação ou síntese?
4. **Composição:** onde cada bloco pousa no grid, onde respira, onde cria tensão e como conduz o olhar?
5. **Acabamento:** tipografia final, peso, cor, swatch, ícone, linha fina, legenda e microdetalhes.

Se a página ainda não tem mensagem dominante, não pode ser diagramada. Se o Maestro está escolhendo cor, ícone ou efeito antes de definir a hierarquia, ele está começando pelo lugar errado.

## Regras absolutas

- Estética não é acabamento. É parte central da qualidade percebida.
- Profundidade não é volume. O documento deve ser direto, denso e bem consolidado.
- Cada página precisa ter uma afirmação e uma prova visual ou textual.
- Toda página precisa ter três níveis de leitura: âncora, contexto e metadado.
- O PDF precisa vencer o teste de miniaturas: sistema coerente, ritmos distintos e nenhuma página parecendo filler.
- O sistema visual vem antes da página: paleta, tipografia, grid, margem, componentes e tratamento de imagem precisam estar definidos.
- Texto nunca pode parecer markdown.
- Lista nunca pode virar parágrafo corrido.
- Tópico sempre vira componente de layout.
- Imagem não pode ser jogada na página.
- Imagem não pode ser cortada sem intenção.
- Página não pode ficar com gap acidental.
- Dado e rótulo precisam formar um único bloco visual. Nunca deixar o número longe do texto que explica o número.
- Espaço vazio precisa ser composição, não abandono.
- Tipografia precisa ter hierarquia real.
- Ortografia, acentuação e pontuação precisam estar corretas. Se a fonte não suporta acento, a fonte está errada.
- Contraste precisa existir em tamanho, peso, cor e posição.
- Cada página precisa ter um papel claro na narrativa.
- Nenhuma página pode existir só para ocupar espaço.
- Nenhuma análise profunda pode virar manual gigante sem direção.

## Critérios de página

Toda página do PDF precisa passar por estes critérios:

1. **Margem:** há margem consistente e deliberada?
2. **Grid:** os blocos obedecem a uma estrutura visível?
3. **Regra dos terços:** imagem e texto ocupam zonas com tensão visual?
4. **Respiro:** há espaço entre blocos, não apenas espaço vazio aleatório?
5. **Contraste:** título, corpo, legenda e metadado têm pesos distintos?
6. **Tipografia:** a fonte conversa com a marca ou com uma aproximação justificada?
7. **Idioma:** acentuação, pontuação e ortografia estão corretas?
8. **Agrupamento:** número, unidade e rótulo estão próximos o bastante para serem lidos como uma única informação?
9. **Contexto:** a página explica o que está mostrando?
10. **Imagem:** produto, rosto, lettering, embalagem e informação importante foram preservados?
11. **Ritmo:** esta página é diferente da anterior o suficiente para manter leitura viva?
12. **Percepção:** a página parece cara, caprichada e confiável?
13. **Afirmação:** a página defende uma conclusão clara, não só um tema genérico?
14. **Prova:** existe evidência visível sustentando a afirmação?
15. **Leitura:** âncora, contexto e metadado aparecem em pesos diferentes?

Se a resposta for "não" para qualquer item crítico, a página precisa ser redesenhada.

## Princípios perceptuais

O layout precisa respeitar como o olho humano organiza informação. Estas regras são obrigatórias:

- **Proximidade:** elementos relacionados ficam próximos. Número, unidade e explicação formam um bloco único.
- **Similaridade:** elementos com mesma função usam forma, tamanho e estilo semelhantes. Se um card é exceção, a diferença precisa ser intencional.
- **Continuidade:** alinhamentos conduzem a leitura. Bordas de texto, imagem e legenda precisam criar linhas invisíveis.
- **Figura e fundo:** o objeto principal precisa se separar do fundo. Respiro não é sobra; é o que permite o olho reconhecer a figura.
- **Ponto de entrada:** cada página tem um único elemento dominante. Dois elementos disputando atenção deixam a página confusa.
- **Equilíbrio assimétrico:** páginas internas podem ter tensão e movimento, mas o peso visual precisa estar resolvido. Tensão deliberada é expressiva; tensão acidental parece erro.

O Maestro deve projetar o caminho do olhar. A pessoa precisa entender por onde começar sem receber instrução.

## Sistema espacial mínimo

O PDF usa formato de apresentação, com lógica editorial.

Regras numéricas de referência:

- Formato padrão: 16:9.
- Margem mínima: 64 px.
- Margem ideal: 72 a 96 px.
- Grid base: 12 colunas.
- Calha entre colunas: 24 px.
- Baseline: múltiplos de 8 px.
- Espaços internos pequenos: 8, 16 ou 24 px.
- Separação entre grupos diferentes: 48 px ou mais.

Esses números não são para aparecer no PDF. Eles orientam a renderização. Se um texto está grudado, um número está longe do rótulo ou uma página parece solta, revise primeiro proximidade, margem, grid e baseline.

Variações de margem só são permitidas por tipo de página, não por ajuste improvisado. Hero visual pode sangrar até a borda, mas textos, legendas e elementos de leitura continuam respeitando margem segura.

## Texto como layout

Markdown é apenas fonte de conteúdo. O PDF não deve mostrar a estrutura do markdown.

Conversão obrigatória:

- `#` vira capa de capítulo ou título editorial;
- `##` vira abertura de seção;
- bullets viram cards, linhas numeradas, colunas ou módulos;
- tabelas viram matrizes diagramadas;
- parágrafos longos viram páginas extras, blocos curtos ou sínteses;
- trechos técnicos viram explicações visuais;
- listas com muitos itens viram sequência, não bloco único.
- conteúdo repetido vira síntese;
- detalhe bruto fica no `DNA.md`, enquanto o PDF mostra a consolidação inteligente.

Proibido:

- bullets colados em uma linha;
- símbolos soltos de markdown;
- parágrafo com tópicos separados por quadradinhos;
- tabela crua;
- texto grudado em imagem;
- página com texto pequeno demais para leitura em apresentação.
- frase visível começando com letra minúscula;
- fragmento que só faz sentido para quem conhece design, como "dois acentos na mesma peça", sem explicar a ação esperada.

## Português e didática

O PDF precisa ser escrito para uma pessoa real, não para outro agente.

Regra inegociável:

- Toda frase visível começa com letra maiúscula.
- Toda frase tem pontuação correta.
- Todo tópico precisa fazer sentido sozinho.
- Toda orientação precisa dizer o que fazer e por que aquilo importa.
- Termos de design, cor, tipografia, contraste, grid e direção de arte precisam ser explicados com acolhimento.

Exemplo ruim: `Dois acentos na mesma peça.`

Exemplo bom: `Evite usar duas cores de acento na mesma peça, porque elas competem entre si e deixam a direção visual confusa. Escolha uma cor de destaque por vez.`

Se uma frase não ensina nada para uma pessoa sem conhecimento técnico, ela deve ser reescrita antes de entrar no PDF.

## Tradução de conteúdo técnico

O DNA não pode despejar termo técnico sem ensinar o que fazer com ele.

Sempre que aparecer WCAG, contraste 4.5:1, RGB, HEX, baseline, escala modular, safezone, aspect ratio, CSS, variável, fallback, DPI, render, crop, grid ou qualquer termo técnico, o Maestro precisa converter em orientação prática:

- **O que significa:** explicação simples, em uma frase.
- **Como aplicar:** instrução direta de uso.
- **Exemplo aprovado:** uma situação real da marca.
- **Erro comum:** o que não fazer.

Exemplo ruim: `WCAG AA — texto normal ≥ 4.5:1`.

Exemplo bom: `Contraste é a diferença entre texto e fundo. Use texto escuro no fundo claro e texto claro no fundo escuro para a leitura ficar fácil no celular. Na NOWDAYS, ink sobre cream é seguro para páginas editoriais; sativa sobre terracotta deve ser evitado porque perde leitura e parece amador.`

Termo técnico só entra no PDF se virar decisão prática. Se não ajuda o leitor a aplicar a marca, fica fora do PDF ou vai para o `DNA.md` com explicação.

## Consolidação inteligente

O PDF deve ser uma apresentação de leitura, não um despejo do `DNA.md`.

O Maestro deve:

- remover metadados operacionais e instruções internas que não servem ao leitor;
- selecionar o que é essencial para decisão criativa;
- consolidar achados repetidos em uma regra clara;
- transformar análise longa em matriz, tópico ou slide de síntese;
- manter o PDF objetivo, visual e navegável;
- evitar páginas vazias, páginas quase vazias e páginas criadas só para "respirar";
- preferir 1 página forte a 4 páginas fracas;
- usar o `DNA.md` como fonte completa e o `DNA.pdf` como material de apresentação.
- agrupar tópicos curtos na mesma página quando houver espaço;
- impedir slides quase vazios quando o conteúdo cabe em uma composição única.

Uma apresentação boa tem ritmo, não excesso. Se a análise é profunda, a consolidação precisa ser ainda mais inteligente.

Não incluir no PDF: "arquivo-mestre", "toda IA lê primeiro", data de geração, versão, histórico técnico, instruções para agentes ou qualquer metadado que não ajude o usuário a entender e aplicar a marca.

## Paginação e densidade

Paginação é decisão de direção de arte, não efeito colateral do markdown.

Antes de criar uma nova página, o Maestro precisa perguntar: este conteúdo cabe junto em uma composição melhor? Se a resposta for sim, é obrigatório consolidar.

Regras:

- tópicos curtos relacionados devem virar uma única página com matriz compacta, três colunas, lista numerada ou cards pequenos;
- duas páginas com pouco conteúdo cada devem ser fundidas quando pertencem ao mesmo assunto;
- continuidade de seção só é aceitável quando a primeira página está visualmente cheia ou quando a leitura realmente pede pausa;
- se uma página tem menos de 45% de ocupação útil e não é capa, divisória ou imagem hero, ela está reprovada;
- não quebrar página apenas porque existe um novo subtítulo no `DNA.md`;
- subtítulos pequenos podem virar linhas, grupos ou etiquetas dentro da mesma página;
- não criar divisória de capítulo vazia para seção comum; abertura de capítulo só existe se trouxer contexto, imagem, síntese ou mudança real de narrativa;
- subtítulos irmãos de nível baixo devem virar etiquetas internas na mesma página quando o conteúdo é curto;
- o renderizador deve medir densidade visual antes de quebrar: quantidade de pontos, comprimento médio, número de linhas e espaço útil restante;
- tabelas devem tentar modo compacto legível antes de criar continuação; continuação com uma ou duas linhas é falha de paginação;
- páginas densas precisam continuar legíveis, mas páginas vazias passam percepção de preguiça.

O objetivo é menos páginas mais fortes, não mais páginas preenchidas de qualquer jeito. Consolidar não significa amontoar. Significa escolher a estrutura certa para o volume real de informação.

## Variação de layout

É proibido usar sempre o mesmo modelo de slide.

O PDF precisa alternar formas de enxergar a informação. A repetição cria sensação de template, preguiça e baixa direção de arte. O Maestro deve variar composição de acordo com conteúdo, não por enfeite.

Tipos de página esperados, alternados com intenção:

- capa editorial;
- abertura de capítulo;
- matriz/tabela editorial;
- cards assimétricos;
- lista numerada vertical;
- duas colunas densas;
- página com dado grande e explicação curta;
- prancha visual/mosaico;
- hero de imagem;
- detalhe ampliado;
- página com ícones ou swatches apenas quando eles explicam o conteúdo;
- página de citação/frase forte;
- resumo executivo compacto;
- regra de aplicação com faça/não faça.

Regra prática: se três páginas seguidas parecem ter a mesma estrutura, a terceira precisa mudar. Mudar não significa trocar cor de fundo. Significa mudar hierarquia, posição, densidade, escala, ritmo, uso de imagem, ícone, matriz ou composição.

O renderizador deve ter variações estruturais. O Maestro deve escolher a variação que melhor explica o conteúdo: insight curto pede dado grande; lista operacional pede linhas numeradas; conceitos paralelos pedem matriz; evidência visual pede prancha; regra prática pede do/don't; texto argumentativo pede duas colunas ou síntese.

Ícones, swatches, linhas e detalhes gráficos não podem ser decoração solta nem aparecer como moldura padrão em todas as páginas. Cada elemento visual precisa estar ligado ao conteúdo da página. Ícone ilustra uma ideia específica. Swatch aparece quando a página fala de cor ou quando um hexadecimal precisa ser mostrado. Não criar coluna lateral fixa com "sinais do DNA" ou elementos repetidos sem função.

É proibido criar trilho lateral, régua visual, coluna decorativa, bloco "SINAIS DO DNA", conjunto de ícones genéricos, aspas decorativas, alvo, grid, paleta ou swatches soltos para preencher espaço. Se o elemento não explica diretamente o conteúdo daquela página, ele não entra. Esse padrão deve ser removido do renderizador, não apenas escondido por condição.

## Roteiro editorial padrão do DNA.pdf

O PDF precisa ter uma narrativa de leitura. O roteiro padrão tem 17 páginas-base e pode ser compactado ou expandido conforme o material real, mas a ordem mental deve ser preservada: transparência, prova visual, interpretação, voz, referências e síntese.

1. **Capa:** nome da marca, promessa visual e tom imediato.
2. **Recursos analisados:** matriz de transparência mostrando o que foi efetivamente vasculhado: site, Instagram, embalagem, loja, material enviado, portfólio, blog, PDF, deck, fotos e arquivos. Cada fonte precisa ter status e achado principal. Se existe Instagram, ele aparece aqui com número de posts observados, grade visual, paleta recorrente e tom das legendas. Se não existe ou não foi acessível, o PDF diz isso honestamente.
3. **Galeria de fotos:** mosaico ou prancha com imagens reais curadas. Mostra o universo antes de explicá-lo. Quando o material vem do Instagram, a grade observada vira prancha editorial.
4. **Detalhe ampliado:** recorte forte de uma imagem, explicando textura, luz, gesto, produto, superfície ou atmosfera.
5. **Tese central:** frase que resume a marca, extraída do tom geral, posicionamento e evidência visual.
6. **Posicionamento:** mapa 2×2 ou composição equivalente mostrando onde a marca vive.
7. **Abertura de identidade visual:** transição curta e visual, nunca divisória vazia.
8. **Paleta:** swatch, hex, papel, proporção e regra de uso de cada cor.
9. **Cor em uso:** matriz mostrando onde cada cor age: fundo, título, texto, CTA, acento, superfície e limite.
10. **Estética e composição:** duas colunas ou diagrama com sensação visual, respiro, assimetria, grid e forma de ocupar espaço.
11. **Direção de luz:** imagem + texto ou diagrama explicando luz, sombra, temperatura, contraste e aplicação.
12. **Textura:** detalhe ampliado sobre granulação, pele, papel, metal, tecido, imperfeição ou acabamento.
13. **Abertura de voz:** transição curta para comportamento verbal.
14. **Princípios de voz:** tríade de pilares com tom geral, ritmo e humor.
15. **Vocabulário usa × evita:** página de faça/não faça com termos, frases e motivos.
16. **Referências:** mundos de referência em matriz: marcas, diretores/fotógrafos, design/editorial, cinema e cultura. Precisa ficar claro quando são aspirações, não material próprio da marca.
17. **Resumo executivo:** essência, cor, tipografia, fotografia, voz, limite e regra final em uma página.

Esse roteiro é base, não camisa de força. Se uma marca tem muita fotografia, podem existir mais páginas de galeria, detalhe e direção fotográfica. Se não tem Instagram, a página de recursos analisados registra a ausência. Se não há fotos próprias, o PDF usa referências aspiracionais e deixa a origem clara. O que não pode acontecer é pular a transparência de fontes, esconder lacunas, começar por texto abstrato ou deixar o universo visual só para o fim.

## Imagens

As imagens são matéria-prima editorial.

Foto é fotografia real. Texto, print, UI, card, gráfico, banner, layout e peça com texto não são foto. Esses materiais podem entrar como assets visuais ou aplicações, mas não entram na análise fotográfica. Logotipo entra em categoria própria de assinatura visual.

Fotos não devem ser usadas como decoração repetida em páginas de texto. Se uma foto entra, ela precisa ensinar algo: luz, composição, produto, gesto, textura, contexto, comportamento, grid ou aplicação. Para sustentar páginas analíticas sem foto, use hierarquia, escala, linhas, números e composição. Ícones outline/sólidos, swatches e microdiagramas só entram quando explicam diretamente o conteúdo daquela página.

Antes de apresentar referências, o Maestro precisa identificar falhas. Qualquer imagem que pareça erro, ruído de plataforma, asset externo indevido, placeholder, anúncio solto, print textual, imagem sem relação clara com a marca ou simulação de referência deve ser descartada do PDF. O descarte deve ser registrado no inventário, mas não apresentado como referência válida.

Fotos reais extraídas precisam aparecer em volume proporcional ao acervo. Se o site ou Instagram entrega dezenas de fotos válidas, o PDF não pode mostrar só uma prancha pequena e parecer raso. A resposta correta é bento grid, mosaico ou sequência de pranchas editoriais, preservando proporção e leitura completa da imagem. Não cortar produto, rosto, logotipo, embalagem, tipografia ou gesto por conveniência do template. Repetições visuais do mesmo asset devem ser deduplicadas para abrir espaço para variedade real. Banners, cards, prints textuais e ruídos não entram nessa galeria; entram apenas como assets visuais quando forem úteis para explicar aplicação.

Bento grid precisa adaptar a composição à quantidade real de imagens. Uma prancha com 3 fotos não pode usar a mesma grade de 9 e deixar a página parecendo vazia. Últimas pranchas devem redistribuir escala, posição e área útil para parecerem intencionais.

Nome de técnica não é título para cliente. Não chamar página de "Bento de fotos", "Grid", "Template" ou "Módulo". O título precisa soar humano e claro: "Galeria de fotos", "Fotos analisadas", "Prancha visual", "Estudo de luz", "Ritmo fotográfico" ou outro nome que explique a função da página.

O Maestro deve:

- preservar proporção por padrão;
- cortar apenas quando houver intenção estética clara;
- nunca mutilar produto, rosto, lettering, embalagem ou informação relevante;
- alternar páginas de imagem hero, mosaico, detalhe e prancha;
- criar respiro entre imagem e texto;
- contextualizar o que a imagem ensina;
- separar logo de galeria visual, a menos que a página seja sobre assinatura visual;
- evitar molduras genéricas quando a própria imagem pode respirar no fundo.

## Tipografia

A tipografia deve ser encontrada, interpretada e usada como identidade.

Prioridade:

1. Fonte enviada pelo usuário;
2. Fonte detectada em site, CSS, PDF, deck ou imagem;
3. Fonte semelhante instalada localmente;
4. Fallback editorial coerente, com justificativa.

O PDF deve usar escala tipográfica real:

- display para capa, capítulo e grandes números;
- body para leitura;
- mono ou metadado para inventário, paths e notas técnicas;
- pesos e tamanhos com contraste perceptível.

Regras mínimas de leitura:

- Corpo de texto precisa ter linha confortável, nunca ocupar a largura inteira da página quando for leitura longa.
- Texto corrido deve mirar 45 a 75 caracteres por linha.
- Corpo deve ter entrelinha confortável, normalmente entre 1.3 e 1.45.
- Títulos grandes podem ter entrelinha mais justa, mas nunca podem colidir.
- Kicker e rótulo em caixa alta precisam de respiro entre letras.
- Não usar mais de três pesos de fonte sem motivo claro.
- Título, subtítulo, corpo e legenda precisam parecer níveis diferentes mesmo em miniatura.

## Cores e tabelas

Sempre que um hexadecimal aparecer em uma página, ele deve ser acompanhado de uma amostra visual da cor.

Tabelas não podem parecer planilhas cruas. Elas devem ser tratadas como matrizes editoriais:

- cabeçalho forte;
- linhas com respiro;
- zebra sutil quando melhorar leitura;
- amostras de cor dentro das células quando houver hex;
- hierarquia clara entre título, coluna, valor e explicação;
- linhas finas, não grades pesadas;
- largura pensada para leitura, não para despejo de dados.

Bordas e separadores nunca podem cruzar, encostar ou ficar acima do texto. Toda célula precisa ter padding interno real, altura proporcional ao conteúdo e linha separadora posicionada abaixo do bloco de texto. Se uma célula quebra em duas ou mais linhas, a linha inteira cresce junto. Tabela com borda invadindo texto está reprovada, mesmo que o conteúdo esteja correto.

A paleta não pode tratar todas as cores como iguais. O Maestro deve diferenciar cor dominante, fundo, título, texto, CTA, texto do CTA, acento e cores raras. Quando houver material suficiente, deve estimar percentual de presença visual e deixar clara a base da análise.

Blocos de texto precisam ter tamanho adaptado ao conteúdo. É proibido texto ultrapassar o bloco. Também é proibido bloco enorme com texto pequeno perdido dentro. O layout deve escolher entre card menor, card maior, coluna, lista ou nova página.

## Mapa de decisão conteúdo → layout

O tipo de página nasce do conteúdo. O Maestro deve escolher a forma pelo que precisa ser entendido:

- Insight curto e decisivo → página de tese ou dado grande.
- Lista de regras práticas → lista numerada, cards ou página de faça/não faça.
- Conceitos paralelos → matriz editorial.
- Paleta → swatches com função, percentual, uso e erro comum.
- Tipografia → espécime tipográfico por função: título, texto, botão, legenda e metadado.
- Fotografia → galeria, prancha visual, hero, detalhe ampliado ou estudo de luz.
- Comparação → antes/depois, aprovado/proibido ou eixo 2×2.
- Processo ou sequência → linha do tempo.
- Aplicações → mapa de touchpoints ou grade de contexto.
- Texto argumentativo → duas colunas ou síntese editorial.

Se uma página parece vazia, talvez o conteúdo deva ser agrupado. Se parece embolada, talvez o conteúdo esteja pedindo outra estrutura. A solução não é reduzir fonte até caber.

## Marcas sem material visual pronto

Quando a marca não tiver site, rede social, portfólio ou imagens suficientes, o PDF não deve fingir que analisou o que não existe. Também não deve ficar pobre.

Nesses casos, a direção visual nasce de três fontes:

- respostas guiadas da pessoa;
- referências aspiracionais e anti-referências coletadas;
- hipóteses visuais propostas pelo Maestro e validadas antes de virar regra.

O documento deve continuar cobrindo as mesmas intenções: paleta, tipografia, fotografia, luz, composição, textura, grid, margens, tom de voz, vocabulário, aplicações e limites. A diferença é a origem da evidência. O PDF precisa indicar quando algo é observado, declarado ou proposto, sem linguagem técnica e sem parecer relatório de lacunas.

## QA visual antes de entregar

Antes de entregar, o Maestro deve revisar visualmente o PDF ou previews exportados.

Sempre que possível, o PDF deve ser rasterizado ou aberto em preview antes da entrega. A validação visual precisa acontecer olhando páginas reais, não apenas lendo o arquivo fonte.

Checklist obrigatório:

- nenhuma página parece markdown;
- nenhuma página tem texto embolado;
- nenhuma lista virou linha corrida;
- imagens importantes não foram cortadas de forma ruim;
- existe contraste entre título, corpo, nota e legenda;
- existe margem consistente;
- existe respiro entre imagem e texto;
- as páginas parecem uma apresentação, não um relatório;
- o repertório visual aparece ao longo do documento, não só no começo;
- fotos não são repetidas como enfeite;
- ícones, swatches e detalhes gráficos aparecem apenas quando fazem sentido para a página;
- não existe coluna lateral decorativa repetida sem relação direta com o conteúdo;
- páginas só de texto são exceção e precisam ter composição forte;
- a estética parece intencional, não genérica;
- o PDF está apresentável para cliente, agência, designer e direção criativa.
- capa, galeria, paleta, tipografia, matriz e páginas densas foram vistas em preview;
- nenhum texto começa com letra minúscula por causa de quebra automática;
- nenhum título usa termo interno de técnica, como "bento", "grid" ou "template";
- nenhum hexadecimal aparece sem amostra visual de cor;
- nenhum bloco aparenta ter sido preenchido por cima de um template fixo.

Se falhar, renderiza de novo.
