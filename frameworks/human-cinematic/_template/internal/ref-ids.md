# Reference Image UUIDs

> The authoritative list of every uploaded reference image and its Higgsfield UUID. Keep in sync with `HANDOFF.md`. As you upload new refs (`higgsfield upload create <file>`), paste the returned UUID here under the right section.

---

## Account: {{HIGGSFIELD_ACCOUNT_EMAIL}} ({{CREDITS_REMAINING}} credits)

### {{MODEL_1_NAME}}
| File | UUID | Notes |
|------|------|-------|
| {{model-1-char-sheet.png}} | `{{UUID}}` | Primary identity ref — use on every shot |
| {{model-1-outfit-sheet.png}} | `{{UUID}}` | Outfit on white bg — use on every shot |
| {{model-1-detail.png}} | `{{UUID}}` | ⚠️ View-only — do NOT pass as ref |
| {{model-1-detail-2.png}} | `{{UUID}}` | ⚠️ View-only |

### {{MODEL_2_NAME}}
| File | UUID | Notes |
|------|------|-------|
| {{model-2-char-sheet.png}} | `{{UUID}}` | Primary identity ref |
| {{model-2-outfit-sheet.png}} | `{{UUID}}` | Outfit on white bg |
| {{model-2-detail.png}} | `{{UUID}}` | ⚠️ View-only |

### Hero Product
| File | UUID | Notes |
|------|------|-------|
| {{product-hero.png}} | `{{UUID}}` | Single clean shot, white bg |
| {{product-sheet-multi-angle.png}} | `{{UUID}}` | Multi-angle on white bg — strongest product ref |

### Environment Refs *(optional — prefer text descriptors in `env-descriptors.md`)*
| File | UUID | Best for |
|------|------|----------|
| {{env-1.png}} | `{{UUID}}` | {{shot types}} |
| {{env-2.png}} | `{{UUID}}` | {{shot types}} |

---

## Ref Stacks (copy-paste ready)

> ⚠️ **RULE: char sheet + outfit sheet on white background ONLY. Never use styled / editorial / lifestyle images as refs.**
> Styled refs cause Seedance to copy them as literal frames into the generated video.

### {{MODEL_1_NAME}} — no product (char + outfit = 2 refs)
```
--image {{M1_CHAR_UUID}} --image {{M1_OUTFIT_UUID}}
```

### {{MODEL_2_NAME}} — no product (2 refs)
```
--image {{M2_CHAR_UUID}} --image {{M2_OUTFIT_UUID}}
```

### {{MODEL_1_NAME}} — with product (3 refs)
```
--image {{M1_CHAR_UUID}} --image {{M1_OUTFIT_UUID}} --image {{PRODUCT_UUID}}
```

### {{MODEL_2_NAME}} — with product (3 refs)
```
--image {{M2_CHAR_UUID}} --image {{M2_OUTFIT_UUID}} --image {{PRODUCT_UUID}}
```

### Duo — no product (4 refs)
```
--image {{M1_CHAR_UUID}} --image {{M1_OUTFIT_UUID}} --image {{M2_CHAR_UUID}} --image {{M2_OUTFIT_UUID}}
```

### Duo — with product (5 refs)
```
--image {{M1_CHAR_UUID}} --image {{M1_OUTFIT_UUID}} --image {{M2_CHAR_UUID}} --image {{M2_OUTFIT_UUID}} --image {{PRODUCT_UUID}}
```

### Duo — with product + env (6 refs — use sparingly, prefer text env)
```
--image {{M1_CHAR_UUID}} --image {{M1_OUTFIT_UUID}} --image {{M2_CHAR_UUID}} --image {{M2_OUTFIT_UUID}} --image {{PRODUCT_UUID}} --image {{ENV_UUID}}
```

**Hard ceiling: 8 refs.** 10+ causes hard failures on Seedance 2.0.

---

**DO NOT USE as refs** *(log every styled/editorial image here as you discover it causes bleed)*:
- `{{UUID}}` {{filename}} — editorial / styled
- `{{UUID}}` {{filename}} — flagged NSFW in combination

---

## Uploading new refs

```bash
higgsfield upload create /path/to/image.png
# Output includes a UUID line — paste it into the table above immediately.
```

To list previously uploaded refs:
```bash
higgsfield upload list
```
