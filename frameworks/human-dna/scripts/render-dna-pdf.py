#!/usr/bin/env python3
"""
Renderiza o Human DNA como um PDF em formato de apresentação.

Fluxo esperado:
    projeto/
    referencias/   # insumos do usuário
    resultado/     # DNA.md, DNA.html e DNA.pdf

Uso:
  python3 "Human DNA/scripts/render-dna-pdf.py" "/caminho/do/projeto"
"""

from __future__ import annotations

import argparse
import hashlib
import html
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

try:
    from PIL import Image
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import inch
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas
except ModuleNotFoundError as exc:
    print(
        f"Dependência ausente: {exc.name}. Use o Python do runtime do Codex ou instale reportlab e Pillow.",
        file=sys.stderr,
    )
    raise


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
TEXT_EXTENSIONS = {".md", ".txt"}
MAX_IMAGES = 120
MAX_SITE_IMAGES = 80
MAX_CONTENT_SLIDES = 13
MAX_TABLE_SLIDES = 10
MAX_GALLERY_IMAGES = 18
SLIDE_W = 13.333 * inch
SLIDE_H = 7.5 * inch
MARGIN = 0.72 * inch


def register_font(name: str, path: str, fallback: str) -> str:
    try:
        font_path = Path(path)
        if font_path.exists():
            pdfmetrics.registerFont(TTFont(name, str(font_path)))
            return name
    except Exception:
        pass
    return fallback


FONT_DISPLAY = register_font("HumanDNA-Display", "/System/Library/Fonts/NewYork.ttf", "Times-Bold")
FONT_BODY = register_font("HumanDNA-Body", "/System/Library/Fonts/Supplemental/Arial.ttf", "Helvetica")
FONT_BODY_BOLD = register_font("HumanDNA-BodyBold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "Helvetica-Bold")
FONT_MONO = register_font("HumanDNA-Mono", "/System/Library/Fonts/SFNSMono.ttf", "Courier")


class ImageLinkParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.urls: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value for key, value in attrs if value}
        candidates: list[str] = []
        if tag.lower() in {"img", "source"}:
            for key in ("src", "data-src", "data-lazy-src", "data-original"):
                if values.get(key):
                    candidates.append(values[key] or "")
            for key in ("srcset", "data-srcset"):
                if values.get(key):
                    candidates.extend(part.strip().split(" ")[0] for part in (values[key] or "").split(","))
        if tag.lower() == "meta" and values.get("property", "").lower() in {"og:image", "twitter:image"}:
            candidates.append(values.get("content", ""))
        for candidate in candidates:
            if candidate and not candidate.startswith("data:"):
                self.urls.append(urljoin(self.base_url, candidate))


class StylesheetParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.stylesheets: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "link":
            return
        values = {key.lower(): value for key, value in attrs if value}
        rel = (values.get("rel") or "").lower()
        href = values.get("href")
        if href and "stylesheet" in rel:
            self.stylesheets.append(urljoin(self.base_url, href))


class InternalLinkParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.urls: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        values = {key.lower(): value for key, value in attrs if value}
        href = values.get("href")
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            return
        self.urls.append(urljoin(self.base_url, href.split("#", 1)[0]))


class SemanticStyleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.samples: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value for key, value in attrs if value}
        style = values.get("style", "")
        class_name = values.get("class", "")
        role = tag.lower()
        if role in {"h1", "h2", "h3", "p", "a", "button"} or "button" in class_name.lower() or "cta" in class_name.lower():
            self.samples.append((role, f"{class_name} {style}"))


def project_name(project_dir: Path) -> str:
    return project_dir.name.replace("-", " ").replace("_", " ").title()


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def clean_md(text: str) -> str:
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = text.replace("✅", "Usar:")
    text = text.replace("❌", "Evitar:")
    text = text.replace("✔", "Usar:")
    text = text.replace("✕", "Evitar:")
    text = text.replace("✖", "Evitar:")
    return text.strip()


def is_pdf_noise(text: str) -> bool:
    normalized = clean_md(text).lower()
    if not normalized:
        return True
    noise_patterns = (
        "arquivo-mestre",
        "toda ia",
        "lê este arquivo primeiro",
        "le este arquivo primeiro",
        "gerado em",
        "maestro do dna",
        "versão ",
        "versao ",
        "versão",
        "versao",
        "histórico de versões",
        "historico de versoes",
        "como usar este arquivo",
    )
    return any(pattern in normalized for pattern in noise_patterns)


def parse_table_row(line: str) -> list[str]:
    return [clean_md(cell.strip()) for cell in line.strip().strip("|").split("|")]


def is_separator_line(line: str) -> bool:
    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
    return bool(cells) and all(re.match(r"^:?-{3,}:?$", cell) for cell in cells)


def blocks(markdown: str) -> list[tuple[str, Any, int]]:
    output: list[tuple[str, Any, int]] = []
    paragraph: list[str] = []
    in_code = False

    def flush() -> None:
        if paragraph:
            output.append(("p", " ".join(paragraph).strip(), 0))
            paragraph.clear()

    lines = markdown.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if line.strip().startswith("```"):
            in_code = not in_code
            flush()
            i += 1
            continue
        if in_code:
            i += 1
            continue
        if re.match(r"^\s*-{3,}\s*$", line):
            flush()
            i += 1
            continue
        if "|" in line and i + 1 < len(lines) and is_separator_line(lines[i + 1]):
            flush()
            header = parse_table_row(line)
            rows: list[list[str]] = []
            i += 2
            while i < len(lines):
                candidate = lines[i].rstrip()
                if not candidate.strip() or "|" not in candidate:
                    break
                if not is_separator_line(candidate):
                    rows.append(parse_table_row(candidate))
                i += 1
            output.append(("table", (header, rows), 0))
            continue
        heading = re.match(r"^(#{1,4})\s+(.+)$", line)
        if heading:
            flush()
            heading_text = clean_md(heading.group(2))
            if not is_pdf_noise(heading_text):
                output.append(("h", heading_text, len(heading.group(1))))
            i += 1
            continue
        bullet = re.match(r"^\s*[-*]\s+(.+)$", line)
        if bullet:
            flush()
            bullet_text = clean_md(bullet.group(1))
            if not is_pdf_noise(bullet_text):
                output.append(("li", bullet_text, 0))
            i += 1
            continue
        if not line.strip():
            flush()
            i += 1
            continue
        cleaned = clean_md(line.lstrip("> ").strip())
        if not is_pdf_noise(cleaned):
            paragraph.append(cleaned)
        i += 1
    flush()
    return output


def hex_colors(markdown: str) -> list[str]:
    seen: set[str] = set()
    found: list[str] = []
    for value in re.findall(r"#[0-9A-Fa-f]{6}\b", markdown):
        color = value.upper()
        if color not in seen:
            found.append(color)
            seen.add(color)
    return found[:32]


def safe_hex(value: str | None, fallback: str = "#111111") -> str:
    if value and re.match(r"^#[0-9A-Fa-f]{6}$", value):
        return value.upper()
    return fallback


def readable_on(hex_color: str) -> str:
    value = safe_hex(hex_color, "#111111").lstrip("#")
    r, g, b = int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return "#111111" if luminance > 0.62 else "#FFFFFF"


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    value = safe_hex(hex_color).lstrip("#")
    return int(value[:2], 16), int(value[2:4], 16), int(value[4:], 16)


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return sum((a[idx] - b[idx]) ** 2 for idx in range(3))


