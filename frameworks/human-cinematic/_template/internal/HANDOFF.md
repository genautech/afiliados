# {{PROJECT_NAME}} — Handoff Document

> **TEMPLATE NOTE**: This is your project's single source of truth. Replace every `{{PLACEHOLDER}}` block. Sections marked OPTIONAL can be deleted if not relevant to your project.

---

## Project Overview

**Project**: {{PROJECT_NAME}}
**Brand / collaboration**: {{BRAND_NAME}}
**Concept (one line)**: {{PROJECT_TAGLINE}}
**Setting / world**: {{PROJECT_SETTING}}
**Models / talent**: {{NUMBER_OF_MODELS}} ({{MODEL_1_NAME}}{{, MODEL_2_NAME, etc}})
**Hero product**: {{HERO_PRODUCT}} — {{HERO_PRODUCT_DESCRIPTION}}

---

## Higgsfield Account

- **Active account**: {{HIGGSFIELD_ACCOUNT_EMAIL}} ({{CREDITS_REMAINING}} credits)
- **CLI**: `higgsfield` — authenticated, use `higgsfield account status` to confirm
- **Known account-level issues**: {{ANY_MODEL_RESTRICTIONS_ON_THIS_ACCOUNT — if `nano_banana_2` fails, pause and fix login/account/model access instead of switching image model}}

---

## Models / Talent

### {{MODEL_1_NAME}}
{{MODEL_1_SUBJECT}}

**Outfit**: {{MODEL_1_OUTFIT}}

### {{MODEL_2_NAME}}  *(delete if single-model)*
{{MODEL_2_SUBJECT}}

**Outfit**: {{MODEL_2_OUTFIT}}

*(Add MODEL_3, MODEL_4 etc. as needed — same structure)*

---

## Reference Image UUIDs

> Fill these in as you upload via `higgsfield upload create <file>`. Keep this table in sync with `ref-ids.md`.

### {{MODEL_1_NAME}}
| File | UUID |
|------|------|
| {{model-1-char-sheet.png}} | `{{UUID}}` |
| {{model-1-outfit-sheet.png}} | `{{UUID}}` |
| {{model-1-detail.png — DO NOT USE AS REF, view-only}} | `{{UUID}}` |

### {{MODEL_2_NAME}}
| File | UUID |
|------|------|
| {{model-2-char-sheet.png}} | `{{UUID}}` |
| {{model-2-outfit-sheet.png}} | `{{UUID}}` |

### Hero Product
| File | UUID |
|------|------|
| {{product-hero.png}} | `{{UUID}}` |
| {{product-sheet-multi-angle.png}} | `{{UUID}}` |

### Environment Refs *(optional — prefer text descriptors in `env-descriptors.md`)*
| File | UUID | Notes |
|------|------|-------|
| {{env-1.png}} | `{{UUID}}` | {{location / time of day}} |

---

## Ref Stacks (copy-paste ready)

> ⚠️ **RULE: use ONLY clean character + outfit/product sheets on white background as `--image` refs. Never pass styled editorial / detail shots.**
> Detail shots leak as literal frames into the generated output. Correct refs per character: **char sheet** (identity) + **outfit/garment sheet** on white background.

### Single model — {{MODEL_1_NAME}}, no product (char + outfit = 2 refs)
```
--image {{M1_CHAR_UUID}} --image {{M1_OUTFIT_UUID}}
```

### Single model — {{MODEL_1_NAME}}, with product (3 refs)
```
--image {{M1_CHAR_UUID}} --image {{M1_OUTFIT_UUID}} --image {{PRODUCT_UUID}}
```

### Single model — {{MODEL_2_NAME}}, no product (2 refs)
```
--image {{M2_CHAR_UUID}} --image {{M2_OUTFIT_UUID}}
```

### Duo — no product (4 refs)
```
--image {{M1_CHAR_UUID}} --image {{M1_OUTFIT_UUID}} --image {{M2_CHAR_UUID}} --image {{M2_OUTFIT_UUID}}
```

