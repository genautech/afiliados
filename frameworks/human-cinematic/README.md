# Universal AI Cinematic Automation — Setup Guide

A productised, brand-agnostic version of the cinematic automation workflow. Drop in your brand, characters, product, and environment references — Claude + Higgsfield handle the rest. Image stills use Nano Banana 2 (`nano_banana_2`).

This folder is a **template**. Every `.md` file has clearly marked `{{PLACEHOLDER}}` blocks. Replace them with your own details and you're ready to generate.

> **👉 COMECE POR AQUI: abra [`COMECE-AQUI.md`](COMECE-AQUI.md)** — o roteiro mestre em português. Você conversa, o Claude faz o trabalho técnico (instala o CLI, sobe as imagens, captura os UUIDs, gera os vídeos).
>
> `SETUP-GUIDE.md` continua disponível como referência detalhada em inglês.

---

## What this is

A repeatable system for producing **multi-shot cinematic ads, fashion editorials, brand films, and product narratives** with:

- Consistent characters across many shots
- Consistent product hero across many shots
- Product shots impossíveis with Visual Intent, iteration/inpainting, and final polish
- Consistent environment language across a campaign
- Auditable prompt log so you can learn what works
- Content-filter intelligence baked in (NSFW + IP trigger handling)

It is designed for the **Higgsfield CLI**. Image stills always use Nano Banana 2 (`nano_banana_2`). Video flows may use the video model defined by the project, but all image generation, product shots, frames and stills stay on Higgsfield CLI + Nano Banana 2.

---

## The files — what to edit

| File | What it holds | Edit priority |
|------|---------------|---------------|
| [`SETUP-GUIDE.md`](SETUP-GUIDE.md) | Step-by-step setup walkthrough — install, upload refs, generate, track | **READ FIRST** |
| [`PRODUCT-SHOTS.md`](PRODUCT-SHOTS.md) | Official `/product` mode for premium product shots: Visual Intent, generation/iteration/inpainting, final polish | **READ for product stills** |
| [`HANDOFF.md`](HANDOFF.md) | The single source of truth for your project: brand, models, product, refs, rules | **EDIT FIRST** |
| [`seedance-failures.md`](seedance-failures.md) | Running log of failed video prompts, triggers, and safe rewrites | Append as you go |
| [`model-descriptions.md`](model-descriptions.md) | Identity + outfit description for each character / model / talent | **EDIT** |
| [`product-description.md`](product-description.md) | Hero product description and ref UUIDs | **EDIT** |
| [`env-descriptors.md`](env-descriptors.md) | Text descriptors for each environment ref image | **EDIT per shoot** |
| [`ref-ids.md`](ref-ids.md) | All uploaded Higgsfield UUIDs and copy-paste-ready ref stacks | **FILL IN as you upload** |
| [`seedance-prompt-framework.md`](seedance-prompt-framework.md) | Tool-agnostic prompt framework (camera, sound, multi-shot, genre) | Read once — light edits |
| [`prompt-log.md`](prompt-log.md) | Running log of every prompt you fire, with results | Append-only |

Sub-folders:

| Folder | What goes in it |
|--------|----------------|
| `model ref/` | Character sheets, outfit detail shots, product-on-talent refs |
| `product ref/` | Clean white-background hero product shots, multi-angle product sheets |
| `environment ref/` | Location / atmosphere reference images |
| `outputs/` | Generated stills, video clips, batch folders, feedback CSVs |

---

## The placeholder system

Anywhere you see this format in any `.md` file, replace it:

```
{{BRAND_NAME}}              → e.g. "Acme x Outerwear Co"
{{PROJECT_NAME}}            → e.g. "Spring 26 Editorial"
{{PROJECT_TAGLINE}}         → one-line concept summary
{{PROJECT_SETTING}}         → where it's set (volcanic / urban / desert / underwater / studio)
{{HERO_PRODUCT}}            → the product the campaign sells
{{HERO_PRODUCT_DESCRIPTION}}→ material, colour, distinguishing details

{{MODEL_1_NAME}}            → internal label, e.g. "M1" or "Aiko"
{{MODEL_1_SUBJECT}}         → physical description (build, hair, face)
{{MODEL_1_OUTFIT}}          → garment description in full detail

{{MODEL_2_NAME}} / {{MODEL_2_SUBJECT}} / {{MODEL_2_OUTFIT}}  → second model, repeat as needed

{{HIGGSFIELD_ACCOUNT}}      → which Higgsfield account is active
{{OUTPUTS_PATH}}            → absolute path to your outputs folder
```

