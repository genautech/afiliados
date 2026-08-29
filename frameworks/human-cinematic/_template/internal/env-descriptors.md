# Environment Text Descriptors

Text descriptions of each environment in your project. Use these as **inline prompt text** instead of passing the env image as a `--image` ref. This eliminates "ref bleeding" (where the ref image's composition leaks into the generated frame) while still giving the model precise environment guidance.

**Usage**: Drop the descriptor text directly into the `Scene:` section or any `CUT —` description in place of vague environment labels. Be specific about texture, light colour, atmospheric density, scale, and what light source dominates.

> Replace every `{{PLACEHOLDER}}` block with your own environment description. Add more `env-N` blocks as your project needs.

---

## env-1 — {{SHORT_LABEL — e.g. "Sunlit Loft Interior" / "Coastal Cliff at Dawn"}}

**UUID** *(if uploaded)*: `{{UUID}}`

**Text descriptor:**
> {{Write a single dense paragraph. Cover, in order:
> 1. Primary architecture / geography (what shapes the frame)
> 2. Surface texture and material (what things are made of)
> 3. Distance and scale (intimate / vast / oppressive / open)
> 4. Atmospheric quality (clear air / haze / mist / steam / dust)
> 5. Light source (where it comes from, hard or soft, direction)
> 6. Colour palette (warm amber / cold blue / neutral grey / saturated red)
> 7. Mood / emotional read (still / threatening / serene / chaotic).
>
> Example: "Sculpted concrete walls with rough board-form texture, rising in narrow parallel columns. Polished cast-stone floor reflecting cold ambient light. Scale is intimate but ceiling is high — light falls from a single skylight overhead. Air is still and clear, no haze. Colours are neutral grey-cream with a single warm reflection where late sun catches the floor. Reads as quiet, considered, almost reverent."}}

**Best for**: {{Which shot types this environment suits — e.g. "close character portraits, slow product reveals, contemplative beats"}}.

---

## env-2 — {{SHORT_LABEL}}

**UUID**: `{{UUID}}`

**Text descriptor:**
> {{descriptor paragraph following the same 7-point structure}}

**Best for**: {{shot types}}.

---

## env-3 — {{SHORT_LABEL}}

**UUID**: `{{UUID}}`

**Text descriptor:**
> {{...}}

**Best for**: {{...}}.

---

*(Continue with env-4, env-5, etc. — aim for 10–20 environments to cover your campaign. Mix wide / mid / close, and at least 2 colour palettes / times of day.)*

---

## Special notes on environment refs

When a specific env ref image causes problems (NSFW flags, consistent bleeding, broken physics), log it here so future runs avoid it:

| UUID | Filename | Problem | Recommended substitute |
|------|----------|---------|------------------------|
| `{{UUID}}` | {{env-X.png}} | {{e.g. triggers NSFW on duo prompts / bleeds studio background}} | {{env-Y safe alternative — or use the text descriptor only}} |

---

## How to Use Env Descriptors

Instead of:
```
--image {{ENV_UUID}}
```

Write into your prompt:
```
Scene: {{paste the descriptor text inline}}

CUT — wide low angle. {{action}}. The light is {{light note from descriptor}}, the air is {{atmosphere note}}.
```

**Advantages of text-only environment over image refs:**
- ✅ No ref bleeding — the model cannot anchor environment to ref-image composition
- ✅ More ref budget for character + product identity (full 4 model refs + 1 product = 5, well under the 8-ref ceiling)
- ✅ More specific lighting and atmosphere control
- ✅ Descriptors can be **combined** — mix two env descriptors in one prompt for a hybrid environment (e.g. "interior of env-1 transitioning into the colour palette of env-3")
