# Generation Model Reference & Prompt Framework

Tool-agnostic. Edit only the **"Custom project context"** section to point at your own files.

---

## Image Models

### Nano Banana 2 (`nano_banana_2`) ← modelo obrigatório para imagens

| Param | Options | Default | Notes |
|-------|---------|---------|-------|
| `prompt` | text | — | Required |
| `aspect_ratio` | `auto` `1:1` `3:2` `2:3` `4:3` `3:4` `4:5` `5:4` `9:16` `16:9` `21:9` | `1:1` | Includes `auto` |
| `resolution` | `1k` `2k` `4k` | `2k` | **Always use 2k. 4k looks plastic — loses film grain and texture.** |
| `input_images` | array | — | Passed via `--image` flags |

---

**Regra de projeto:** nao usar outro modelo como fluxo de imagem. Iteracao, frames finais, product shots, carrosseis e pecas sociais usam `higgsfield generate create nano_banana_2`.

---

## Nano Banana 2 — construção do prompt de frame (uso interno)

> **Knowledge base interna** para o Claude montar prompts de frame com Nano Banana 2. Ajuda a *construir* o prompt — **não** é texto para colar dentro dele. Ver também `COMECE-AQUI.md` → Parte 4, "Acabamento cinematográfico".

### Inferência de look

Leia o input e infira o look **antes** de escrever o prompt:

| Pistas no input | Look resultante |
|---|---|
| Nada sobre estilo, frase narrativa comum | Cinematográfico narrativo — denso, impactante, artístico |
| "Comercial", "publicidade", "produto", "campanha" | Cinematográfico comercial — polido mas físico, luz controlada, framing limpo porém não óbvio |
| "Terror", "horror", "suspense", "tensão" | Cinematográfico tenso — baixa iluminação motivada, sombras densas, câmera próxima |
| "Documental", "indie", "jornalístico", "guerrilha" | Documental-handheld — 16mm granulado, câmera instável, intercepted |
| "Preto e branco", "P&B", "B&W", "monochrome" | Monochrome denso — Double-X ou 7222, contraste alto |
| "Retrato", "portrait", "close" | Retrato autoral — lente mais longa, DOF raso |
| "Paisagem", "wide", "escala", "épico" | Wide escala — grande angular, profundidade, pouco sujeito |
| Imagem fornecida com look claro | Leia a imagem: identifique stock/formato, mood, cor, hora do dia, mantenha coerência |

### Inspiração (USO INTERNO — nunca citar no output)

Pense como Roger Deakins, Bradford Young, Hoyte van Hoytema, Christopher Doyle, Robbie Ryan, Darius Khondji, Emmanuel Lubezki, Greig Fraser. Use a **filosofia**, não o visual. **NUNCA** cite diretores, DPs ou filmes no output. A única referência permitida é `inspired in the work of award-winning directors` na linha final.

### POST BEHAVIOR — decisão autoral crítica

`POST BEHAVIOR` carrega a **assinatura visual** da imagem. **Nunca** genérico, **nunca** template, **nunca** repetir o mesmo stock por hábito. Escolho formato/stock, grão visível, halation, curva, saturação e midtone priority conforme o look inferido — cada frame merece uma decisão própria.

### COMPOSITIONAL GEOMETRY

Define a estrutura do enquadramento: peso visual, assimetria, intrusion, terços quebrados. Trabalha contra o enquadramento óbvio — é onde mora o ângulo inusitado.

### Limite de tamanho

Prompt de frame: **máx. 1.500 caracteres**, mira 1.200–1.450. Corta adjetivos e decoração; preserva as decisões físicas (luz, lente, ângulo, stock, geometria).

---

## Video Models

### Seedance 2.0 (`seedance_2_0`) ← kinetic / high-energy scenes