def visual_color_usage(images: list[Path], colors_found: list[str]) -> list[tuple[str, float]]:
    if not images or not colors_found:
        return [(color, 0) for color in colors_found]
    palette = [(color, hex_to_rgb(color)) for color in colors_found[:12]]
    counts = {color: 0 for color, _ in palette}
    total = 0
    for path in images[:36]:
        try:
            with Image.open(path).convert("RGB") as image:
                sample = image.resize((48, 48))
                for pixel in sample.getdata():
                    color = min(palette, key=lambda item: color_distance(pixel, item[1]))[0]
                    counts[color] += 1
                    total += 1
        except Exception:
            continue
    if not total:
        return [(color, 0) for color, _ in palette]
    return sorted(((color, counts[color] / total * 100) for color, _ in palette), key=lambda item: item[1], reverse=True)


def reference_dir(project_dir: Path) -> Path:
    preferred = project_dir / "referencias"
    if preferred.exists():
        return preferred
    return project_dir / "materiais"


def output_dir(project_dir: Path) -> Path:
    preferred = project_dir / "resultado"
    if preferred.exists() or not (project_dir / "dna-criativo").exists():
        return preferred
    return project_dir / "dna-criativo"


def extract_urls(refs_dir: Path) -> list[str]:
    urls: list[str] = []
    if not refs_dir.exists():
        return urls
    for path in refs_dir.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS:
            for url in re.findall(r"https?://[^\s)\]\"'>]+", read(path)):
                if url not in urls:
                    urls.append(url)
    return urls


SOCIAL_DOMAINS = (
    "instagram.com",
    "linkedin.com",
    "facebook.com",
    "tiktok.com",
    "pinterest.",
    "x.com",
    "twitter.com",
    "youtube.com",
)


def is_social_url(url: str) -> bool:
    host = urlparse(url).netloc.lower().replace("www.", "")
    return any(domain in host for domain in SOCIAL_DOMAINS)


def brand_site_urls(refs_dir: Path) -> list[str]:
    urls = [url for url in extract_urls(refs_dir) if not is_social_url(url)]
    if not urls:
        return []
    primary_host = urlparse(urls[0]).netloc.lower().replace("www.", "")
    return [url for url in urls if urlparse(url).netloc.lower().replace("www.", "") == primary_host]


def same_host(url: str, host: str) -> bool:
    return urlparse(url).netloc.lower().replace("www.", "") == host


def likely_relevant_internal_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    lowered = parsed.path.lower()
    blocked = ("/cart", "/account", "/checkout", "/policies/", "/search", "/cdn/", ".jpg", ".png", ".webp", ".pdf")
    return not any(token in lowered for token in blocked)


def crawl_brand_pages(seed_urls: list[str], max_pages: int = 18) -> list[tuple[str, str]]:
    if not seed_urls:
        return []
    primary_host = urlparse(seed_urls[0]).netloc.lower().replace("www.", "")
    queue = [url for url in seed_urls if same_host(url, primary_host)]
    seen: set[str] = set()
    pages: list[tuple[str, str]] = []
    while queue and len(pages) < max_pages:
        page_url = queue.pop(0)
        if page_url in seen or not likely_relevant_internal_url(page_url):
            continue
        seen.add(page_url)
        try:
            markup = fetch(page_url).decode("utf-8", errors="ignore")
        except Exception:
            continue
        pages.append((page_url, markup))
        link_parser = InternalLinkParser(page_url)
        link_parser.feed(markup)
        for url in link_parser.urls:
            if url not in seen and same_host(url, primary_host) and likely_relevant_internal_url(url) and url not in queue:
                queue.append(url)
    return pages


def fetch(url: str, timeout: int = 12) -> bytes:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 HumanDNA/1.0"})
    with urlopen(request, timeout=timeout) as response:
        return response.read()


def extract_font_families(text: str) -> list[str]:
    families: list[str] = []
    for raw in re.findall(r"font-family\s*:\s*([^;}]+)", text, flags=re.IGNORECASE):
        for part in raw.split(","):
            family = part.strip().strip("'\"")
            if family and not family.startswith(("var(", "inherit", "initial")) and family not in families:
                families.append(family)
    for raw in re.findall(r"[?&]family=([^:&]+)", text):
        family = raw.replace("+", " ").replace("%20", " ").strip()
        if family and family not in families:
            families.append(family)
    return families


def css_variables(css: str) -> dict[str, str]:
    variables: dict[str, str] = {}
    for name, value in re.findall(r"(--[A-Za-z0-9_-]+)\s*:\s*([^;}{]+)", css):
        cleaned = re.sub(r"\s+", " ", value.replace("!important", "")).strip()
        if cleaned and name not in variables:
            variables[name] = cleaned
    return variables


def resolve_css_value(value: str | None, variables: dict[str, str]) -> str | None:
    if not value:
        return None
    resolved = value.replace("!important", "").strip()
    for _ in range(8):
        changed = False

        def replace_var(match: re.Match[str]) -> str:
            nonlocal changed
            name = match.group(1)
            fallback = match.group(2)
            if name in variables:
                changed = True
                return variables[name]
            if fallback:
                changed = True
                return fallback.strip()
            return match.group(0)

        resolved = re.sub(r"var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^)]+))?\)", replace_var, resolved)
        if not changed:
            break
    return re.sub(r"\s+", " ", resolved).strip()


def rgb_to_hex(red: int, green: int, blue: int) -> str:
    return f"#{max(0, min(255, red)):02X}{max(0, min(255, green)):02X}{max(0, min(255, blue)):02X}"


def human_color_value(value: str | None) -> str:
    if not value:
        return "não confirmado"
    cleaned = value.strip().strip(";")
    if re.match(r"^#[0-9A-Fa-f]{3}$", cleaned):
        return "#" + "".join(char * 2 for char in cleaned[1:]).upper()
    hex_match = re.search(r"#[0-9A-Fa-f]{6}\b", cleaned)
    if hex_match:
        return hex_match.group(0).upper()
    rgb_match = re.search(
        r"rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)(?:[\s,/]+([0-9.]+%?))?\s*\)",
        cleaned,
        flags=re.IGNORECASE,
    )
    if not rgb_match:
        rgb_match = re.match(
            r"^([0-9]{1,3})\s+([0-9]{1,3})\s+([0-9]{1,3})(?:\s*/\s*([0-9.]+%?))?$",
            cleaned,
        )
    if rgb_match:
        red, green, blue = (int(float(rgb_match.group(idx))) for idx in (1, 2, 3))
        base = rgb_to_hex(red, green, blue)
        alpha = rgb_match.group(4)
        if alpha:
            value_alpha = float(alpha.rstrip("%")) / (100 if "%" in alpha else 1)
            if value_alpha < 1:
                return f"{base} com opacidade {value_alpha * 100:.0f}%"
        return base
    named = {
        "black": "#000000",
        "white": "#FFFFFF",
        "transparent": "transparente",
        "inherit": "não confirmado",
        "initial": "não confirmado",
        "unset": "não confirmado",
        "currentcolor": "não confirmado",
    }
    return named.get(cleaned.lower(), cleaned)


def human_font_value(value: str | None) -> str:
    if not value:
        return "não confirmado"
    cleaned = re.sub(r"\s+", " ", value.replace("!important", "")).strip()
    if not cleaned or "var(" in cleaned:
        return "não confirmado"
    families = [part.strip().strip("'\"") for part in cleaned.split(",") if part.strip()]
    families = [family for family in families if family.lower() not in {"inherit", "initial", "unset"}]
    if not families:
        return "não confirmado"
    primary = families[0]
    fallback = ", ".join(families[1:3])
    return f"{primary} (fallback: {fallback})" if fallback else primary


