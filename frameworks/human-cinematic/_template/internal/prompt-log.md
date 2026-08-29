# Prompt Log — {{PROJECT_NAME}}

Append-only running log of every prompt fired, with results. Use this to identify which prompt patterns produce the best results and which trip content filters.

**Why keep this:** prompts that work are gold. Prompts that fail with NSFW or IP flags are equally valuable — they teach you what to avoid. Over a long campaign this file becomes your most important asset.

---

## Entry format

Every entry should follow this template. Copy-paste, fill in, append.

```
### {{shot-id-or-slug}}
**Batch:** batch-{{NN}}-{{descriptor}} | **Models:** {{M1, M2, duo}} | **Genre:** {{action/epic/etc}} | **Status:** {{✅ completed / ⚠️ NSFW / ⚠️ ip_detected / 🔁 refire-needed}}

**Refs:** {{which char + outfit + product UUIDs were passed}}

**Prompt:**

\`\`\`
{{full prompt text — keep @labels intact for readability}}
\`\`\`

**Result:**
- Output: {{filename.mp4 or URL}}
- Reads as: {{what came back — camera movement, identity hold, environment accuracy}}
- Notes: {{what worked / what didn't / what to change on the next iteration}}

---
```

---

## Batches

*(Add `## Batch NN — {{descriptor}}` headers as you ship batches. Entries go under their batch.)*

## Batch 01 — {{descriptor}}

*(first entry goes here using the template above)*