| Param | Options | Default | Notes |
|-------|---------|---------|-------|
| `prompt` | text | — | Required |
| `aspect_ratio` | `auto` `16:9` `9:16` `4:3` `3:4` `1:1` `21:9` | `16:9` | |
| `duration` | integer | `5` | 4–15s supported |
| `resolution` | `480p` `720p` `1080p` | `720p` | |
| `genre` | `auto` `action` `horror` `comedy` `noir` `drama` `epic` | `auto` | Shapes cinematic feel — see Genre section below |
| `mode` | `std` `fast` | `std` | `fast` = quick preview; `std` = final quality |
| `medias` | array | — | `--start-image` sets first frame; `--image` for character/env refs |

---

### Kling 3.0 (`kling3_0`) ← contemplative / calm scenes

| Param | Options | Default | Notes |
|-------|---------|---------|-------|
| `prompt` | text | — | Required |
| `aspect_ratio` | `16:9` `9:16` `1:1` | `16:9` | More limited than Seedance |
| `duration` | integer | `5` | |
| `mode` | `std` `pro` | `std` | **`pro` = higher quality** (opposite naming to Seedance — pro is the upgrade, not fast) |
| `sound` | `on` `off` | `on` | **Can toggle sound generation on/off** |
| `medias` | array | — | `--start-image` and `--image` supported |

**Key difference from Seedance:** No `resolution` param, no `genre`. Mode is `std`/`pro` not `std`/`fast`. Use `--sound off` if you want a clean silent clip for custom audio layering.

---

## Register & model selection

Every scene is shot in one of two registers, and the register decides the model.

| Register | Feel | Cutting | Model |
|---|---|---|---|
| **Contemplative** *(default lean)* | Calm, contemplative, sensitive — few transitions, room to breathe | Small multi-shots: few cuts, or a single sustained take | **Kling 3.0** — better at calm, held imagery |
| **Kinetic** *(deliberate)* | High energy — speed, transitions, slow-motion, heavy movement | Many multi-shots, fast cuts | **Seedance 2.0** — carries the crazy, transition-heavy work |

**Contemplative is the default lean.** When a scene does not clearly call for energy, keep it calm — kinetic is a deliberate choice, never a reflex. Read the scene, pick the register, then the register picks the model.

- **Kling 3.0 prompts stay in English** — it is not a ByteDance model. Only Seedance prompts are delivered in Chinese (see *Delivery language*).
- Detailed toolkits below: *Contemplative register* and *Kinetic escalation toolkit*.

---

## Prompt workflow

### What Claude does
Claude is a **prompt writer**, not the image model. You give directorial shorthand; Claude turns it into structured prompts optimised for the chosen model. The director directs and ideates, Claude writes, the model shoots.

---

## Custom project context

For Claude to write prompts tuned to *your* project, point it at these files:

- `model-descriptions.md` — character identity and outfit specs
- `product-description.md` — hero product spec
- `env-descriptors.md` — environment text descriptors
- `ref-ids.md` — all uploaded image UUIDs and copy-paste ref stacks
- `HANDOFF.md` — project state, content-filter notes, batch history
- `seedance-prompt-framework.md` — this file

Without those files Claude writes generic prompts. With them, every prompt is locked to your project's characters, product, and visual world.

---

## You stay the director

Brief Claude the way you'd brief a DP — one paragraph of shorthand. Name the characters, beats, geography, sometimes a film reference. Claude expands that into the full structured prompt.

---

## The clarification pass

Before drafting, Claude should ask about anything ambiguous:

- **Duration** — how long? (Seedance 2 supports 4–15s)
- **Camera** — locked off, tracking, crane, handheld?
- **Sound design** — what physical sounds define this scene?
- **Start/end frame** — what does it open on, what does it end on?
- **Aspect ratio** — 16:9 editorial or 9:16 social?
- **Film reference** — any visual reference for energy or tone?

---

## Voice and sound design

Every character has a voice descriptor that holds across scenes. Sound design is always **physical and specific, never musical**, escalating with the action. This produces footage with excellent sound design but no music conflicts.