def extract_css_value(css: str, selectors: list[str], properties: list[str]) -> str | None:
    selector_tokens = [selector.lower() for selector in selectors]
    for selector_group, block in re.findall(r"([^{}]+)\{([^{}]+)\}", css, flags=re.IGNORECASE):
        selector_group_lower = selector_group.lower()
        if not any(token in selector_group_lower for token in selector_tokens):
            continue
        for prop in properties:
            match = re.search(rf"(^|[;\s]){re.escape(prop)}\s*:\s*([^;]+)", block, flags=re.IGNORECASE)
            if match:
                return match.group(2).strip()
    return None


def clean_css_value(value: str | None) -> str:
    if not value:
        return "não confirmado"
    return re.sub(r"\s+", " ", value).strip()[:80]


def analyze_semantic_styles(markup: str, css_text: str) -> dict[str, str]:
    variables = css_variables(markup + "\n" + css_text)
    title_font = resolve_css_value(
        extract_css_value(css_text, ["h1", ".h1", ".h0", ".title", ".heading", ".banner__heading"], ["font-family"])
        or extract_css_value(markup, ["h1"], ["font-family"]),
        variables,
    )
    body_font = resolve_css_value(extract_css_value(css_text, ["body", "p", ".body", ".rte"], ["font-family"]), variables)
    button_font = resolve_css_value(extract_css_value(css_text, ["button", ".button", ".btn", ".cta", "button--"], ["font-family"]), variables) or body_font
    bg_color = resolve_css_value(extract_css_value(css_text, ["body", ".page-width", ".gradient"], ["background-color", "background"]), variables)
    title_color = resolve_css_value(extract_css_value(css_text, ["h1", ".h1", ".h0", ".title", ".heading", ".banner__heading"], ["color"]), variables)
    text_color = resolve_css_value(extract_css_value(css_text, ["body", "p", ".body", ".rte"], ["color"]), variables)
    button_bg = resolve_css_value(extract_css_value(css_text, ["button", ".button", ".btn", ".cta", "button--"], ["background-color", "background"]), variables)
    button_color = resolve_css_value(extract_css_value(css_text, ["button", ".button", ".btn", ".cta", "button--"], ["color"]), variables)
    return {
        "Títulos": human_font_value(title_font),
        "Textos": human_font_value(body_font),
        "Botões": human_font_value(button_font),
        "Fundo": human_color_value(bg_color),
        "Cor de título": human_color_value(title_color),
        "Cor de texto": human_color_value(text_color),
        "CTA fundo": human_color_value(button_bg),
        "CTA texto": human_color_value(button_color),
    }


def font_urls_from_css(css: str, base_url: str) -> list[tuple[str, str]]:
    assets: list[tuple[str, str]] = []
    for block in re.findall(r"@font-face\s*\{([^{}]+)\}", css, flags=re.IGNORECASE):
        family_match = re.search(r"font-family\s*:\s*([^;]+)", block, flags=re.IGNORECASE)
        family = human_font_value(family_match.group(1)) if family_match else "fonte-site"
        for raw_url in re.findall(r"url\(([^)]+)\)", block, flags=re.IGNORECASE):
            url = raw_url.strip().strip("'\"")
            if url.startswith("data:"):
                continue
            assets.append((family, urljoin(base_url, url)))
    return assets


def download_font_assets(refs_dir: Path, assets: list[tuple[str, str]]) -> list[Path]:
    if not assets:
        return []
    out_dir = refs_dir / "03-tipografias" / "site-fontes"
    out_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []
    seen: set[str] = set()
    for family, url in assets[:20]:
        if url in seen:
            continue
        seen.add(url)
        suffix = Path(urlparse(url).path).suffix.lower()
        if suffix not in {".woff", ".woff2", ".ttf", ".otf"}:
            suffix = ".woff2"
        slug = re.sub(r"[^a-z0-9]+", "-", family.lower()).strip("-")[:42] or "fonte-site"
        target = out_dir / f"{slug}-{hashlib.sha1(url.encode('utf-8')).hexdigest()[:8]}{suffix}"
        if not target.exists():
            try:
                data = fetch(url)
                if len(data) < 1200:
                    continue
                target.write_bytes(data)
            except Exception:
                continue
        saved.append(target)
    return saved


def collect_site_typography(project_dir: Path, refs_dir: Path) -> dict[str, str]:
    urls = brand_site_urls(refs_dir)
    if not urls:
        return {}
    found: list[str] = []
    sources: list[str] = []
    font_assets: list[tuple[str, str]] = []
    downloaded_fonts: list[Path] = []
    semantic: dict[str, str] = {}
    for page_url, markup in crawl_brand_pages(urls, max_pages=12):
        for family in extract_font_families(markup):
            if family not in found:
                found.append(family)
        font_assets.extend(font_urls_from_css(markup, page_url))
        parser = StylesheetParser(page_url)
        parser.feed(markup)
        css_bundle = ""
        for css_url in parser.stylesheets[:8]:
            try:
                css = fetch(css_url).decode("utf-8", errors="ignore")
            except Exception:
                continue
            css_bundle += "\n" + css
            sources.append(css_url)
            font_assets.extend(font_urls_from_css(css, css_url))
            for family in extract_font_families(css):
                if family not in found:
                    found.append(family)
        if not semantic:
            semantic = analyze_semantic_styles(markup, css_bundle)
    downloaded_fonts = download_font_assets(refs_dir, font_assets)
    if downloaded_fonts:
        semantic["Fontes baixadas"] = f"{len(downloaded_fonts)} arquivo(s) em referencias/03-tipografias/site-fontes"
    if found:
        discovery = project_dir / "discovery"
        discovery.mkdir(parents=True, exist_ok=True)
        lines = [
            "# Inventário tipográfico e cromático do site",
            "",
            "Análise funcional a partir de HTML/CSS público. Validar manualmente nomes comerciais, pesos e licenças quando necessário.",
            "",
            "## Papéis visuais detectados",
            "",
            *[f"- {key}: {value}" for key, value in semantic.items()],
            "",
            "## Arquivos de fonte baixados",
            "",
            *[f"- {path.relative_to(project_dir).as_posix()}" for path in downloaded_fonts[:40]],
            "",
            "## Familias encontradas como repertorio bruto",
            "",
            *[f"- {family}" for family in found[:40]],
            "",
            "## CSS consultados",
            "",
            *[f"- {source}" for source in sources[:40]],
            "",
        ]
        (discovery / "site-typography-inventory.md").write_text("\n".join(lines), encoding="utf-8")
    return semantic


def extension_from_url(url: str, fallback: str = ".jpg") -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return suffix
    return fallback


def download_site_images(refs_dir: Path) -> list[Path]:
    urls = brand_site_urls(refs_dir)
    if not urls:
        return []
    out_dir = refs_dir / "02-arquivos-visuais" / "site-extraidas"
    out_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []
    seen: set[str] = set()
    for page_url, markup in crawl_brand_pages(urls, max_pages=18):
        parser = ImageLinkParser(page_url)
        parser.feed(markup)
        for img_url in parser.urls:
            if img_url in seen or len(saved) >= MAX_SITE_IMAGES:
                continue
            seen.add(img_url)
            digest = hashlib.sha1(img_url.encode("utf-8")).hexdigest()[:12]
            target = out_dir / f"site-{digest}{extension_from_url(img_url)}"
            if not target.exists():
                try:
                    data = fetch(img_url)
                    if len(data) < 3500:
                        continue
                    target.write_bytes(data)
                except Exception:
                    continue
            if is_usable_image(target):
                saved.append(target)
    return saved


def is_usable_image(path: Path) -> bool:
    try:
        with Image.open(path) as image:
            width, height = image.size
            if width < 160 or height < 100:
                return False
            if width * height < 45000:
                return False
            return True
    except Exception:
        return False


