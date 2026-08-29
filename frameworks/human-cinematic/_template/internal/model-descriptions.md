# Model / Character Descriptions

> Always include the model's text description alongside their reference image UUIDs in any prompt. The text reinforces what the ref images encode and keeps identity consistent across shots.
>
> Replace every `{{PLACEHOLDER}}` block. Add additional models by duplicating the block.

---

## {{MODEL_1_NAME}}

**Subject:**
[SUBJECT FOCUS: {{MODEL_1_SUBJECT — e.g. lanky male model with shoulder-length shaggy dark curls, high cheekbones, distinct nose / or: East Asian female model, sharp bob, athletic build, freckled / or: middle-aged male, salt-and-pepper beard, sturdy frame}}.]

**Outfit:**
[OUTFIT: {{MODEL_1_OUTFIT — write the full garment description: silhouette, materials, colours, brand-language detailing if applicable, distinguishing features. The more specific you are about texture and structure, the more consistent the output. e.g. "an oversized structural hybrid parka with architectural micro-pleating, origami-folded pleated sleeves, gold trefoil embroidery on both arms, baroque floral embroidery and red-green webbing detail. Black pleated silk trousers. White and gold biomorphic pleated trainers with floral detail."}}.]

**Voice descriptor** *(optional — for sound-design prompts)*: {{e.g. "low, measured, breathy on exertion" / "high, light, quick-spoken"}}.

**Image refs:**
- {{model-1-char-sheet.png}} → `{{UUID}}` — **PRIMARY identity ref. Use on every shot.**
- {{model-1-outfit-sheet.png}} → `{{UUID}}` — **Outfit on white background. Use on every shot.**
- {{model-1-detail.png}} → `{{UUID}}` — ⚠️ View-only. DO NOT pass as `--image` ref.
- {{model-1-detail-2.png}} → `{{UUID}}` — ⚠️ View-only.

---

## {{MODEL_2_NAME}}  *(duplicate or delete as needed)*

**Subject:**
[SUBJECT FOCUS: {{MODEL_2_SUBJECT}}.]

**Outfit:**
[OUTFIT: {{MODEL_2_OUTFIT}}.]

**Voice descriptor**: {{voice}}.

**Image refs:**
- {{model-2-char-sheet.png}} → `{{UUID}}`
- {{model-2-outfit-sheet.png}} → `{{UUID}}`
- {{model-2-detail.png}} → `{{UUID}}` — ⚠️ View-only.

---

## Notes on writing strong character descriptions

- **Be specific about hair**: length, texture, colour, parted/unparted, wet/dry.
- **Be specific about face**: distinguishing nose, jaw, cheekbones, eye colour if visible.
- **Be specific about build**: lanky, sturdy, athletic, slight. Avoid vague terms like "average".
- **Outfit**: name every distinct element. Material (matte / iridescent / silk / nylon), silhouette (oversized / fitted / cropped), distinguishing detail (embroidery, hardware, logos, panelling).
- **Avoid copyrighted character names** in prompts. If your project references a specific person, describe them physically rather than naming them.
- **Brand names in outfit context**: usually safe when scoped to the garment description (`@m1_outfit - ... gold adidas trefoil embroidery ...`). Monitor for `ip_detected` flags — if you hit them, describe the design generically (`gold triangular emblem` instead of `adidas trefoil`).