### Duo — with product (5 refs)
```
--image {{M1_CHAR_UUID}} --image {{M1_OUTFIT_UUID}} --image {{M2_CHAR_UUID}} --image {{M2_OUTFIT_UUID}} --image {{PRODUCT_UUID}}
```

**DO NOT USE as refs** — list any styled/editorial detail images here so future runs avoid them:
- {{detail-1.png}} `{{UUID}}` — editorial, causes frame bleed
- {{detail-2.png}} `{{UUID}}` — editorial, causes frame bleed

---

## Standard Fire Function — geração em FILA (paralela)

Nunca dispare um job, espere, e só então dispare o próximo. Submeta o batch inteiro
primeiro (sem `--wait` — volta na hora com um job_id), depois colete. Os jobs
renderizam em paralelo no servidor do Higgsfield. Sempre escreva isto em disco e rode com `bash`.

```bash
#!/usr/bin/env bash
set -u  # NOT -e — grep || true relies on this

OUT="{{CAMPAIGN_PATH}}/output"
LOG="{{CAMPAIGN_PATH}}/internal/logs"
mkdir -p "$OUT" "$LOG"

UUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
declare -a JOB_IDS JOB_NAMES

# --- FASE 1: submeter todos os jobs (rápido, sem --wait) ---
submit() {
  local NAME="$1" MODEL="$2" REFS="$3" PFILE="$4"; shift 4   # resto = flags do modelo
  local PROMPT JID
  PROMPT=$(sed 's/@//g' "$PFILE")   # strip @ from structured prompts
  JID=$(higgsfield generate create "$MODEL" --prompt "$PROMPT" $REFS "$@" --json 2>&1 \
        | grep -oiE "$UUID" | head -1)
  echo "SUBMETIDO: $NAME -> ${JID:-FALHA}"
  JOB_IDS+=("$JID"); JOB_NAMES+=("$NAME")
}

# Uma chamada submit por job — todas disparam quase juntas:
# submit "03-walk-in"   seedance_2_0 "--image UUID1 --image UUID2" p1.txt \
#        --duration 15 --resolution 1080p --aspect_ratio 16:9 --genre epic --mode std
# submit "04-close-face" seedance_2_0 "--image UUID1 --image UUID2" p2.txt \
#        --duration 15 --resolution 1080p --aspect_ratio 16:9 --genre epic --mode std

# --- FASE 2: coletar resultados conforme ficam prontos ---
for i in "${!JOB_IDS[@]}"; do
  NAME="${JOB_NAMES[$i]}"; JID="${JOB_IDS[$i]}"
  [ -z "$JID" ] && { echo "FALHOU NA SUBMISSAO: $NAME"; continue; }
  higgsfield generate wait "$JID" --wait-timeout 30m --json > "$LOG/$NAME.json" 2>&1
  URL=$(grep -oE 'https://[^ "]+\.(mp4|png|jpg|jpeg)' "$LOG/$NAME.json" | head -1 || true)
  if [ -n "$URL" ]; then
    curl -s "$URL" -o "$OUT/$NAME.${URL##*.}" && echo "PRONTO: $NAME"
  else
    echo "FALHOU: $NAME"; tail -5 "$LOG/$NAME.json"
  fi
done

# Allowed --genre values: auto, action, horror, comedy, noir, drama, epic
# Allowed --mode values: std, fast (NOT cinematic)
# Nota: confirmar no 1º disparo real o formato do --json (campo do job_id e da URL).
```

---

## Film Assembly (FFmpeg) — montar filme longo a partir de segmentos de 15s

Os segmentos vivem em `internal/segments/seg-1.mp4 … seg-N.mp4` (ordem = time code da narrativa).
O filme final montado vai para `output/` numerado. Escreva em disco e rode com `bash`.