def collect_images(refs_dir: Path) -> list[Path]:
    if not refs_dir.exists():
        return []
    download_site_images(refs_dir)
    images = [
        path
        for path in sorted(refs_dir.rglob("*"))
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS and is_usable_image(path)
    ]
    priority = {
        "logo": 0,
        "logotipo": 0,
        "brandmark": 0,
        "site-extraidas": 1,
        "09-instagram": 1,
        "instagram": 1,
        "hero": 1,
        "home": 1,
        "produto": 2,
        "product": 2,
        "mockup": 2,
        "referencia": 3,
    }

    def score(path: Path) -> tuple[int, int, str]:
        name = path.as_posix().lower()
        rank = 6
        for token, value in priority.items():
            if token in name:
                rank = min(rank, value)
        try:
            with Image.open(path) as image:
                area = image.size[0] * image.size[1]
        except Exception:
            area = 0
        return rank, -area, name

    return sorted(images, key=score)[:MAX_IMAGES]


def is_logo_like(path: Path) -> bool:
    name = path.as_posix().lower()
    return any(token in name for token in ("logo", "logotipo", "monogram", "marca", "brandmark"))


def image_kind(path: Path) -> str:
    if is_logo_like(path):
        return "logo"
    name = path.as_posix().lower()
    file_name = path.name.lower()
    if any(token in file_name for token in ("print", "screenshot", "screen", "ui", "card", "banner", "texto", "typography", "tipografia")):
        return "visual_asset"
    try:
        with Image.open(path).convert("RGB") as image:
            small = image.resize((1, 1))
            _ = small.getpixel((0, 0))
            colors_count = len(image.resize((64, 64)).getcolors(maxcolors=4096) or [])
            width, height = image.size
            aspect = width / max(height, 1)
            if "site-extraidas" in name:
                if aspect > 2.35 or aspect < 0.22 or colors_count < 70:
                    return "visual_asset"
                if path.suffix.lower() == ".png" and colors_count < 220:
                    return "visual_asset"
                return "photo"
            if colors_count < 80 or aspect > 5 or aspect < 0.18:
                return "visual_asset"
    except Exception:
        return "visual_asset"
    return "photo"


def image_fingerprint(path: Path) -> int | None:
    try:
        with Image.open(path).convert("L") as image:
            sample = image.resize((8, 8))
            values = list(sample.getdata())
            average = sum(values) / len(values)
            bits = 0
            for value in values:
                bits = (bits << 1) | int(value >= average)
            return bits
    except Exception:
        return None


def fingerprint_distance(left: int, right: int) -> int:
    return (left ^ right).bit_count()


def unique_visual_images(images: list[Path], max_distance: int = 5) -> list[Path]:
    unique: list[Path] = []
    fingerprints: list[int] = []
    for image in images:
        fingerprint = image_fingerprint(image)
        if fingerprint is None:
            unique.append(image)
            continue
        if any(fingerprint_distance(fingerprint, existing) <= max_distance for existing in fingerprints):
            continue
        fingerprints.append(fingerprint)
        unique.append(image)
    return unique


def collect_logo(images: list[Path]) -> Path | None:
    for path in images:
        if is_logo_like(path):
            return path
    return None


def image_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.size


def draw_bg(c: canvas.Canvas, primary: str, light: str) -> None:
    c.setFillColor(colors.HexColor(light))
    c.rect(0, 0, SLIDE_W, SLIDE_H, stroke=0, fill=1)
    c.setFillColor(colors.HexColor(primary))
    c.rect(0, SLIDE_H - 0.12 * inch, SLIDE_W, 0.12 * inch, stroke=0, fill=1)


def font(c: canvas.Canvas, name: str, size: float, color: str = "#111111") -> None:
    c.setFont(name, size)
    c.setFillColor(colors.HexColor(safe_hex(color)))