**Sound design principles:**
- Name the specific material (nylon anorak rustle, concrete grit underfoot, glass bottle click)
- Describe how it escalates through the clip
- Always end the prompt with: **No music.**

---

## Prompt structure for Seedance 2

```
[WHO] — subject description, outfit, defining physical detail (hair, silhouette)
[ACTION] — what they are doing, how it feels physically
[CAMERA] — start position, movement over time, end position
[ENVIRONMENT] — setting, time of day, atmospheric detail
[LIGHT] — sources, quality, colour, how it interacts with the subject
[SOUND] — specific physical sounds, escalation, no music
```

> The six blocks are your planning skeleton. The final Seedance prompt is delivered in Chinese — see *Delivery language* below.

---

## Ultra-realism — every genre

Even when the content is fantasy, sci-fi, or surreal, describe everything as if captured on real cameras, with real light and real physics. The model renders grounded footage far more convincingly than abstract description.

- **Justify the impossible physically.** Transformations and phenomena read as optical effects, plausible material behaviour, and illusions of light and perspective — never magic. A figure dissolving is "particles catching backlight as they scatter," not "it vanishes."
- **Name real glass.** Specify real focal lengths — 14mm, 24mm, 35mm, 50mm, 85mm, 135mm — and let the lens choice carry the framing logic.
- **Name real frame rates.** 24fps baseline, 48/96fps for controlled slow motion, 200–600fps for extreme high-speed detail. The number sets the texture of motion.
- **Name real light.** Motivated sources, practical fixtures, bounce, negative fill — describe light the way a gaffer rigs it.
- **Tactile material precision.** Describe how matter behaves: cold metal beading with condensation, fabric loading and snapping in wind, water pulling into trembling spheres in zero gravity. Texture is what sells realism.

---

## Verb register — physical over abstract

Name the physical event the camera actually sees, not the abstract label. This is the same physicality principle that drives the rest of the framework — concrete, visible action renders more reliably than abstract labels.

| Instead of | Reach for |
|---|---|
| attack, fight | impact, force, momentum, collision |
| destroy | shatter, fracture, disintegrate |
| explosion | eruption, detonation, burst |
| battle | confrontation, convergence |
| army | formation |
| soldiers | armoured figures |
| weapon, gun, sword | steel, a steel edge, a metal instrument |
| kill | final moment |
| war | conflict |

Keep action **stylised and bloodless** — choreography, weight, and aftermath read cleaner on screen than gore. Describe the dust, the debris arc, the recoil; not the wound.

---

## Delivery language — Chinese (Seedance only)

Seedance 2.0 is a ByteDance model and reads its native training distribution most reliably. **The final Seedance prompt is delivered in Chinese (中文)** — it is the primary version, not a translation of an English draft. Plan with the block structures; write the deliverable in Chinese.

This applies to **Seedance only**. Nano Banana 2 frame/image prompts stay in English.

### Technical-term glossary

Use precise Chinese cinematography vocabulary so the camera language survives:

| Term | 中文 |
|---|---|
| Steadicam | 斯坦尼康 |
| anamorphic widescreen | 变形宽银幕 |
| Dutch angle | 荷兰角 |
| over-the-shoulder | 过肩镜头 |
| bird's-eye | 鸟瞰 |
| push in / dolly in | 推镜 |
| pull back / dolly out | 拉镜 |
| pan | 摇镜 |
| tracking shot | 跟拍 |
| handheld | 手持 |
| high angle (looking down) | 俯拍 |
| low angle (looking up) | 仰拍 |
| close-up | 特写 |
| extreme close-up | 大特写 |
| wide / long shot | 远景 |
| high-frame-rate slow motion | 升格 |
| undercranked fast motion | 降格 |
| whip pan | 甩镜 |
| one continuous take | 一镜到底 |
| shallow depth of field | 浅景深 |

### Output format