```bash
#!/usr/bin/env bash
set -u
SEG="{{CAMPAIGN_PATH}}/internal/segments"
OUT="{{CAMPAIGN_PATH}}/output"
FILM="$OUT/{{NN}}-filme-final.mp4"

# --- Montagem: concat com re-encode (uniformiza codec/fps/áudio, evita glitches) ---
: > "$SEG/list.txt"
for f in "$SEG"/seg-*.mp4; do echo "file '$f'" >> "$SEG/list.txt"; done
ffmpeg -y -f concat -safe 0 -i "$SEG/list.txt" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart "$FILM"

# --- QC: passada de checagem no filme montado ---
echo "== duração + streams =="
ffprobe -v error -show_entries format=duration:stream=codec_type,nb_frames -of default=nw=1 "$FILM"
echo "== frames pretos =="
ffmpeg -hide_banner -i "$FILM" -vf blackdetect=d=0.1 -an -f null - 2>&1 | grep -i black || echo "ok"
echo "== frame congelado / duplicado =="
ffmpeg -hide_banner -i "$FILM" -vf freezedetect=n=-60dB:d=0.5 -an -f null - 2>&1 | grep -i freeze || echo "ok"
echo "== silêncio / falha de áudio =="
ffmpeg -hide_banner -i "$FILM" -af silencedetect=n=-50dB:d=0.5 -vn -f null - 2>&1 | grep -i silence || echo "ok"
```

Se o QC apontar problema numa junção, re-encode só o segmento suspeito e monte de novo.

---

## Key Technical Rules

1. **Always write scripts to disk** and run with `bash /path/script.sh` — never define `fire()` inline in a Bash tool call (causes "Too many positional args").
2. **`grep ... || true`** — always append `|| true` to grep in scripts with `set -e`, or omit `set -e`.
3. **8 refs = reliable ceiling** for Seedance 2.0. 10+ refs hard-fails.
4. **`@label` syntax in prompts**: strip with `sed 's/@//g'` at submission — the CLI interprets `@word` as a file-read instruction. Keep `@` in prompt files for readability; strip only when firing.
5. **`--prompt @filepath`** expects JSON — do not use this pattern for plain-text prompts.
6. **`--video` flag** does not work reliably. For video extensions, extract a frame at ~13s and use it as `--start-image`:
   ```bash
   ffmpeg -ss 13 -i source.mp4 -vframes 1 -update 1 frame.png
   higgsfield upload create frame.png   # → UUID
   # then use --start-image <UUID> with "Continue this video..." prompt
   ```
7. **Ref bleeding**: Seedance treats refs as compositional anchors, not just identity guides. Backgrounds in your ref images bleed into the generated environment. Fix: use lean refs (char sheet + 1 outfit shot only) and let the prompt drive the environment.
8. **Nano Banana resolution**: always use `--resolution 2k`. `4k` looks plastic and loses film grain.

---

## Content Filter Reference

### Status types
| Status | Meaning |
|--------|---------|
| `nsfw` | Content safety filter triggered — prompt or ref image flagged |
| `ip_detected` | Brand / product / camera-model name detected in prompt text |

### Known `nsfw` triggers and fixes

| Trigger phrase / element | Why it flags | Safe alternative |
|--------------------------|--------------|-----------------|
| `"breathes in"` near steam / fog / vapour | Reads as drug inhalation | `"stands still in the mist"` / `"holds"` |
| `"grabs his forearm"` / `"grabs forearm"` | Physical contact flagged as assault | `"extends his arm back"` — other model `"takes it"` |
| `"hauling themselves over"` | Physical-struggle language | `"reaching the top"` |
| `"hauling upward"` in a climbing context | Same as above | `"driving upward"` / `"pulling himself over the ledge"` |
| Two models in close physical proximity (duo shots) | Contact/proximity detection | Describe each model moving independently, not in contact |
| Specific env ref images | Sometimes an individual ref image trips NSFW in combination with certain prompts | Log the UUID below and swap for a safe alternative |

### Known `ip_detected` triggers and fixes

