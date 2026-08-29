# Gramática de prompt — look cinematográfico / IMAX para Nano Banana 2

Esta é a fonte da verdade pra escrever os prompts da hero e das variações. O objetivo é um look de cinema **realista** (não CGI plástico), com o **produto como rei**, e os 5 frames parecendo saídos do mesmo filme.

Escreva os prompts **em inglês** — o Nano Banana responde melhor. Máximo ~1500 caracteres por prompt.

---

## O LOOK SPINE (decida uma vez, repita em TODOS os 5 prompts verbatim)

O que dá unidade de filme aos 5 frames é um bloco fixo que se repete idêntico em cada prompt. Defina-o a partir da direção criativa escolhida e **não mude entre os frames**:

```
LOOK SPINE (campaign grade, identical across all shots): cinematic IMAX feel, shot on IMAX 65mm; <PALETA: ex. warm amber and deep teal>; cinematic motivated lighting, <DIREÇÃO+QUALIDADE: ex. soft key from camera-left, gentle falloff, controlled speculars>; <FILM STOCK: ex. Kodak Vision3 500T> film grain, organic and tactile; high photographic realism, not CGI; subtle real-world imperfections (micro dust, faint fingerprint, soft reflection); shared shot grammar: <ÂNGULO EM COMUM: ex. slightly low hero eye-line>.
```

Os elementos do LOOK SPINE — em linguagem que o usuário pediu:
- **cinematic IMAX feel / shot on IMAX 65mm** — a "câmera IMAX" e o "imax feel".
- **cinematic motivated lighting** — a "luz cinematográfica". Sempre diga de onde vem a luz e como ela cai (key direction, falloff, speculars). Luz com motivação é o que separa cinema de foto de catálogo.
- **film stock + film grain, organic and tactile** — textura de filme. Grão **visível**, nunca "subtle/fine". É a vacina contra o look "IA plástica".
- **high photographic realism, not CGI** — o "realismo".
- **shared shot grammar (ângulo em comum)** — um eixo compositivo comum (ex. mesma linha de horizonte, mesma altura de câmera, mesmo lado da luz) que amarra os 5 frames mesmo variando o ângulo de cada um.

Stocks úteis: `Kodak Vision3 500T 5219` (noturno/quente), `Kodak Vision3 250D 5207` (diurno/limpo), `Fuji Eterna 500T 8573` (pastel/suave).

---

## Esqueleto da HERO (gerada a partir da foto original do produto)

```
Transform this amateur phone photo into a premium cinematic advertising HERO shot for a 9:16 vertical ad.

PRODUCT (the king of the frame — keep it 100% faithful to the reference photo: exact same shape, logo, colors, label text, proportions and materials; never redesign, restyle or distort the product itself): <descreva o produto e o material>.

SHOT: <enquadramento hero, ex. centered three-quarter hero view>, shallow depth of field, the product razor-sharp and clearly dominant in the frame.

LOOK SPINE (campaign grade, identical across all shots): <cole o LOOK SPINE inteiro aqui>.

SCENE: <cenário/superfície/fundo da direção escolhida>.

Leave headroom around the product for later motion (this still will be animated).

MOOD & ART DIRECTION: <1 frase>, composition inspired by award-winning commercial directors.
```

---

## Esqueleto da VARIAÇÃO (gerada com a HERO como `--image` de referência)

A hero aprovada entra como imagem de referência. O prompt manda manter tudo e mudar só o ângulo:

```
Use the attached image as the EXACT visual reference for scene, lighting, palette, grade and texture. Create a NEW SHOT of the SAME product in the SAME world — like another frame from the same film.

KEEP IDENTICAL: the product itself (same object, never restyle it — it is the king of the frame), the LOOK SPINE below, the background/surface, the lighting motivation and direction, the color grade and the film grain.

CHANGE ONLY THE CAMERA: <novo ângulo/enquadramento pro papel deste shot — ver sequencia_e_movimento.md>.

LOOK SPINE: <cole o MESMO LOOK SPINE verbatim>.

The product stays razor-sharp and dominant. High photographic realism, not CGI. Leave headroom for motion.
```

Por que funciona: passar a hero como referência ancora cena/luz/textura de forma concreta; o prompt só pede um novo ângulo. É muito mais consistente do que descrever a mesma cena 5 vezes do zero.

---

## Palavras a evitar dentro do produto

O vocabulário cinematográfico (cinematic, IMAX, cinematic lighting) é **bem-vindo** no LOOK SPINE — é o que o look pede. Mas **nunca** use adjetivos vazios pra descrever o **produto** em si: nada de "beautiful product", "stunning", "perfect", "amazing". Descreva o produto pelo físico (material, acabamento, forma, rótulo). O produto é fiel ao real; o drama vem da luz e da câmera, não de adjetivos.

---

## Exemplo completo — frasco de perfume âmbar (direção "Ritual Noturno")

**LOOK SPINE (fixo):**
> LOOK SPINE (campaign grade, identical across all shots): cinematic IMAX feel, shot on IMAX 65mm; deep teal shadows with warm amber highlights; cinematic motivated lighting, single soft key from camera-left raking across the surface, deep controlled falloff into shadow, tight speculars on glass; Kodak Vision3 500T 5219 film grain, organic and tactile; high photographic realism, not CGI; subtle real-world imperfections (micro dust on the surface, faint fingerprint on glass, soft reflection underneath); shared shot grammar: slightly low hero eye-line on a wet dark stone surface.

**HERO:**
> Transform this amateur phone photo into a premium cinematic advertising HERO shot for a 9:16 vertical ad. PRODUCT (the king of the frame — keep it 100% faithful: same amber glass bottle, same gold cap, same label text and proportions; never redesign or distort it): a faceted amber glass perfume bottle with a brushed gold cap, liquid catching light inside. SHOT: centered three-quarter hero view, shallow depth of field, bottle razor-sharp and dominant. LOOK SPINE (...cole o spine inteiro...). SCENE: standing on wet dark stone, thin mist low in the background, a single distant warm practical light out of focus. Leave headroom around the bottle for later motion. MOOD & ART DIRECTION: quiet nocturnal ritual, composition inspired by award-winning commercial directors.

**VARIAÇÃO 01-hook (macro do cap, ângulo incomum):**
> Use the attached image as the EXACT visual reference for scene, lighting, palette, grade and texture. Create a NEW SHOT of the SAME perfume bottle in the SAME world — another frame from the same film. KEEP IDENTICAL: the bottle itself (never restyle it — king of the frame), the LOOK SPINE below, the wet stone surface, the camera-left key and falloff, the grade and grain. CHANGE ONLY THE CAMERA: extreme macro on the gold cap and the top edge of the glass from a steep low angle, the rest of the bottle falling into shallow-focus shadow. LOOK SPINE: (...mesmo spine verbatim...). The bottle stays razor-sharp and dominant. High photographic realism, not CGI. Leave headroom for motion.

Adapte a mesma lógica pros outros papéis (reveal/detail/action) trocando só a linha **CHANGE ONLY THE CAMERA**.
