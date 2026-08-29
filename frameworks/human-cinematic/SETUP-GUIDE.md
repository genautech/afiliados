# Setup Guide — Universal AI Cinematic Automation

The step-by-step walkthrough for getting this system running from zero. Follow in order. Every step is a thing you do once per project.

---

## 1. Install the Higgsfield CLI

Three commands:

```bash
# 1. Global install
npm install -g @higgsfield/cli

# 2. OAuth login — authenticates Higgsfield AND wires Claude up to it
higgsfield auth login

# 3. Load Higgsfield's Claude skills (made by Higgsfield, pre-baked workflows)
higgsfield skills install
```

Confirm everything is alive:

```bash
higgsfield account status
```

---

## 2. Give Claude Code access to your project folder

Open this folder (`Universal AI Cinematic Automation/`) in Claude Code. The whole point of this setup is **structure + context**: Claude needs simultaneous access to all your references, images, and prompt-structure docs to write strong image and video prompts.

Everything Claude needs is already laid out in this folder — the `.md` files for prompt structure, the subfolders for reference images, and the placeholders for your own brand details.

---

## 3. Upload your reference images and capture UUIDs

For Claude to **use** an image (as a model identity ref, an outfit ref, a product ref, or an environment ref), the image has to be uploaded to **Higgsfield's media assets library**. Each uploaded image gets a **UUID** (Universally Unique Identifier) — a permanent reference Claude can pass into any future generation.

Tell Claude:

> "Upload all of my reference images and capture the UUIDs."

Claude will run `higgsfield upload create <file>` for each image in `model ref/`, `product ref/`, and `environment ref/`, then store the returned UUIDs.

### 3a. Log every UUID into `ref-ids.md`

Claude should populate [`ref-ids.md`](ref-ids.md) — that's the canonical list of every UUID, organised by model / product / environment. Without this file, future shots have nothing to point at.

### 3b. Create prompt logs for image and video

Claude should also maintain:
- [`prompt-log.md`](prompt-log.md) — every prompt fired, with the result. Image AND video. This is your accumulated prompt knowledge — what wording works, what doesn't.

### 3c. Convert each environment ref into a text descriptor

For every uploaded environment image, Claude should write a paragraph-form **text descriptor** in [`env-descriptors.md`](env-descriptors.md). This lets you **split-test**:

- Half your shots use the env image as a `--image` ref
- Half use the text descriptor inline in the prompt

Compare which gives cleaner output. (In our experience: text descriptors win — image refs cause "ref bleeding".)

### 3d. Create a failure log for video prompts

Claude should also create / maintain `seedance-failures.md` — a running log of every Seedance prompt that **failed**, with:
- The exact failure reason (NSFW / IP-detected / quality issue)
- The trigger phrase or ref
- The safe alternative that worked on retry

This compounds over time. After 20 shoots you have a personal content-filter map far better than anything publicly available. (A starter file is included.)

---

## 4. Understanding UUIDs (so you can verify Claude's work)

To inspect a UUID directly:

1. Open Higgsfield in your browser
2. Go to **Assets → Video**
3. Right-click any reference image
4. The UUID appears highlighted — it's a string like `b95c550b-b80a-4e2a-a3d1-1ea17f1cd31d`

Each UUID is unique to **your Higgsfield account**. You cannot share UUIDs with someone else — they'd have to upload the same images on their own account to get their own UUIDs.

---

## 5. What Claude is doing under the hood

Steps 3–4 in plain English: **Claude is taking your local images and converting them into UUIDs that Higgsfield can use as generation references.** The UUIDs themselves are the durable handles — once they're in `ref-ids.md`, you never re-upload.

---

## 6. UUIDs are account-specific

⚠️ The UUIDs in your `ref-ids.md` only work on **your** Higgsfield account. If you share this folder with a collaborator, they have to re-upload the images on their own account to get their own UUIDs. The text files (descriptions, prompt structures, env descriptors) port across accounts; the UUIDs do not.

---

## 7. Generating stills with Claude

Now Claude has the prompt structure AND the UUID references. It can build image prompts directly.

Set **bypass permissions** on the relevant tools so you're not approving every CLI call manually:

```bash
# Inside Claude Code, allow the higgsfield CLI globally:
/permissions add "Bash(higgsfield:*)"
```

Then prompt Claude in plain English — e.g. *"Generate 4 hero stills of Model 1 with the product in environment 3, 4:5 aspect."*

---

## 8. Set up an outputs folder with batched subfolders

Ask Claude:

> "Create an `outputs/` folder. When generating images, save them into separate sub-folders for each batch. Always specify: number of images, image model, aspect ratio. Be specific about what you want."

The convention this folder uses:

```
outputs/
├── batch-01-portraits/
├── batch-02-product-walk-in/
├── batch-03-environment-tests/
```

Always tell Claude: model (`nano_banana_2` for images), aspect ratio (`16:9` / `9:16` / `4:5`), and resolution (`1k` / `2k` / `4k`). Do not use another image model as the default image flow.

---

## 9. Set up a CSV shot tracker connected to Google Sheets

The shot tracker is how you give Claude **structured feedback** on every round of generations.

Tell Claude:

> "Use the `gws` CLI (Google Workspace CLI) and build me a shot tracker connected to Google Sheets, so I can record feedback on each round of generations."

Required columns:

| batch | shot | model | aspect | output_file | status | notes |
|-------|------|-------|--------|-------------|--------|-------|
| | | | | | **Approved / Needs iteration / Rejected** | |

(A tutorial link for connecting the `gws` CLI to Google Sheets can be dropped here once you settle on one — search "gws CLI Google Sheets" for current setup steps.)

The shot tracker is the **feedback loop**: every round of generations gets logged, statused, and noted. Claude reads the tracker before the next round and iterates against the rejected/needs-iteration entries.

---

## 10. Model + outfit consistency rule

If your model has a complicated outfit (lots of distinct detailing, brand-language, specific construction), include a **detail sheet** in `model ref/` — multiple snapshots of the outfit on white background.

Then tell Claude explicitly:

> "If you are using Model 1, you **must** include `[filename]` as a reference image on every video generation."

This is critical. Models drift. Hard-coding the ref-image requirement in the instruction prevents Claude from "forgetting" to attach the outfit sheet on a long-running session.

---

## 11. Generating video with Seedance 2.0

Now the system is loaded — characters, product, environments, prompt structure, content-filter map, and a feedback tracker.

Tell Claude:

> "Use Seedance 2.0 to create video of Model 1 with product X. Guide it with my ideas below, but also pitch me variations I might not have thought of. Plan it all out and send it to me first. Experiment with timecodes. Populate the shot tracker CSV. Iterate based on my direct feedback."

Direct phrases that work well:
- *"Plan it all out and send it to me"* — forces a written shot plan before any generation
- *"Experiment with timecodes"* — pushes Claude into multi-shot prompt structures (5–6 cuts in one 15s clip)
- *"Populate the CSV"* — every shot gets a row, every row gets a status

---

## 12. Document everything Claude generates

For every prompt Claude writes, it should:

1. Append the full prompt to [`prompt-log.md`](prompt-log.md) with a status (`✅ completed` / `⚠️ NSFW` / `⚠️ ip_detected` / `🔁 refire`)
2. Update the shot tracker CSV row
3. If it failed: append the reason + trigger phrase to `seedance-failures.md`

Over weeks of use, these three files become your single most valuable asset — they contain everything that works, everything that doesn't, and why.

---

## Summary — the 12-step loop

1. Install Higgsfield CLI (3 commands)
2. Open this folder in Claude Code
3. Upload refs → capture UUIDs → log in `ref-ids.md` → write env text descriptors → start failure log
4. Inspect UUIDs in Higgsfield Assets → Video to sanity-check
5. (Concept) Claude converts images → UUIDs
6. UUIDs are account-specific — don't share them
7. Generate stills with bypass permissions enabled
8. Outputs folder with batched sub-folders
9. CSV shot tracker connected to Google Sheets
10. Lock in outfit/model consistency rule with a hard reference requirement
11. Seedance 2.0 for video — plan first, experiment with timecodes, iterate
12. Document every prompt, every result, every failure