```
### 🇨🇳 中文版本

**类型：** [genre]
**氛围/基调：** [mood — one line capturing the emotional essence]
**音效：** [overall sound-design description]

---

[Prompt body in Chinese — divided into scenes with timestamps, or one continuous block, depending on intensity. Each scene folds action, lens, angle, camera movement, frame rate, speed ramps and sound design into one flowing description — not separate bracketed labels.]
```

### Length

Compress the Chinese prompt body to **~4000 characters**, keeping full visual and narrative density. To compress: cut descriptive redundancy, merge sentences, drop non-essential adjectives — but always keep the technical specs (lenses, fps, angles, camera moves).

---

## Use Claude for variations

When a beat could go three ways, ask Claude for three versions of the same prompt with different tonal or staging choices, then run all three and compare.

**Variation axes to explore:**
- Camera distance (tight / mid / wide)
- Camera movement (static / tracking / pull-back / crane up)
- Time of action (start of movement / mid-action / aftermath)
- Sound emphasis (intimate close / building to wide)

---

## Media flags for Seedance 2

| Flag | Use |
|------|-----|
| `--start-image` | First frame — use the approved still from your image batch |
| `--image` | Character and (optionally) environment references — pass as many as needed under the 8-ref ceiling |

**Important:** Use generated in-environment shots of your character as `--image` refs, not clean studio shots. Studio backgrounds bleed into the environment mid-clip.

**Character sheet rule:** ALWAYS pass the character sheet UUID as a minimum `--image` ref on every Seedance generation. Non-negotiable for identity consistency.

Recommended ref stack per generation:
1. `--start-image` — approved still from the image batch (sets first frame)
2. `--image <char-sheet-uuid>` — character sheet (mandatory minimum)
3. `--image <outfit-sheet-uuid>` — outfit on white background
4. `--image <product-uuid>` — only if product is in the shot
5. `--image <env-ref-uuid>` — optional, prefer text descriptor

---

## Multi-shot prompts

Seedance 2 supports 5–6 hard cuts within a single generation via timestamp-keyed camera directions. Use this to pack a sequence of distinct shots into one clip.

**Structure:**

```
[VIDEO TYPE: Cinematic {{genre}}. {{X}}-second high-energy sequence.]

[CAMERA DIRECTION & ANGLE:
* 00:00 - 00:04: <shot description>
* 00:04 - 00:10: <shot description>
* 00:10 - 00:15: <shot description>]

[SUBJECT: <character description with outfit>]
[VISUAL ACTION: <per-beat action matching timestamps>]
[ENVIRONMENT: <setting>]
[COLOUR TONE: <colour direction>]
[LIGHTING AND MOOD: <light sources, quality>]
[VISUAL EFFECTS: <heat haze, dust, motion blur etc.>]
[SFX: <specific physical sounds per beat, escalating, no music>]
```

**Rules:**
- Timestamps must cover the full duration with no gaps
- Every second carries described action — no dead time without narrative intent
- Each camera beat must be meaningfully distinct (angle, distance, or movement)
- Sound design escalates beat-to-beat — never flat
- Always end with: **No music.**
- Use char sheet + outfit sheet as `--image` refs; `--start-image` for first-frame control

---

## Rhythm contrast (direction)

A film should not have a flat rhythm. When writing multi-shot prompts, **vary the cut density and camera type between blocks** — this contrast is what reads as real direction. Applies to short films, narrative, fashion, and advertising. Skip only if the user explicitly wants something flat / uniform.

Contrast tools:
- **Continuous take** — one long handheld shot, no cuts. Breathing room, intimacy, sustained tension.
- **Cut burst** — many fast cuts within a single sequence (up to ~10), for tension, energy, urgency.
- **Sustained single shot** — cut to one shot (e.g. the bedroom) and let the camera do the work: start wide, push in slowly, drift past objects, reveal gradually.

Alternate them: one beat dense with cuts, the next with none, then a single shot that breathes. Structure the film as waves of rhythm, not a straight line. In a long film, the contrast plays both between segments and within each one.

---

## Contemplative register

The default register — and the harder one to do well, because there are no tricks to hide behind. The camera holds, the cut waits, the image is allowed to breathe.