If your project doesn't need something (e.g. only one model, or no hero product) — just delete that block. The structure is modular.

---

## First-time setup checklist

1. **Duplicate this folder** and rename it to your project (e.g. `My Brand — Campaign Name/`).
2. **Open `HANDOFF.md`** and fill in every `{{PLACEHOLDER}}` block. This is your project brief.
3. **Write character descriptions** in `model-descriptions.md` — be precise about hair, build, distinguishing features, and full outfit specs.
4. **Write product description** in `product-description.md` — material, colour, silhouette, anything visually distinctive.
5. **Generate or source reference images:**
   - Character sheets (front-facing, neutral pose, clean background) for each model
   - Outfit / trainer / accessory detail sheets on white background
   - Hero product on white background — ideally multi-angle
   - 10–20 environment reference images that define your project's visual world
6. **Upload everything to Higgsfield:**
   ```bash
   higgsfield upload create model-1-char-sheet.png
   # → returns a UUID
   ```
7. **Paste each UUID into `ref-ids.md`** under the right section. Build out the copy-paste ref stacks at the bottom of the file.
8. **Write text descriptors for each environment image** in `env-descriptors.md` — this is what lets you drop the environment into the prompt without passing the env image as a ref (which causes "ref bleeding").
9. **Skim `seedance-prompt-framework.md`** — this is mostly tool-agnostic but contains all the prompt-structure rules.
10. **Fire your first generation** using the patterns in `HANDOFF.md` → "Standard Fire Function".

---

## The golden rules (read these once)

These are battle-tested from extensive use — they apply to any project.

1. **Use char sheet + outfit/product-on-white refs only.** Never pass styled editorial/detail shots as `--image` refs — Seedance will copy them as literal frames into the output. Detail shots are for *you* to look at, not for the model to ingest.
2. **8 refs = reliable ceiling** for Seedance 2.0. 10+ hard-fails.
3. **Drop environment as TEXT, not as image ref** wherever possible — env ref images bleed their backgrounds into your final shot. Use `env-descriptors.md` to keep environment language consistent across prompts without uploading env refs.
4. **Always write fire scripts to disk** (`bash /path/to/script.sh`) — don't inline `fire()` functions in single Bash calls; you'll hit "Too many positional args".
5. **Strip `@` from prompt files at submission time** with `sed 's/@//g'`. Keep `@label` syntax in the source files for readability; strip on the way to the CLI.
6. **`--prompt @filepath` expects JSON.** Don't use this pattern for plain text prompts — pipe the text in as a variable instead.
7. **Always use `2k` resolution on Nano Banana 2**, never `4k` unless explicitly requested. 4k can lose film grain and look plastic.
8. **Retry once before rewriting** on NSFW flags — some are transient. If it fails twice, the trigger is real and you need to rewrite.
9. **Content-filter awareness:** physical-contact verbs (`grabs`, `hauling`, `breathes in`) and brand-name camera/film stock (`Arri Alexa 65`, `Kodak Vision3`) trip filters. See the Content Filter Reference in `HANDOFF.md` for safe substitutes.
10. **Always end video prompts with `No music.`** — sound design should be physical and material-specific (nylon rustle, gravel crunch, breath), never musical.

---

## How Claude fits in

Claude is the **prompt writer and project manager**, not the image model. You direct the scene in shorthand ("M1 climbs the cliff at dusk, ends on his face at the summit"), Claude turns that into a fully structured multi-shot prompt with timestamps, sound design, lighting notes, and the correct ref stack. Image stills render with Nano Banana 2; video renders with the selected Higgsfield video model.

Claude uses these files as context:
- `HANDOFF.md` → project state and rules
- `model-descriptions.md` → who's in the shot
- `product-description.md` → what's being sold
- `env-descriptors.md` → where it happens
- `ref-ids.md` → the UUIDs to attach
- `seedance-prompt-framework.md` → the prompt structure to follow
- `prompt-log.md` → what's already been tried

---

## When you're stuck

- **Shot keeps failing NSFW**: see content-filter table in `HANDOFF.md`. Swap physical-contact verbs first, swap env ref second, swap genre third.
- **Model identity drifting between shots**: confirm char sheet UUID is in the ref stack. Drop detail/editorial refs entirely — they're the most common cause.
- **Environment bleeding from the studio background**: stop passing the studio still as a `--start-image`. Use a generated in-environment still instead, or text-only environment from `env-descriptors.md`.
- **Two models in a duo shot keep failing**: describe each model doing their *own* thing rather than describing contact between them. Keep them spatially separate in the prompt language.
