# Hero Product Description

> Replace every `{{PLACEHOLDER}}` block. If your project has no hero product (e.g. pure fashion editorial), delete this file or leave it blank.

---

## {{HERO_PRODUCT}}

**Category**: {{e.g. fragrance / sneaker / handbag / watch / serum / drink}}.

**Description:**
[PRODUCT: {{HERO_PRODUCT_DESCRIPTION — every visually distinctive detail. Material (matte / glossy / iridescent / brushed metal), colour (exact: matte black, warm cream, deep oxblood), silhouette / shape (faceted / cylindrical / sculpted / minimal slab), distinguishing features (cap, stopper, hardware, logo placement, embossing, texture).}}].

**Hold patterns** *(how characters interact with it on camera)*:
- {{e.g. "drawn from inside jacket — single-hand grip on bottle body" / "balanced in open palm, label facing camera" / "thumb on cap, twisting open in close-up"}}.

**Application / use patterns** *(if a usage shot is needed)*:
- {{e.g. "spray on wrist, then inner forearm" / "step into shoe, lace pull at ankle" / "single pump onto fingertip, smoothed across cheekbone"}}.

---

## Image refs

| File | UUID | Notes |
|------|------|-------|
| {{product-hero.png}} | `{{UUID}}` | Single clean shot, white background. Primary product ref. |
| {{product-sheet-multi-angle.png}} | `{{UUID}}` | Multi-angle layout, white background. **Best ref — most consistent across shots.** |
| {{product-lifestyle.png}} | `{{UUID}}` | ⚠️ Lifestyle / styled shot — DO NOT use as ref, causes background bleed. |

---

## Notes on writing strong product descriptions

- **Always describe on a white / clean background** in your refs. Lifestyle/styled product shots bleed their backgrounds into your generated environment.
- **Multi-angle product sheets** are the strongest single ref — they show the model the product from multiple angles in one image, which dramatically improves shape consistency.
- **Don't rely on the brand name** to convey shape — describe the shape independently. "Faceted matte black bottle with a rough volcanic-rock stopper" is far stronger than "Odyssey bottle".
- **Application / hold language matters**: if you want the product in-hand consistently, name the *hold* in the prompt (`drawn from inside jacket`, `balanced in open palm`).
