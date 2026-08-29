#!/usr/bin/env python3
"""Deriva tokens.json + tokens.css a partir do preset do produto e do tipo de e-book.

Os presets vivem em brandkit/brand-visual.md (seção 2). Este script lê
o DNA, não guarda cópia da paleta — se o DNA mudar, a saída muda junto.
"""
import argparse
import json
import re
import sys
import os
from pathlib import Path

# Raiz do repo AfiliAds: .claude/skills/<skill>/scripts/este-arquivo.py
RAIZ = Path(__file__).resolve().parents[4]
BRANDKIT = Path(os.environ.get("AFILIADS_BRANDKIT", RAIZ / "brandkit"))
DNA = BRANDKIT / "brand-visual.md"

COVER_PATTERN = {
    "guia-pratico": "poster",
    "metodo": "stripe",
    "checklist": "minimal",
    "dossie": "fullbleed",
    "historia": "magazine",
    "workbook": "frame",
    "defesa-pessoal": "fullbleed",
}

SCALE = {"cover_title": 96, "h1": 40, "h2": 28, "h3": 21, "body": 17, "caption": 13}


def parse_dna(text):
    """Extrai base, rampas, fontes e forma da seção 2 do DNA."""
    base = dict(re.findall(r"\|\s*`--(color-[a-z0-9-]+)`\s*\|\s*`([^`]+)`", text))
    ramps = {}
    for name, values in re.findall(
        r"`--color-([a-z0-9-]*?)-?100…900`:((?:\s*`#[0-9a-f]{6}`)+)", text
    ):
        ramps[name or "neutral"] = re.findall(r"#[0-9a-f]{6}", values)
    fonts = dict(re.findall(r"\|\s*`--font-([a-z]+)`\s*\|\s*`\"?([A-Za-z]+)", text))
    shape = dict(re.findall(r"\|\s*`--(radius-[a-z]+|shadow-[a-z]+)`\s*\|\s*`([^`]+)`", text))
    return base, ramps, fonts, shape


def preset_exists(text, preset):
    return bool(re.search(rf"^\|\s*`{re.escape(preset)}`\s*\|", text, re.M))


def build(preset, tipo, text):
    base, ramps, fonts, shape = parse_dna(text)
    return {
        "preset": preset,
        "tipo": tipo,
        "cover_pattern": COVER_PATTERN.get(tipo, "fullbleed"),
        "color": {
            "bg": base.get("color-bg"),
            "surface": base.get("color-surface"),
            "text": base.get("color-text"),
            "accent": base.get("color-accent"),
            "accent2": base.get("color-accent-2"),
            "divider": base.get("color-divider"),
        },
        "ramps": ramps,
        "font": {"heading": fonts.get("heading"), "body": fonts.get("body")},
        "scale": SCALE,
        "radius": {k.split("-")[1]: v for k, v in shape.items() if k.startswith("radius")},
        "shadow": {k.split("-")[1]: v for k, v in shape.items() if k.startswith("shadow")},
    }


def to_css(t):
    lines = [":root {"]
    for k, v in t["color"].items():
        if v:
            # o HTML existente usa --color-accent-2, não --color-accent2
            lines.append(f"  --color-{'accent-2' if k == 'accent2' else k}: {v};")
    for name, values in t["ramps"].items():
        prefix = "neutral" if name == "neutral" else name
        for i, hexv in enumerate(values):
            lines.append(f"  --color-{prefix}-{(i + 1) * 100}: {hexv};")
    for k, v in t["font"].items():
        if v:
            lines.append(f'  --font-{k}: "{v}", system-ui, sans-serif;')
    for k, v in t["radius"].items():
        lines.append(f"  --radius-{k}: {v};")
    for k, v in t["shadow"].items():
        lines.append(f"  --shadow-{k}: {v};")
    lines.append("}")
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preset", required=True)
    ap.add_argument("--tipo", required=True, choices=sorted(COVER_PATTERN))
    ap.add_argument("--out", required=True, help="caminho do tokens.json")
    ap.add_argument("--dna", default=str(DNA))
    args = ap.parse_args()

    dna_path = Path(args.dna)
    if not dna_path.exists():
        sys.exit(f"DNA não encontrado em {dna_path} — não é possível derivar tokens.")
    text = dna_path.read_text(encoding="utf-8")

    if not preset_exists(text, args.preset):
        sys.exit(
            f"Preset '{args.preset}' não está declarado na seção 5 do DNA. "
            "Declare o preset antes de gerar tokens — não invente paleta."
        )

    tokens = build(args.preset, args.tipo, text)
    faltando = [k for k, v in tokens["color"].items() if not v]
    if faltando:
        sys.exit(f"Tokens de cor ausentes no DNA: {', '.join(faltando)}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(tokens, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    out.with_suffix(".css").write_text(to_css(tokens), encoding="utf-8")
    print(f"{out}\n{out.with_suffix('.css')}")


if __name__ == "__main__":
    main()