def wrap(text: str, max_chars: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    line: list[str] = []
    for word in words:
        if len(" ".join([*line, word])) > max_chars and line:
            lines.append(" ".join(line))
            line = [word]
        else:
            line.append(word)
    if line:
        lines.append(" ".join(line))
    return lines


def draw_text(c: canvas.Canvas, text: str, x: float, y: float, width_chars: int, size: float = 15, leading: float = 19, color: str = "#111111", font_name: str = FONT_BODY) -> float:
    font(c, font_name, size, color)
    for line in wrap(text, width_chars):
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_inline_hex_text(c: canvas.Canvas, text: str, x: float, y: float, max_chars: int, size: float, leading: float, color: str = "#111111") -> float:
    font(c, FONT_BODY, size, color)
    line_y = y
    cursor_x = x
    approx = size * 0.48
    max_width = max_chars * approx
    words = text.split()
    for word in words:
        clean = word.rstrip(".,;:)")
        prefix = word[:len(word) - len(word.lstrip("("))]
        suffix = word[len(clean):]
        is_hex = bool(re.match(r"^#[0-9A-Fa-f]{6}$", clean))
        word_width = c.stringWidth(word + " ", FONT_BODY, size) + (0.22 * inch if is_hex else 0)
        if cursor_x + word_width > x + max_width and cursor_x > x:
            line_y -= leading
            cursor_x = x
        if is_hex:
            if prefix:
                c.drawString(cursor_x, line_y, prefix)
                cursor_x += c.stringWidth(prefix, FONT_BODY, size)
            sw = 0.14 * inch
            c.setFillColor(colors.HexColor(clean.upper()))
            c.rect(cursor_x, line_y - 1.5, sw, sw, stroke=0, fill=1)
            cursor_x += sw + 0.055 * inch
            font(c, FONT_MONO, size * 0.86, color)
            c.drawString(cursor_x, line_y, clean.upper())
            cursor_x += c.stringWidth(clean.upper() + suffix + " ", FONT_MONO, size * 0.86)
            font(c, FONT_BODY, size, color)
        else:
            c.drawString(cursor_x, line_y, word)
            cursor_x += c.stringWidth(word + " ", FONT_BODY, size)
    return line_y - leading


def fit_box(path: Path, box_w: float, box_h: float, cover: bool = True) -> tuple[float, float]:
    width, height = image_size(path)
    scale = max(box_w / width, box_h / height) if cover else min(box_w / width, box_h / height)
    return width * scale, height * scale


def draw_image(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float, cover: bool = True) -> None:
    try:
        img_w, img_h = fit_box(path, w, h, cover=cover)
        offset_x = x + (w - img_w) / 2
        offset_y = y + (h - img_h) / 2
        if cover:
            c.setFillColor(colors.HexColor("#F8F6F1"))
            c.roundRect(x, y, w, h, 10, stroke=0, fill=1)
        c.saveState()
        p = c.beginPath()
        p.rect(x, y, w, h)
        c.clipPath(p, stroke=0, fill=0)
        c.drawImage(ImageReader(str(path)), offset_x, offset_y, img_w, img_h, mask="auto")
        c.restoreState()
    except Exception:
        c.setFillColor(colors.HexColor("#DDDDDD"))
        c.rect(x, y, w, h, stroke=0, fill=1)


def new_slide(c: canvas.Canvas, primary: str, light: str, page: int) -> None:
    if page > 0:
        c.showPage()
    draw_bg(c, primary, light)
    font(c, FONT_BODY, 8, "#777777")
    c.drawRightString(SLIDE_W - MARGIN, 0.32 * inch, f"{page + 1:02d}")


def draw_cover(c: canvas.Canvas, name: str, logo: Path | None, colors_found: list[str], primary: str, light: str) -> None:
    new_slide(c, primary, light, 0)
    if logo:
        draw_image(c, logo, MARGIN, SLIDE_H - 1.85 * inch, 2.4 * inch, 0.72 * inch, cover=False)
    font(c, FONT_BODY_BOLD, 11, primary)
    c.drawString(MARGIN, SLIDE_H - 2.55 * inch, "DNA CRIATIVO")
    font(c, FONT_DISPLAY, 58, "#111111")
    for idx, line in enumerate(wrap(name, 18)[:2]):
        c.drawString(MARGIN, SLIDE_H - (3.3 + idx * 0.72) * inch, line)
    draw_text(c, "Apresentação visual analítica construída a partir das referências, fotos, tipografia, paleta e sinais criativos estudados.", MARGIN, 1.95 * inch, 58, 15, 21, "#333333")
    x = SLIDE_W - MARGIN - len(colors_found[:7]) * 0.34 * inch
    for color in colors_found[:7]:
        c.setFillColor(colors.HexColor(color))
        c.rect(x, MARGIN, 0.27 * inch, 0.27 * inch, stroke=0, fill=1)
        x += 0.34 * inch


def draw_palette_slide(c: canvas.Canvas, colors_found: list[str], color_usage: list[tuple[str, float]], primary: str, light: str, page: int) -> int:
    if not colors_found:
        return page
    new_slide(c, primary, light, page)
    draw_kicker_title(c, "SISTEMA VISUAL", "Cores por presença visual", primary)
    usage = color_usage or [(color, 0) for color in colors_found[:8]]
    max_pct = max([pct for _, pct in usage] or [1]) or 1
    y = SLIDE_H - 2.0 * inch
    for idx, (color, pct) in enumerate(usage[:8], start=1):
        bar_w = 5.6 * inch * (pct / max_pct if pct else 0.12)
        c.setFillColor(colors.HexColor(color))
        c.roundRect(MARGIN + 1.15 * inch, y - 0.05 * inch, bar_w, 0.28 * inch, 5, stroke=0, fill=1)
        font(c, FONT_BODY_BOLD, 8.5, primary)
        c.drawString(MARGIN, y, f"{idx:02d}")
        font(c, FONT_MONO, 10, "#111111")
        c.drawString(MARGIN + 7.0 * inch, y, color)
        font(c, FONT_BODY, 10, "#333333")
        c.drawRightString(SLIDE_W - MARGIN, y, f"{pct:.1f}% analisado")
        y -= 0.48 * inch
    draw_text(c, "Percentual estimado a partir das imagens extraídas do domínio próprio da marca. A leitura indica presença visual aproximada, não declaração absoluta.", MARGIN, 0.9 * inch, 92, 11.5, 15, "#444444")
    return page + 1


def draw_typography_slide(c: canvas.Canvas, typefaces: dict[str, str], primary: str, light: str, page: int) -> int:
    if not typefaces:
        return page
    new_slide(c, primary, light, page)
    draw_kicker_title(c, "SISTEMA VISUAL", "Tipografia e cores por função", primary)
    rows = [
        ("Títulos", typefaces.get("Títulos", "não confirmado")),
        ("Textos", typefaces.get("Textos", "não confirmado")),
        ("Botões", typefaces.get("Botões", "não confirmado")),
        ("Fundo", typefaces.get("Fundo", "não confirmado")),
        ("Cor de título", typefaces.get("Cor de título", "não confirmado")),
        ("Cor de texto", typefaces.get("Cor de texto", "não confirmado")),
        ("CTA fundo", typefaces.get("CTA fundo", "não confirmado")),
        ("CTA texto", typefaces.get("CTA texto", "não confirmado")),
    ]
    y = SLIDE_H - 2.05 * inch
    for idx, (label, value) in enumerate(rows, start=1):
        x = MARGIN if idx <= 4 else 7.0 * inch
        row_y = y - ((idx - 1) % 4) * 0.85 * inch
        font(c, FONT_BODY_BOLD, 8.5, primary)
        c.drawString(x, row_y, label.upper())
        draw_inline_hex_text(c, value, x, row_y - 0.28 * inch, 40, 13, 17, "#111111")
    draw_text(c, "Esta página não lista todas as fontes do site. Ela identifica papéis: o que parece ser título, texto, botão, fundo e CTA.", MARGIN, 0.95 * inch, 86, 12, 16, "#333333")
    return page + 1


def draw_kicker_title(c: canvas.Canvas, kicker: str, title: str, primary: str) -> None:
    title = re.sub(r"^\d+(?:\.\d+)*\s+", "", title)
    font(c, FONT_BODY_BOLD, 9, primary)
    c.drawString(MARGIN, SLIDE_H - 0.75 * inch, kicker)
    font(c, FONT_DISPLAY, 34, "#111111")
    c.drawString(MARGIN, SLIDE_H - 1.18 * inch, title[:72])


def draw_gallery_intro(c: canvas.Canvas, images: list[Path], primary: str, light: str, page: int) -> int:
    if not images:
        return page
    new_slide(c, primary, light, page)
    font(c, FONT_BODY_BOLD, 9, primary)
    c.drawString(MARGIN, SLIDE_H - 0.78 * inch, "REFERÊNCIAS VISUAIS")
    count_text = f"{len(images)}"
    count_size = 58
    font(c, FONT_DISPLAY, count_size, "#111111")
    c.drawString(MARGIN, SLIDE_H - 1.55 * inch, count_text)
    count_w = c.stringWidth(count_text, FONT_DISPLAY, count_size)
    label_x = MARGIN + count_w + 0.18 * inch
    font(c, FONT_BODY_BOLD, 23, "#111111")
    c.drawString(label_x, SLIDE_H - 1.47 * inch, "imagens")
    c.drawString(label_x, SLIDE_H - 1.83 * inch, "analisadas")
    c.setFillColor(colors.HexColor(primary))
    c.rect(MARGIN, SLIDE_H - 2.18 * inch, max(1.15 * inch, count_w + 1.12 * inch), 0.06 * inch, stroke=0, fill=1)

    notes = [
        "foto, produto e atmosfera",
        "luz, sombra e textura",
        "composição, gesto e recorrência",
    ]
    y = SLIDE_H - 2.7 * inch
    for idx, note in enumerate(notes, start=1):
        font(c, FONT_BODY_BOLD, 8, primary)
        c.drawString(MARGIN, y, f"{idx:02d}")
        draw_text(c, note, MARGIN + 0.38 * inch, y, 24, 13.5, 17, "#222222")
        y -= 0.55 * inch

    draw_text(c, "A imagem não entra como anexo. Ela revela como a marca constrói presença: enquadramento, superfície, pose, produto, luz e ritmo editorial.", MARGIN, 1.55 * inch, 31, 11.5, 15.5, "#444444")

    hero = images[0]
    hero_x = 4.35 * inch
    hero_y = 1.55 * inch
    hero_w = 4.75 * inch
    hero_h = 4.72 * inch
    draw_image(c, hero, hero_x, hero_y, hero_w, hero_h, cover=False)

    thumb_x = 9.55 * inch
    thumb_y = 4.45 * inch
    for image in images[1:5]:
        draw_image(c, image, thumb_x, thumb_y, 1.35 * inch, 1.35 * inch, cover=False)
        thumb_x += 1.55 * inch
        if thumb_x > SLIDE_W - MARGIN - 1.35 * inch:
            thumb_x = 9.55 * inch
            thumb_y -= 1.58 * inch
    return page + 1


def draw_gallery_pages(c: canvas.Canvas, project_dir: Path, images: list[Path], primary: str, light: str, page: int) -> int:
    idx = 0
    board = 1
    while idx < len(images):
        chunk = images[idx:idx + 9]
        new_slide(c, primary, light, page)
        gallery_title = "Galeria de fotos" if len(images) <= 9 else f"Galeria de fotos {board:02d}"
        draw_kicker_title(c, "ESTUDO VISUAL", gallery_title, primary)
        if len(chunk) <= 3:
            slots = [
                (MARGIN, 1.55 * inch, 3.75 * inch, 4.15 * inch),
                (4.85 * inch, 1.55 * inch, 3.25 * inch, 4.15 * inch),
                (8.35 * inch, 1.55 * inch, 4.25 * inch, 4.15 * inch),
            ]
        elif len(chunk) <= 6:
            slots = [
                (MARGIN, 3.15 * inch, 3.65 * inch, 2.55 * inch),
                (4.05 * inch, 3.15 * inch, 4.05 * inch, 2.55 * inch),
                (8.50 * inch, 3.15 * inch, 4.10 * inch, 2.55 * inch),
                (MARGIN, 1.05 * inch, 4.10 * inch, 1.78 * inch),
                (4.50 * inch, 1.05 * inch, 3.15 * inch, 1.78 * inch),
                (8.05 * inch, 1.05 * inch, 4.55 * inch, 1.78 * inch),
            ]
        else:
            slots = [
                (MARGIN, 3.17 * inch, 3.05 * inch, 2.55 * inch),
                (4.15 * inch, 3.17 * inch, 2.20 * inch, 2.55 * inch),
                (6.62 * inch, 3.17 * inch, 2.95 * inch, 2.55 * inch),
                (9.85 * inch, 3.17 * inch, 2.75 * inch, 2.55 * inch),
                (MARGIN, 1.13 * inch, 2.45 * inch, 1.72 * inch),
                (3.05 * inch, 1.13 * inch, 3.00 * inch, 1.72 * inch),
                (6.40 * inch, 1.13 * inch, 2.20 * inch, 1.72 * inch),
                (8.95 * inch, 1.13 * inch, 1.65 * inch, 1.72 * inch),
                (10.95 * inch, 1.13 * inch, 1.65 * inch, 1.72 * inch),
            ]
        for image, slot in zip(chunk, slots):
            c.setFillColor(colors.HexColor("#FFFFFF"))
            c.roundRect(slot[0] - 0.05 * inch, slot[1] - 0.05 * inch, slot[2] + 0.10 * inch, slot[3] + 0.10 * inch, 10, stroke=0, fill=1)
            draw_image(c, image, *slot, cover=False)
        font(c, FONT_BODY, 7.5, "#666666")
        c.drawString(MARGIN, 0.48 * inch, f"{len(chunk)} fotos nesta prancha. Proporção preservada para leitura de produto, gesto, luz e textura.")
        idx += 9
        page += 1
        board += 1
    return page


def table_line_count(text: str, width_chars: int) -> int:
    return max(1, len(wrap(text, width_chars)))


def table_row_height(row: list[str], col_count: int, width_chars: int) -> float:
    max_lines = 1
    for idx in range(col_count):
        cell = row[idx] if idx < len(row) else ""
        max_lines = max(max_lines, table_line_count(cell, width_chars))
    return max(0.50 * inch, 0.27 * inch + max_lines * 0.13 * inch)


def draw_table_slide(c: canvas.Canvas, header: list[str], rows: list[list[str]], primary: str, light: str, page: int, title: str) -> int:
    col_count = max([len(header), *[len(row) for row in rows]] or [1])
    col_w = (SLIDE_W - 2 * MARGIN) / col_count
    cell_chars = max(14, int(col_w / 5.4))
    header_h = 0.50 * inch
    row_gap = 0.045 * inch
    bottom_limit = 0.58 * inch
    row_index = 0
    table_page = 1

    while row_index < len(rows):
        new_slide(c, primary, light, page)
        page_title = title[:62] if table_page == 1 else f"{title[:56]} · continuação"
        draw_kicker_title(c, "MATRIZ", page_title, primary)

        y_top = SLIDE_H - 1.62 * inch
        table_w = SLIDE_W - 2 * MARGIN

        c.setFillColor(colors.HexColor(primary))
        c.roundRect(MARGIN, y_top - header_h, table_w, header_h, 8, stroke=0, fill=1)
        for idx in range(col_count):
            cell = header[idx] if idx < len(header) else ""
            draw_text(c, cell, MARGIN + idx * col_w + 0.16 * inch, y_top - 0.31 * inch, cell_chars, 7.8, 9.8, readable_on(primary), FONT_BODY_BOLD)

        y_cursor = y_top - header_h - 0.14 * inch
        drawn_any = False
        local_index = 0
        while row_index < len(rows):
            row = rows[row_index]
            row_h = table_row_height(row, col_count, cell_chars)
            if y_cursor - row_h < bottom_limit and drawn_any:
                break

            row_bottom = y_cursor - row_h
            row_fill = "#F7F4EE" if local_index % 2 == 0 else "#FFFFFF"
            c.setFillColor(colors.HexColor(row_fill))
            c.roundRect(MARGIN + 0.06 * inch, row_bottom + 0.02 * inch, table_w - 0.12 * inch, row_h - 0.04 * inch, 6, stroke=0, fill=1)

            text_y = y_cursor - 0.22 * inch
            for idx in range(col_count):
                text = row[idx] if idx < len(row) else ""
                draw_inline_hex_text(c, text, MARGIN + idx * col_w + 0.16 * inch, text_y, cell_chars, 7.8, 9.8, "#222222")

            c.setStrokeColor(colors.HexColor("#E2DDD5"))
            c.setLineWidth(0.45)
            c.line(MARGIN + 0.06 * inch, row_bottom, SLIDE_W - MARGIN - 0.06 * inch, row_bottom)

            y_cursor = row_bottom - row_gap
            row_index += 1
            local_index += 1
            drawn_any = True

        page += 1
        table_page += 1
    return page


def draw_section_slide(c: canvas.Canvas, title: str, primary: str, light: str, page: int) -> int:
    new_slide(c, primary, light, page)
    font(c, FONT_BODY_BOLD, 10, primary)
    c.drawString(MARGIN, SLIDE_H - 2.0 * inch, "CAPÍTULO")
    font(c, FONT_DISPLAY, 48, "#111111")
    y = SLIDE_H - 2.7 * inch
    for line in wrap(title, 24)[:3]:
        c.drawString(MARGIN, y, line)
        y -= 0.58 * inch
    c.setFillColor(colors.HexColor(primary))
    c.rect(MARGIN, 1.38 * inch, 2.2 * inch, 0.08 * inch, stroke=0, fill=1)
    return page + 1


def split_into_points(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned or cleaned in {"---", "--", "-"}:
        return []
    cleaned = cleaned.replace(" ■ ", "; ")
    cleaned = cleaned.strip(" -")
    if len(cleaned) < 150:
        return [sentence_case(cleaned)]
    pieces = re.split(r";\s+|(?<=[.!?])\s+(?=[A-ZÀ-Ú0-9])", cleaned)
    points = [sentence_case(piece.strip(" -")) for piece in pieces if piece.strip(" -")]
    return points or [cleaned]


def sentence_case(text: str) -> str:
    text = text.strip()
    if not text:
        return text
    match = re.search(r"[A-Za-zÀ-ÖØ-öø-ÿ]", text)
    if not match:
        return text
    idx = match.start()
    return text[:idx] + text[idx].upper() + text[idx + 1 :]


def draw_card(c: canvas.Canvas, x: float, y: float, w: float, h: float, text: str, primary: str, idx: int) -> None:
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.roundRect(x, y, w, h, 14, stroke=0, fill=1)
    c.setFillColor(colors.HexColor(primary))
    c.roundRect(x, y, 0.08 * inch, h, 4, stroke=0, fill=1)
    font(c, FONT_BODY_BOLD, 8.5, primary)
    c.drawString(x + 0.22 * inch, y + h - 0.28 * inch, f"{idx:02d}")
    draw_inline_hex_text(c, text, x + 0.22 * inch, y + h - 0.54 * inch, 42, 10.5, 14.2, "#1D1D1D")


def card_height_for(text: str, width_chars: int = 42) -> float:
    lines = max(1, len(wrap(text, width_chars)))
    return min(2.35 * inch, max(0.82 * inch, 0.48 * inch + lines * 0.18 * inch))


def draw_bullet_component(c: canvas.Canvas, x: float, y: float, text: str, primary: str, idx: int, max_chars: int = 82) -> float:
    font(c, FONT_BODY_BOLD, 8, primary)
    c.drawString(x, y, f"{idx:02d}")
    c.setFillColor(colors.HexColor(primary))
    c.circle(x + 0.36 * inch, y + 0.03 * inch, 0.035 * inch, stroke=0, fill=1)
    return draw_inline_hex_text(c, text.strip("- "), x + 0.52 * inch, y, max_chars, 11.2, 15, "#1D1D1D")


def draw_numbered_lines(c: canvas.Canvas, points: list[str], primary: str, has_rail: bool) -> None:
    y = SLIDE_H - 2.0 * inch
    max_chars = 62 if has_rail else 88
    for idx, point in enumerate(points[:8], start=1):
        font(c, FONT_DISPLAY, 26, primary)
        c.drawString(MARGIN, y - 0.04 * inch, f"{idx:02d}")
        next_y = draw_inline_hex_text(c, point, MARGIN + 0.78 * inch, y, max_chars, 12.2, 16, "#1D1D1D")
        y = min(y - 0.64 * inch, next_y - 0.12 * inch)
        if y < 0.82 * inch:
            break


def draw_two_column_editorial(c: canvas.Canvas, points: list[str], primary: str, has_rail: bool) -> None:
    content_right = SLIDE_W - MARGIN - (2.9 * inch if has_rail else 0)
    gap = 0.34 * inch
    col_w = (content_right - MARGIN - gap) / 2
    col_x = [MARGIN, MARGIN + col_w + gap]
    y_start = SLIDE_H - 2.02 * inch
    for idx, point in enumerate(points[:8]):
        col = idx % 2
        row = idx // 2
        y = y_start - row * 0.93 * inch
        if y < 0.9 * inch:
            break
        font(c, FONT_BODY_BOLD, 8, primary)
        c.drawString(col_x[col], y, f"{idx + 1:02d}")
        draw_inline_hex_text(c, point, col_x[col] + 0.34 * inch, y, max(34, int(col_w / 5.4)), 10.8, 14.2, "#1D1D1D")


def draw_compact_point_matrix(c: canvas.Canvas, points: list[str], primary: str) -> None:
    content_w = SLIDE_W - 2 * MARGIN
    gap = 0.22 * inch
    col_w = (content_w - 2 * gap) / 3
    col_x = [MARGIN, MARGIN + col_w + gap, MARGIN + (col_w + gap) * 2]
    col_y = [SLIDE_H - 2.02 * inch] * 3
    for idx, point in enumerate(points[:15], start=1):
        col = col_y.index(max(col_y))
        lines = wrap(point, max(30, int(col_w / 5.3)))
        h = max(0.46 * inch, 0.25 * inch + min(len(lines), 4) * 0.15 * inch)
        if col_y[col] - h < 0.72 * inch:
            continue
        x = col_x[col]
        y_top = col_y[col]
        c.setFillColor(colors.HexColor("#FFFFFF"))
        c.roundRect(x, y_top - h, col_w, h, 8, stroke=0, fill=1)
        font(c, FONT_BODY_BOLD, 7.2, primary)
        c.drawString(x + 0.13 * inch, y_top - 0.23 * inch, f"{idx:02d}")
        draw_inline_hex_text(c, point, x + 0.43 * inch, y_top - 0.23 * inch, max(24, int(col_w / 5.7)), 8.8, 11.4, "#1D1D1D")
        col_y[col] = y_top - h - 0.12 * inch


def draw_statement_slide(c: canvas.Canvas, points: list[str], primary: str, has_rail: bool) -> None:
    if not points:
        return
    main = points[0]
    max_chars = 30 if has_rail else 38
    y = SLIDE_H - 2.15 * inch
    font(c, FONT_DISPLAY, 31, "#111111")
    for line in wrap(main, max_chars)[:5]:
        c.drawString(MARGIN, y, line)
        y -= 0.42 * inch
    c.setFillColor(colors.HexColor(primary))
    c.rect(MARGIN, y - 0.04 * inch, 1.4 * inch, 0.06 * inch, stroke=0, fill=1)
    y -= 0.42 * inch
    for idx, point in enumerate(points[1:4], start=1):
        font(c, FONT_BODY_BOLD, 8, primary)
        c.drawString(MARGIN, y, f"{idx:02d}")
        y = draw_inline_hex_text(c, point, MARGIN + 0.42 * inch, y, 62 if has_rail else 88, 12, 16, "#2A2A2A")
        y -= 0.16 * inch


def draw_chip_grid(c: canvas.Canvas, points: list[str], primary: str, has_rail: bool) -> None:
    content_right = SLIDE_W - MARGIN - (2.9 * inch if has_rail else 0)
    x = MARGIN
    y = SLIDE_H - 2.05 * inch
    for idx, point in enumerate(points[:10], start=1):
        lines = wrap(point, 34 if has_rail else 44)
        w = (content_right - MARGIN - 0.25 * inch) / 2
        h = min(1.0 * inch, 0.34 * inch + len(lines[:3]) * 0.17 * inch)
        if x + w > content_right + 0.01:
            x = MARGIN
            y -= 1.08 * inch
        if y - h < 0.8 * inch:
            break
        c.setFillColor(colors.HexColor("#FFFFFF"))
        c.roundRect(x, y - h, w, h, 18, stroke=0, fill=1)
        font(c, FONT_BODY_BOLD, 7.5, primary)
        c.drawString(x + 0.18 * inch, y - 0.28 * inch, f"{idx:02d}")
        draw_inline_hex_text(c, point, x + 0.55 * inch, y - 0.28 * inch, 32 if has_rail else 42, 10.2, 13.6, "#1D1D1D")
        x += w + 0.25 * inch


def draw_text_slide(c: canvas.Canvas, title: str, body: list[str], primary: str, light: str, page: int, images: list[Path] | None = None, colors_found: list[str] | None = None) -> int:
    new_slide(c, primary, light, page)
    draw_kicker_title(c, "DNA COMPLETO", title[:68] or "Notas", primary)
    colors_found = colors_found or []
    has_rail = False
    content_right = SLIDE_W - MARGIN
    if body and all(item.strip().startswith("-") for item in body):
        bullet_points = [sentence_case(item.strip("- ")) for item in body]
        if len(bullet_points) > 8 and all(len(point) <= 145 for point in bullet_points):
            draw_compact_point_matrix(c, bullet_points, primary)
        elif page % 3 == 0:
            draw_chip_grid(c, bullet_points, primary, has_rail)
        elif page % 3 == 1:
            draw_numbered_lines(c, bullet_points, primary, has_rail)
        else:
            draw_two_column_editorial(c, bullet_points, primary, has_rail)
        return page + 1

    points: list[str] = []
    for para in body:
        points.extend(split_into_points(para))
    if len(points) <= 2:
        draw_statement_slide(c, points, primary, has_rail)
    else:
        variant = page % 4
        if len(points) > 8 and all(len(point) <= 145 for point in points):
            draw_compact_point_matrix(c, points, primary)
        elif variant == 0:
            draw_two_column_editorial(c, points, primary, has_rail)
        elif variant == 1:
            draw_numbered_lines(c, points, primary, has_rail)
        elif variant == 2:
            draw_chip_grid(c, points, primary, has_rail)
        else:
            card_w = (content_right - MARGIN - 0.24 * inch) / 2
            col_x = [MARGIN, MARGIN + card_w + 0.24 * inch]
            col_y = [SLIDE_H - 2.2 * inch, SLIDE_H - 2.2 * inch]
            for idx, point in enumerate(points[:6], start=1):
                col = 0 if col_y[0] >= col_y[1] else 1
                card_h = card_height_for(point)
                if col_y[col] - card_h < 0.72 * inch:
                    continue
                x = col_x[col]
                y = col_y[col] - card_h
                draw_card(c, x, y, card_w, card_h, point, primary, idx)
                col_y[col] = y - 0.22 * inch
    return page + 1


def chunk_visual_weight(items: list[str]) -> float:
    weight = 0.0
    for item in items:
        points = split_into_points(item)
        if not points:
            continue
        weight += max(0.7, sum(max(0.45, len(point) / 165) for point in points))
    return weight


def text_chunks(items: list[str], max_chars: int = 2600, max_weight: float = 6.3) -> list[list[str]]:
    chunks: list[list[str]] = []
    current: list[str] = []
    total = 0
    weight = 0.0
    for item in items:
        item_weight = chunk_visual_weight([item])
        if (total + len(item) > max_chars or weight + item_weight > max_weight) and current:
            chunks.append(current)
            current = [item]
            total = len(item)
            weight = item_weight
        else:
            current.append(item)
            total += len(item)
            weight += item_weight
    if current:
        chunks.append(current)
    return chunks


def is_empty_text(text: str) -> bool:
    cleaned = re.sub(r"[\s\-–—_]+", "", text or "")
    return not cleaned


def is_major_section(title: str, level: int) -> bool:
    return False


def draw_content(c: canvas.Canvas, markdown: str, primary: str, light: str, page: int, images: list[Path], colors_found: list[str]) -> int:
    section = "Síntese"
    pending: list[str] = []
    rendered_content_slides = 0
    rendered_tables = 0
    rendered_sections: set[str] = set()

    def flush_pending() -> None:
        nonlocal pending, page, rendered_content_slides
        useful = [item for item in pending if not is_empty_text(item)]
        if not useful:
            pending = []
            return
        for chunk in text_chunks(useful):
            if rendered_content_slides >= MAX_CONTENT_SLIDES:
                break
            page = draw_text_slide(c, section, chunk, primary, light, page, images, colors_found)
            rendered_content_slides += 1
        pending = []

    for kind, text, level in blocks(markdown):
        if kind == "h":
            if level >= 4 and pending:
                pending.append(f"{text}:")
                continue
            flush_pending()
            section = text
            if is_major_section(text, level) and text not in rendered_sections:
                page = draw_section_slide(c, text, primary, light, page)
                rendered_sections.add(text)
        elif kind == "table":
            if is_pdf_noise(section) or any(is_pdf_noise(cell) for cell in text[0]):
                continue
            flush_pending()
            if rendered_tables >= MAX_TABLE_SLIDES:
                continue
            page = draw_table_slide(c, text[0], text[1], primary, light, page, section)
            rendered_tables += 1
        elif kind == "li":
            if not is_empty_text(text):
                pending.append(f"- {text}")
        elif kind == "p":
            if not is_empty_text(text):
                pending.append(text)
    flush_pending()
    return page


def build_html(project_dir: Path, markdown: str, colors_found: list[str], images: list[Path], logo: Path | None) -> str:
    primary = safe_hex(colors_found[0] if colors_found else "#111111")
    swatches = "".join(f"<span style='background:{color}'>{color}</span>" for color in colors_found[:16])
    gallery = "".join(
        f"<figure><img src='{html.escape(str(path))}'><figcaption>{html.escape(path.relative_to(project_dir).as_posix())}</figcaption></figure>"
        for path in images
    )
    logo_html = f"<img class='logo' src='{html.escape(str(logo))}'>" if logo else ""
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>DNA Criativo</title>
<style>
body{{margin:0;background:#efede8;color:#161616;font-family:Helvetica,Arial,sans-serif}}
section{{width:1280px;min-height:720px;padding:72px;box-sizing:border-box;border-top:12px solid {primary};page-break-after:always}}
h1{{font-size:76px;line-height:.95;margin:120px 0 24px}}h2{{font-size:42px;margin:0 0 28px}}p{{font-size:22px;line-height:1.35;max-width:900px}}
.logo{{max-width:240px;max-height:110px}}.swatches{{display:grid;grid-template-columns:repeat(8,1fr);gap:14px}}.swatches span{{height:110px;padding:14px;color:white;font-weight:bold;box-sizing:border-box}}
.gallery{{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}}figure{{margin:0}}img{{width:100%;height:190px;object-fit:cover}}figcaption{{font-size:12px;color:#555;margin-top:6px}}
</style></head><body>
<section>{logo_html}<h1>{html.escape(project_name(project_dir))}</h1><p>DNA Criativo em formato de apresentação editorial.</p></section>
<section><h2>Paleta</h2><div class="swatches">{swatches}</div></section>
<section><h2>Imagens analisadas ({len(images)})</h2><div class="gallery">{gallery}</div></section>
</body></html>"""


def render(project_dir: Path) -> tuple[Path, Path]:
    refs_dir = reference_dir(project_dir)
    out_dir = output_dir(project_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    dna_path = out_dir / "DNA.md"
    if not dna_path.exists():
        legacy = project_dir / "dna-criativo" / "DNA.md"
        if legacy.exists():
            dna_path = legacy
        else:
            raise FileNotFoundError(f"Não encontrei DNA.md em {out_dir}")

    markdown = read(dna_path)
    colors_found = hex_colors(markdown)
    primary = safe_hex(colors_found[0] if colors_found else "#111111")
    light = "#F4F0EA"
    for candidate in colors_found:
        if readable_on(candidate) == "#111111":
            light = candidate
            break

    images = collect_images(refs_dir)
    typefaces = collect_site_typography(project_dir, refs_dir)
    logo = collect_logo(images)
    gallery_images = unique_visual_images([image for image in images if image != logo and image_kind(image) == "photo"])[:MAX_GALLERY_IMAGES]
    pdf_path = out_dir / "DNA.pdf"
    html_path = out_dir / "DNA.html"

    c = canvas.Canvas(str(pdf_path), pagesize=(SLIDE_W, SLIDE_H))
    c.setTitle(f"DNA Criativo - {project_name(project_dir)}")
    draw_cover(c, project_name(project_dir), logo, colors_found, primary, light)
    page = 1
    color_usage = visual_color_usage(gallery_images, colors_found)
    page = draw_palette_slide(c, colors_found, color_usage, primary, light, page)
    page = draw_typography_slide(c, typefaces, primary, light, page)
    page = draw_gallery_intro(c, gallery_images, primary, light, page)
    page = draw_gallery_pages(c, project_dir, gallery_images, primary, light, page)
    draw_content(c, markdown, primary, light, page, gallery_images, colors_found)
    c.save()

    html_path.write_text(build_html(project_dir, markdown, colors_found, gallery_images, logo), encoding="utf-8")
    return pdf_path, html_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Renderiza resultado/DNA.pdf em formato de apresentação a partir de resultado/DNA.md e referencias/.")
    parser.add_argument("project_dir")
    args = parser.parse_args()
    pdf_path, html_path = render(Path(args.project_dir).expanduser().resolve())
    print(f"PDF: {pdf_path}")
    print(f"HTML: {html_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