- **Held framing.** Static or barely-moving camera — a slow push or quiet drift at most. Let the subject move within the frame instead of chasing it.
- **Few cuts.** Small multi-shots — two or three shots, or a single sustained take. No cut bursts.
- **No flashy transitions.** Straight cuts only. No whip pans, no crash zooms, no speed ramps.
- **Sensitive light and texture.** Soft, motivated light; quiet detail — dust in a sunbeam, a breath, fabric settling. Stillness is what makes texture readable.
- **Let time pass.** A contemplative beat can rest on a single image; the action is small and human. This is not dead time — the intent lives in the restraint.

Shoot contemplative scenes on Kling 3.0 (see *Register & model selection*).

---

## Kinetic escalation toolkit

When the scene calls for it — and only when it fits the narrative — escalate the energy. Skip it for grounded, quiet, or slow material; forced kinetics on the wrong scene read as noise.

- **Cut velocity.** Accelerated pace, fast cuts, a frenetic editing rhythm that builds.
- **Aggressive camera.** Whip pans, crash zooms, 270° orbital moves, Dutch angles, bird's-eye dives, vertical whip tilts.
- **Speed ramps with intent.** Ramp deliberately — e.g. 400fps, snap to real-time, then 3× — so the speed change lands a beat instead of just decorating it.
- **Impossible angles.** The anime register: extreme low-angle, the camera threading a narrow gap, object-POV shots.
- **Fragment montage (碎片蒙太奇).** A burst of 5–8 cuts at 0.1–0.15s each, accelerating progressively.
- **Earn a turn.** Land an unexpected twist or transformation — a beat the viewer did not see coming.

---

## Genre flag

Seedance 2 supports `--genre` to shape the cinematic feel:

| Genre | Use for |
|-------|---------|
| `auto` | Default — model decides |
| `action` | High kinetic energy, fast cuts, physical intensity |
| `epic` | Grand scale, slow build, cinematic weight |
| `noir` | High contrast, moody, dramatic shadow |
| `drama` | Intimate, grounded, character-led |
| `horror` | Tension, dread, unsettling atmosphere |
| `comedy` | Light, bouncy, warm |

`action` and `epic` are workhorse defaults for product / fashion / brand films. `drama` is best for intimate close-ups but has triggered NSFW more often — if it fails, retry with `epic`.

---

## Mode: fast vs std

| Mode | Use for |
|------|---------|
| `--mode fast` | Quick preview during iteration — lower quality, much faster |
| `--mode std` | Final quality once the prompt is proven |

**Workflow:** Run `fast` first to validate camera movement, identity, and composition. Once those are right, run `std` for the deliverable. Saves significant time on failed directions.

### Draft the whole film cheap, then finalise high

This works at the film level, not just the shot. Build the *entire* film first at the cheapest setting, watch it back, and only once the film genuinely works — story, pacing, continuity — regenerate every scene at final quality. Most of a film's cost is otherwise burned on takes that get re-cut; drafting cheap means you only pay full rates for shots that survive to the final edit.

| Model | Draft (cheap) | Finalise (high) |
|---|---|---|
| Seedance 2.0 | `480p` `fast` | `1080p` `std` |
| Kling 3.0 | `std` | `pro` |

Do not finalise scene-by-scene as you go — wait until the whole draft film is approved, then regenerate in one finalising pass.

---

## Generate, evaluate, iterate

Run the prompt through the model multiple times before judging it. Watch what it gets **consistently** right and consistently wrong across takes. Patterns are signal, single failures are noise. Rewrite the prompt against the patterns and run again.

**Iteration checklist:**
- [ ] Is the camera movement reading as described?
- [ ] Is the character identity holding across the clip?
- [ ] Is the outfit correct and detailed?
- [ ] Is the environment consistent?
- [ ] Is the product (if any) on-model and on-shape?
- [ ] Is the sound design physical and specific (no music)?
- [ ] Does the energy match the reference?