| Trigger | Why it flags | Safe alternative |
|---------|--------------|-----------------|
| `"Arri Alexa 65"` in prompt text | Camera brand name | `"large-format cinema camera"` |
| `"Kodak Vision3 500T"` | Film stock brand | `"cinematic film stock"` / `"fine grain film"` |
| `"Ilford HP5"` | Film stock brand | `"black and white film grain"` |
| Brand names in outfit descriptions | Usually fine when passed as ref labels (`@m1_outfit`) — the brand context is costume/fashion. Monitor if flagging. | If flagging: describe the design without the brand name |

### Project-specific flagged refs *(log as you discover them)*
| UUID | Filename | Reason | Safe alternative |
|------|----------|--------|-----------------|
| `{{UUID}}` | {{env-X.png}} | {{flagged on prompts with...}} | {{use env-Y instead}} |

### General rules
- **Retry once before rewriting** — some NSFW flags are transient. If a prompt fails twice unchanged, the trigger is real.
- **Isolate the variable** — if a shot fails after working prompts have passed, change one thing at a time: swap env ref first, then rewrite suspect phrases, then change genre.
- **Duo shots are higher risk** — keep the two characters' actions clearly separated in the prompt.
- **Genre matters** — `drama` has triggered NSFW more than `epic` or `action` on atmospheric/intimate shots. If drama fails, retry with epic.
- **Env refs can carry flags** — treat new env refs as untested until at least one generation passes.

---

## Prompt Structure (structured format — recommended)

```
@{{model_1_label}}_charsheet - Character ref. {{physical description}}. Character only.
@{{model_1_label}}_outfit - Detail ref. {{outfit description}}. Character and outfit only.
@{{product_label}} - Product ref. {{HERO_PRODUCT}}. {{product description}}. Product only.

Scene: {{scene-setup paragraph — where, when, what's happening}}

CUT — {{camera angle}}. {{action description}}. {{lighting note}}.
CUT — {{camera angle}}. {{action description}}.
CUT — {{camera angle}}. {{action description}}.
CUT — {{camera angle}}. {{action description}}.
CUT — {{camera angle}}. {{action description}}.

8K cinematic. {{lens / camera language — generic, not brand names}}. {{colour / light note}}. Film grain.
```

---

## Ad Shot Structure *(reference pattern — adjust per project)*

Each 15s ad in our reference workflow follows: **wide walk-in → close face or feet → medium "draw the product" → close product in hands → close application / interaction with product**

This is a solid default for any product-led shot. Tune for your campaign:
- **Fashion editorial**: wide silhouette → close fabric texture → medium hero pose → close face → wide silhouette
- **Sneaker drop**: close trainer detail → medium full-body → wide environment → close lace/sole → medium step / impact
- **Skincare / beauty**: wide environment → medium hero → close product in hand → extreme close application → close face / reaction

---

## Batch History & Output Locations

All outputs: `{{OUTPUTS_PATH}}/`

| Batch | Description | Status |
|-------|-------------|--------|
| batch-01-{{descriptor}} | {{what this batch is testing or shipping}} | {{Done / In progress / Superseded}} |

---

## Outstanding / Next Steps

1. {{Next thing to do}}
2. {{Asset gap or thing waiting on you}}
3. {{Refire / re-test plan}}

---

## Files Reference

- `{{ABS_PATH}}/ref-ids.md` — all UUIDs, ref stacks
- `{{ABS_PATH}}/model-descriptions.md` — character + outfit specs
- `{{ABS_PATH}}/product-description.md` — hero product spec
- `{{ABS_PATH}}/env-descriptors.md` — environment text descriptors
- `{{ABS_PATH}}/seedance-prompt-framework.md` — prompt structure / model params
- `{{ABS_PATH}}/prompt-log.md` — every prompt fired, with status
- `{{ABS_PATH}}/outputs/` — all generated stills + clips
- `{{ABS_PATH}}/HANDOFF.md` — this file
