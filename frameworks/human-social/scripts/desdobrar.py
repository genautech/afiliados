#!/usr/bin/env python3
"""
desdobrar.py — infraestrutura do desdobramento.

Python stdlib apenas. A inteligencia (vision, prompts, copy) e do Claude
que invoca a skill. Este script so faz:

    check-cli                                       — testa Higgsfield CLI/login
    check-key                                       — alias legado para check-cli
    prep <pasta>                                    — cria desdobramento/, lista inputs
    generate <pasta> <formato> <prompt-file> ...    — gera 1 peca via Higgsfield CLI
    presentation-pdf <pasta>                        — gera PDF final da entrega
    download <url> <out>                            — baixa resultado pra disco

Premissa atual do projeto: Higgsfield CLI e o provedor principal.
"""
from __future__ import annotations

import argparse
import datetime as dt
import io
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import textwrap
import urllib.error
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I)
URL_RE = re.compile(r"https://[^ \"']+\.(?:png|jpg|jpeg|webp)(?:\?[^ \"']*)?", re.I)

_DIMENSIONS = {
    "ig-feed": (1080, 1440, "3:4"),
    "ig-stories": (1080, 1920, "9:16"),
    "linkedin-feed": (1920, 1080, "16:9"),
}


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def higgsfield_model() -> str:
    return os.environ.get("HIGGSFIELD_SOCIAL_IMAGE_MODEL", os.environ.get("HIGGSFIELD_GPT_IMAGE_MODEL", "gpt_image_2"))


def higgsfield_quality() -> str:
    quality = os.environ.get("HIGGSFIELD_SOCIAL_IMAGE_QUALITY", "high").lower()
    return quality if quality in {"low", "medium", "high"} else "high"


def higgsfield_resolution() -> str:
    resolution = os.environ.get("HIGGSFIELD_IMAGE_RESOLUTION", "2k").lower()
    return resolution if resolution in {"1k", "2k", "4k"} else "2k"


def run_cmd(args: list[str], timeout: int = 1800) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )


def parse_first_uuid(text: str) -> str | None:
    match = UUID_RE.search(text)
    return match.group(0) if match else None


def parse_first_url(text: str) -> str | None:
    match = URL_RE.search(text)
    return match.group(0) if match else None


def story_variation_rules(output_name: str | None) -> str:
    name = (output_name or "").lower()
    if "02" in name or "-2" in name or "_2" in name:
        return """Story 02 visual variation: create the clearest change in the sequence.
Use a different derivative background/image from the master: alternate camera angle,
pose, related setting, lighting, or a strong solid brand-color field with the
campaign typography on top. Do not reuse the same background photo."""
    if "03" in name or "-3" in name or "_3" in name:
        return """Story 03 visual variation: create a closing frame with a different
background/composition from Story 01 and Story 02. It may use a brand-color solid
area, changed lighting, or a new derivative scene based on the master artwork.
Do not reuse the same background photo."""
    if "01" in name or "-1" in name or "_1" in name:
        return """Story 01 visual variation: this may stay closest to the master artwork,
but still adjust crop, depth, background extension or lighting enough that it is
not just the same image with new text."""
    return """Story visual variation: change the background image or composition visibly.
Do not keep the exact same background and only replace the text."""


def prompt_with_reference_rules(
    prompt: str,
    formato: str,
    base_name: str,
    ref_names: list[str],
    output_name: str | None = None,
) -> str:
    secondary = ""
    if len(ref_names) > 1:
        secondary = f"\nSecondary references, only for style context: {', '.join(ref_names[1:6])}."
    if formato == "ig-stories":
        return f"""First image is the master artwork for Instagram Stories: {base_name}.
Use it as the visual identity reference, not as a frame to copy.
Preserve the campaign identity: brand/logo/signature, font style, palette,
graphic language, mood, and the recognizable product/person archetype.
Create a derivative story frame with a visibly different image/background:
alternate angle, pose, related setting, crop, lighting, background/canvas,
or a clean solid brand-color field. The exact same background photo with
only new text is NOT acceptable.
The three Stories must feel like one sequence, but each must have its own
visual background/composition.
{story_variation_rules(output_name)}
Do not change the brand identity, invent unrelated objects or abandon the original campaign style.
Render one final integrated 9:16 image with design and lettering included.{secondary}

{prompt.strip()}"""
    return f"""First image is the master artwork for {formato}: {base_name}.
Stay very faithful to the master artwork: keep the same photo/background, visible elements,
font style, palette, graphic elements, logo/signature and composition logic.
Do not add new objects, remove important elements, change the brand style or redesign the piece.
Change only the requested format/crop/canvas, safe area, background extension and text.
Render one final integrated image with design and lettering included.{secondary}

{prompt.strip()}"""


def resolve_base_path(pasta_p: Path, base: str) -> Path:
    base_p = Path(base).expanduser()
    if not base_p.is_absolute():
        base_p = pasta_p / base_p
    return base_p.resolve()


def cmd_check_cli() -> int:
    if not shutil.which("higgsfield"):
        print(json.dumps({
            "status": "missing",
            "message": "Higgsfield CLI nao encontrado. Instale com: npm install -g @higgsfield/cli",
        }, ensure_ascii=False))
        return 1

    result = run_cmd(["higgsfield", "account", "status"], timeout=60)
    if result.returncode == 0:
        print(json.dumps({
            "status": "ok",
            "message": "Higgsfield CLI instalado e autenticado.",
            "detail": result.stdout.strip()[:800],
        }, ensure_ascii=False))
        return 0

    print(json.dumps({
        "status": "login_required",
        "message": "Higgsfield CLI existe, mas precisa de login. Rode higgsfield auth login.",
        "detail": result.stdout.strip()[:800],
    }, ensure_ascii=False))
    return 2


def cmd_save_key_legacy(_: str) -> int:
    print(json.dumps({
        "status": "deprecated",
        "message": "save-key e legado. Agora use Higgsfield CLI com higgsfield auth login.",
    }, ensure_ascii=False))
    return 0


def cmd_prep(pasta: str) -> int:
    p = Path(pasta).expanduser().resolve()
    if not p.exists() or not p.is_dir():
        print(f"ERRO: pasta nao existe: {p}", file=sys.stderr)
        return 1

    txts = sorted(x for x in p.iterdir() if x.is_file() and x.suffix.lower() == ".txt")
    txts = [t for t in txts if t.parent == p]
    if not txts:
        print(f"ERRO: nenhum arquivo .txt encontrado em {p}. Coloque a legenda/briefing num .txt.", file=sys.stderr)
        return 1
    texto = txts[0]

    imagens = sorted(x for x in p.iterdir() if x.is_file() and x.suffix.lower() in IMG_EXTS)
    if not imagens:
        print(f"ERRO: nenhuma imagem (.png/.jpg/.jpeg/.webp) em {p}.", file=sys.stderr)
        return 1

    saida = p / "desdobramento"
    saida.mkdir(exist_ok=True)
    (saida / "instagram-stories").mkdir(exist_ok=True)
    (saida / "_logs").mkdir(exist_ok=True)
    (saida / "output").mkdir(exist_ok=True)

    manifest = {
        "pasta": str(p),
        "criado_em": now_iso(),
        "provider": "higgsfield_cli",
        "model": higgsfield_model(),
        "quality": higgsfield_quality() if higgsfield_model() == "gpt_image_2" else None,
        "inputs": {
            "texto": texto.name,
            "imagens": [img.name for img in imagens],
        },
        "outputs": {
            "instagram_feed": {"imagem": None, "legenda": None, "higgsfield_url": None},
            "instagram_stories": {"frames": [], "roteiro": None},
            "linkedin_feed": {"imagem": None, "legenda": None, "higgsfield_url": None},
            "presentation_pdf": None,
            "output_folder": "output",
        },
        "status": "preparando",
    }
    (saida / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    info = {
        "pasta": str(p),
        "saida": str(saida),
        "output": str(saida / "output"),
        "texto_arquivo": str(texto),
        "texto_conteudo": texto.read_text(encoding="utf-8"),
        "imagens": [str(img) for img in imagens],
        "manifest": str(saida / "manifest.json"),
        "provider": "higgsfield_cli",
        "model": higgsfield_model(),
        "quality": higgsfield_quality() if higgsfield_model() == "gpt_image_2" else None,
    }
    print(json.dumps(info, indent=2, ensure_ascii=False))
    return 0


def upload_reference(path: Path) -> str | None:
    result = run_cmd(["higgsfield", "upload", "create", str(path)], timeout=300)
    uuid = parse_first_uuid(result.stdout)
    if not uuid:
        print(f"ERRO: nao consegui extrair UUID do upload de {path.name}. Saida: {result.stdout[:500]}", file=sys.stderr)
    return uuid


def cmd_generate(
    pasta: str,
    formato: str,
    prompt_file: str,
    base: str | None,
    output_name: str | None,
    reference_mode: str,
) -> int:
    if formato not in _DIMENSIONS:
        print(f"ERRO: formato invalido '{formato}'. Aceitos: {list(_DIMENSIONS.keys())}", file=sys.stderr)
        return 1

    check = cmd_check_cli()
    if check != 0:
        return check

    pasta_p = Path(pasta).expanduser().resolve()
    saida_root = pasta_p / "desdobramento"
    if not saida_root.exists():
        print("ERRO: desdobramento/ nao existe. Rode `prep` primeiro.", file=sys.stderr)
        return 1

    prompt_p = Path(prompt_file).expanduser().resolve()
    if not prompt_p.exists():
        print(f"ERRO: prompt-file nao existe: {prompt_p}", file=sys.stderr)
        return 1
    prompt = prompt_p.read_text(encoding="utf-8")

    imagens = sorted(x for x in pasta_p.iterdir() if x.is_file() and x.suffix.lower() in IMG_EXTS)
    if not imagens:
        print(f"ERRO: nenhuma imagem na pasta {pasta_p}", file=sys.stderr)
        return 1

    if base:
        base_p = resolve_base_path(pasta_p, base)
        if not base_p.exists():
            print(f"ERRO: imagem base '{base}' nao encontrada em {pasta_p}", file=sys.stderr)
            return 1
        ordem = [base_p] + ([img for img in imagens if img != base_p] if reference_mode == "all" else [])
    else:
        ordem = imagens if reference_mode == "all" else [imagens[0]]
    ordem = ordem[:16]
    base_reference = ordem[0]
    prompt = prompt_with_reference_rules(prompt, formato, base_reference.name, [img.name for img in ordem], output_name)

    refs: list[str] = []
    for img in ordem:
        uuid = upload_reference(img)
        if uuid:
            refs.append(uuid)
    if not refs:
        print("ERRO: nenhum UUID de referencia foi criado no Higgsfield.", file=sys.stderr)
        return 1

    w, h, aspect = _DIMENSIONS[formato]
    model = higgsfield_model()
    resolution = higgsfield_resolution()
    quality = higgsfield_quality()
    args = [
        "higgsfield", "generate", "create", model,
        "--prompt", prompt,
        "--aspect_ratio", aspect,
        "--resolution", resolution,
        "--json",
    ]
    if model == "gpt_image_2":
        args.extend(["--quality", quality])
    for ref in refs:
        args.extend(["--image", ref])

    create = run_cmd(args, timeout=300)
    job_id = parse_first_uuid(create.stdout)
    if not job_id:
        print(f"ERRO: Higgsfield nao retornou job_id. Saida: {create.stdout[:800]}", file=sys.stderr)
        return 1

    wait = run_cmd(["higgsfield", "generate", "wait", job_id, "--timeout", "30m", "--json"], timeout=2100)
    combined = create.stdout + "\n" + wait.stdout
    out_url = parse_first_url(combined)
    if not out_url:
        print(f"ERRO: Higgsfield nao retornou URL de imagem. Saida: {combined[:1000]}", file=sys.stderr)
        return 1

    if formato == "ig-stories":
        out_dir = saida_root / "instagram-stories"
        out_dir.mkdir(exist_ok=True)
        nome = output_name or "story.png"
    elif formato == "ig-feed":
        out_dir = saida_root
        nome = output_name or "instagram-feed.png"
    else:
        out_dir = saida_root
        nome = output_name or "linkedin-feed.png"
    out_path = out_dir / nome

    try:
        with urllib.request.urlopen(out_url, timeout=120) as resp:
            img_bytes = resp.read()
        out_path.write_bytes(img_bytes)
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        print(f"ERRO ao baixar imagem gerada: {exc}", file=sys.stderr)
        return 1

    log_path = saida_root / "_logs" / f"{out_path.stem}.json"
    log_path.write_text(json.dumps({
        "provider": "higgsfield_cli",
        "model": model,
        "resolution": resolution,
        "quality": quality if model == "gpt_image_2" else None,
        "job_id": job_id,
        "base_reference": str(base_reference),
        "reference_mode": reference_mode,
        "reference_files": [str(img) for img in ordem],
        "references": refs,
        "url": out_url,
        "stdout": combined[-4000:],
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    result = {
        "status": "ok",
        "provider": "higgsfield_cli",
        "model": model,
        "resolution": resolution,
        "quality": quality if model == "gpt_image_2" else None,
        "formato": formato,
        "job_id": job_id,
        "output_path": str(out_path),
        "output_size_kb": len(img_bytes) // 1024,
        "higgsfield_url": out_url,
        "base_reference": str(base_reference),
        "reference_mode": reference_mode,
        "reference_files": [str(img) for img in ordem],
        "dimensions": {"width": w, "height": h, "aspect_ratio": aspect},
        "references_count": len(refs),
        "log": str(log_path),
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


def _pdf_escape(text: str) -> str:
    data = text.encode("latin-1", "replace")
    data = data.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")
    return data.decode("latin-1")


def _jpeg_dimensions(data: bytes) -> tuple[int, int] | None:
    if not data.startswith(b"\xff\xd8"):
        return None
    i = 2
    while i < len(data) - 9:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        i += 2
        if marker in {0xD8, 0xD9}:
            continue
        if i + 2 > len(data):
            return None
        size = int.from_bytes(data[i:i + 2], "big")
        if marker in range(0xC0, 0xC4):
            return int.from_bytes(data[i + 5:i + 7], "big"), int.from_bytes(data[i + 3:i + 5], "big")
        i += size
    return None


def _unfilter_png_row(filter_type: int, row: bytes, prev: bytes, bpp: int) -> bytes:
    out = bytearray(row)
    for i, value in enumerate(row):
        left = out[i - bpp] if i >= bpp else 0
        up = prev[i] if prev else 0
        up_left = prev[i - bpp] if prev and i >= bpp else 0
        if filter_type == 1:
            out[i] = (value + left) & 0xFF
        elif filter_type == 2:
            out[i] = (value + up) & 0xFF
        elif filter_type == 3:
            out[i] = (value + ((left + up) // 2)) & 0xFF
        elif filter_type == 4:
            p = left + up - up_left
            pa, pb, pc = abs(p - left), abs(p - up), abs(p - up_left)
            pr = left if pa <= pb and pa <= pc else up if pb <= pc else up_left
            out[i] = (value + pr) & 0xFF
    return bytes(out)


def _png_image_for_pdf(data: bytes) -> tuple[bytes, int, int, str] | None:
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return None
    pos = 8
    width = height = bit_depth = color_type = None
    idat = bytearray()
    while pos + 8 <= len(data):
        length = int.from_bytes(data[pos:pos + 4], "big")
        chunk_type = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type = struct.unpack(">IIBB", chunk[:10])[:4]
        elif chunk_type == b"IDAT":
            idat.extend(chunk)
        elif chunk_type == b"IEND":
            break
    if not width or not height or bit_depth != 8 or color_type not in {0, 2, 6}:
        return None
    channels = {0: 1, 2: 3, 6: 4}[color_type]
    bpp = channels
    raw = zlib.decompress(bytes(idat))
    stride = width * channels
    rows: list[bytes] = []
    prev = b""
    offset = 0
    for _ in range(height):
        filter_type = raw[offset]
        offset += 1
        row = _unfilter_png_row(filter_type, raw[offset:offset + stride], prev, bpp)
        offset += stride
        prev = row
        if color_type == 6:
            rgb = bytearray()
            for i in range(0, len(row), 4):
                rgb.extend(row[i:i + 3])
            rows.append(bytes(rgb))
        elif color_type == 0:
            rgb = bytearray()
            for gray in row:
                rgb.extend([gray, gray, gray])
            rows.append(bytes(rgb))
        else:
            rows.append(row)
    return zlib.compress(b"".join(rows)), width, height, "FlateDecode"


def _image_for_pdf(path: Path) -> tuple[bytes, int, int, str] | None:
    try:
        from PIL import Image

        img = Image.open(path).convert("RGB")
        img.thumbnail((1800, 1800))
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=85, optimize=True)
        return out.getvalue(), img.width, img.height, "DCTDecode"
    except Exception:
        data = path.read_bytes()
        dims = _jpeg_dimensions(data)
        if dims:
            w, h = dims
            return data, w, h, "DCTDecode"
        return _png_image_for_pdf(data)


class SimplePDF:
    def __init__(self) -> None:
        self.objects: list[bytes] = []
        self.pages: list[int] = []
        self.image_cache: dict[Path, tuple[str, int, int, int]] = {}
        self.page_w = 595
        self.page_h = 842
        self.add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        self.add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
        self.add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>")

    def add_obj(self, body: bytes) -> int:
        self.objects.append(body)
        return len(self.objects)

    def image_name(self, path: Path) -> tuple[str, int, int] | None:
        path = path.resolve()
        if path in self.image_cache:
            name, _, w, h = self.image_cache[path]
            return name, w, h
        image = _image_for_pdf(path)
        if not image:
            return None
        data, w, h, filter_name = image
        obj = self.add_obj(
            f"<< /Type /XObject /Subtype /Image /Width {w} /Height {h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /{filter_name} /Length {len(data)} >>\nstream\n".encode("latin-1")
            + data
            + b"\nendstream"
        )
        name = f"Im{len(self.image_cache) + 1}"
        self.image_cache[path] = (name, obj, w, h)
        return name, w, h

    def add_page(self, commands: list[str], images: set[str] | None = None) -> None:
        content = "\n".join(commands).encode("latin-1", "replace")
        content_obj = self.add_obj(f"<< /Length {len(content)} >>\nstream\n".encode("latin-1") + content + b"\nendstream")
        xobjects = ""
        if images:
            for path, (name, obj, _, _) in self.image_cache.items():
                if name in images:
                    xobjects += f"/{name} {obj} 0 R "
        resources = f"<< /Font << /F1 1 0 R /F2 2 0 R /F3 3 0 R >>"
        if xobjects:
            resources += f" /XObject << {xobjects}>>"
        resources += " >>"
        page = self.add_obj(
            f"<< /Type /Page /Parent {{PAGES}} 0 R /MediaBox [0 0 {self.page_w} {self.page_h}] /Resources {resources} /Contents {content_obj} 0 R >>".encode("latin-1")
        )
        self.pages.append(page)

    def write(self, path: Path) -> None:
        pages_body = "<< /Type /Pages /Kids [" + " ".join(f"{p} 0 R" for p in self.pages) + f"] /Count {len(self.pages)} >>"
        pages_obj = self.add_obj(pages_body.encode("latin-1"))
        catalog_obj = self.add_obj(f"<< /Type /Catalog /Pages {pages_obj} 0 R >>".encode("latin-1"))
        patched: list[bytes] = []
        for body in self.objects:
            patched.append(body.replace(b"{PAGES}", str(pages_obj).encode("latin-1")))
        out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        for idx, body in enumerate(patched, start=1):
            offsets.append(len(out))
            out.extend(f"{idx} 0 obj\n".encode("latin-1"))
            out.extend(body)
            out.extend(b"\nendobj\n")
        xref = len(out)
        out.extend(f"xref\n0 {len(patched) + 1}\n0000000000 65535 f \n".encode("latin-1"))
        for offset in offsets[1:]:
            out.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
        out.extend(f"trailer << /Size {len(patched) + 1} /Root {catalog_obj} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("latin-1"))
        path.write_bytes(out)


def _text_commands(text: str, x: int, y: int, size: int = 11, font: str = "F1", max_chars: int = 84, leading: int = 15, max_lines: int | None = None) -> tuple[list[str], int]:
    commands: list[str] = []
    lines: list[str] = []
    for para in text.splitlines() or [""]:
        if not para.strip():
            lines.append("")
            continue
        lines.extend(textwrap.wrap(para, width=max_chars, break_long_words=False) or [""])
    if max_lines is not None:
        lines = lines[:max_lines]
    cur_y = y
    for line in lines:
        if line:
            commands.append(f"BT /{font} {size} Tf {x} {cur_y} Td ({_pdf_escape(line)}) Tj ET")
        cur_y -= leading
    return commands, cur_y


def _image_command(pdf: SimplePDF, path: Path, x: int, y: int, box_w: int, box_h: int, used: set[str]) -> list[str]:
    info = pdf.image_name(path)
    if not info:
        return [f"{x} {y} {box_w} {box_h} re S", f"BT /F3 10 Tf {x + 12} {y + box_h // 2} Td ({_pdf_escape(path.name)} nao pode ser exibida) Tj ET"]
    name, w, h = info
    used.add(name)
    scale = min(box_w / w, box_h / h)
    draw_w = w * scale
    draw_h = h * scale
    dx = x + (box_w - draw_w) / 2
    dy = y + (box_h - draw_h) / 2
    return [f"q {draw_w:.2f} 0 0 {draw_h:.2f} {dx:.2f} {dy:.2f} cm /{name} Do Q"]


def _read_optional(path: Path, max_chars: int = 3500) -> str:
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    return text[:max_chars] + ("\n..." if len(text) > max_chars else "")


def _write_manifest_pdf(saida: Path, pdf_path: Path) -> None:
    manifest_path = saida / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        outputs = manifest.setdefault("outputs", {})
        outputs["presentation_pdf"] = str(pdf_path.name)
        output_dir = saida / "output"
        if output_dir.exists():
            outputs["output_folder"] = str(output_dir.name)
        manifest["concluido_em"] = now_iso()
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")


def _copy_if_exists(src: Path, dst: Path) -> bool:
    if not src.exists():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return True


def _sync_output_folder(saida: Path, pdf_path: Path) -> Path:
    output = saida / "output"
    feed_dir = output / "01-instagram-feed"
    stories_dir = output / "02-instagram-stories"
    linkedin_dir = output / "03-linkedin-feed"
    presentation_dir = output / "04-apresentacao"
    for folder in (feed_dir, stories_dir, linkedin_dir, presentation_dir):
        if folder.exists():
            shutil.rmtree(folder)
    for folder in (feed_dir, stories_dir, linkedin_dir, presentation_dir):
        folder.mkdir(parents=True, exist_ok=True)

    _copy_if_exists(saida / "instagram-feed.png", feed_dir / "instagram-feed.png")
    _copy_if_exists(saida / "instagram-feed.txt", feed_dir / "legenda-instagram-feed.txt")
    _copy_if_exists(saida / "linkedin-feed.png", linkedin_dir / "linkedin-feed.png")
    _copy_if_exists(saida / "linkedin-feed.txt", linkedin_dir / "legenda-linkedin-feed.txt")
    _copy_if_exists(saida / "instagram-stories" / "roteiro.txt", stories_dir / "roteiro-stories.txt")
    for story in sorted((saida / "instagram-stories").glob("story-*.png")):
        _copy_if_exists(story, stories_dir / story.name)
    _copy_if_exists(pdf_path, presentation_dir / "apresentacao-desdobramento.pdf")

    readme = """Human Social - entrega limpa

Esta pasta junta os arquivos finais para o usuario abrir sem entrar nos logs e prompts tecnicos.

01-instagram-feed/
Arte final e legenda do Feed.

02-instagram-stories/
Tres frames de Stories e roteiro frame a frame.

03-linkedin-feed/
Arte final e texto do LinkedIn.

04-apresentacao/
PDF de apresentacao do desdobramento.
"""
    (output / "README.txt").write_text(readme, encoding="utf-8")
    return output


def _cmd_presentation_pdf_reportlab(
    p: Path,
    saida: Path,
    pdf_path: Path,
    source_text: str,
    source_images: list[Path],
    output_images: list[Path],
) -> int:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import inch
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas

    page_w, page_h = 13.333 * inch, 7.5 * inch
    bg = colors.HexColor("#F5F7FA")
    ink = colors.HexColor("#171717")
    muted = colors.HexColor("#5F6672")
    line = colors.HexColor("#D8DEE8")
    panel = colors.HexColor("#FFFFFF")
    accent = colors.HexColor("#245BFF")
    accent_2 = colors.HexColor("#087A68")
    dark_panel = colors.HexColor("#141821")

    font_regular = "Helvetica"
    font_bold = "Helvetica-Bold"
    font_oblique = "Helvetica-Oblique"
    font_candidates = [
        ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        ("/System/Library/Fonts/Supplemental/Helvetica.ttf", "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]
    for regular_path, bold_path in font_candidates:
        if Path(regular_path).exists():
            pdfmetrics.registerFont(TTFont("HumanSans", regular_path))
            font_regular = "HumanSans"
            font_oblique = "HumanSans"
            if Path(bold_path).exists():
                pdfmetrics.registerFont(TTFont("HumanSans-Bold", bold_path))
                font_bold = "HumanSans-Bold"
            else:
                font_bold = "HumanSans"
            break

    c = canvas.Canvas(str(pdf_path), pagesize=(page_w, page_h))
    c.setTitle("Apresentação do desdobramento")
    c.setAuthor("Human Social")

    def clean_text(text: str) -> str:
        replacements = {
            "\u2014": "-",
            "\u2013": "-",
            "\u2192": "->",
            "\u2193": "↓",
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        return text.strip()

    def wrap_lines(text: str, font: str, size: int, max_width: float, max_lines: int) -> list[str]:
        text = clean_text(text)
        lines: list[str] = []
        for para in text.splitlines() or [""]:
            words = para.split()
            if not words:
                if lines and len(lines) < max_lines:
                    lines.append("")
                continue
            cur = ""
            for word in words:
                candidate = f"{cur} {word}".strip()
                if pdfmetrics.stringWidth(candidate, font, size) <= max_width:
                    cur = candidate
                else:
                    if cur:
                        lines.append(cur)
                    cur = word
                if len(lines) >= max_lines:
                    break
            if len(lines) >= max_lines:
                break
            if cur:
                lines.append(cur)
            if len(lines) >= max_lines:
                break
        if len(lines) == max_lines and len(text) > sum(len(line) for line in lines):
            lines[-1] = lines[-1].rstrip(". ") + "..."
        return lines[:max_lines]

    def draw_text_block(
        text: str,
        x: float,
        y: float,
        width: float,
        font: str = font_regular,
        size: int = 12,
        leading: int = 16,
        max_lines: int = 20,
        color=ink,
    ) -> float:
        c.setFillColor(color)
        c.setFont(font, size)
        cur_y = y
        for line_text in wrap_lines(text, font, size, width, max_lines):
            if line_text:
                c.drawString(x, cur_y, line_text)
            cur_y -= leading
        return cur_y

    page_number = 0

    def draw_page(label: str) -> None:
        nonlocal page_number
        page_number += 1
        c.setFillColor(bg)
        c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
        c.setFillColor(ink)
        c.setFont(font_bold, 9)
        c.drawString(48, page_h - 34, "HUMAN SOCIAL")
        c.setFillColor(accent)
        c.roundRect(48, page_h - 50, 74, 4, 2, stroke=0, fill=1)
        c.setFillColor(muted)
        c.setFont(font_regular, 8)
        c.drawRightString(page_w - 48, page_h - 34, f"{page_number:02d} / {label.upper()}")
        c.setStrokeColor(line)
        c.line(48, 48, page_w - 48, 48)
        c.setFillColor(muted)
        c.setFont(font_regular, 8)
        c.drawString(48, 30, label.upper())
        c.drawRightString(page_w - 48, 30, f"{page_number:02d}")

    def draw_section_header(number: str, title: str, subtitle: str) -> None:
        c.setFillColor(accent)
        c.roundRect(58, page_h - 102, 58, 24, 12, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont(font_bold, 10)
        c.drawCentredString(87, page_h - 94, number)
        c.setFillColor(ink)
        c.setFont(font_bold, 30)
        c.drawString(58, page_h - 142, title)
        c.setFillColor(muted)
        c.setFont(font_regular, 12)
        c.drawString(60, page_h - 166, subtitle)

    def draw_chip(text: str, x: float, y: float, color=accent) -> None:
        width = max(76, pdfmetrics.stringWidth(text, font_bold, 8) + 22)
        c.setFillColor(color)
        c.roundRect(x, y, width, 22, 11, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont(font_bold, 8)
        c.drawCentredString(x + width / 2, y + 8, text.upper())

    def draw_info_card(title: str, body: str, x: float, y: float, width: float, height: float, color=accent) -> None:
        c.setFillColor(panel)
        c.roundRect(x, y, width, height, 18, stroke=0, fill=1)
        c.setStrokeColor(line)
        c.roundRect(x, y, width, height, 18, stroke=1, fill=0)
        c.setFillColor(color)
        c.roundRect(x + 22, y + height - 34, 54, 5, 3, stroke=0, fill=1)
        c.setFillColor(ink)
        c.setFont(font_bold, 15)
        c.drawString(x + 22, y + height - 62, title)
        draw_text_block(body, x + 22, y + height - 92, width - 44, size=10, leading=14, max_lines=7, color=muted)

    def draw_image(path: Path, x: float, y: float, width: float, height: float, fill: bool = False) -> None:
        if not path.exists():
            return
        c.setFillColor(panel)
        c.roundRect(x - 8, y - 8, width + 16, height + 16, 16, stroke=0, fill=1)
        c.setStrokeColor(line)
        c.roundRect(x - 8, y - 8, width + 16, height + 16, 16, stroke=1, fill=0)
        img = ImageReader(str(path))
        iw, ih = img.getSize()
        scale = max(width / iw, height / ih) if fill else min(width / iw, height / ih)
        draw_w = iw * scale
        draw_h = ih * scale
        dx = x + (width - draw_w) / 2
        dy = y + (height - draw_h) / 2
        c.saveState()
        path_obj = c.beginPath()
        path_obj.rect(x, y, width, height)
        c.clipPath(path_obj, stroke=0, fill=0)
        c.drawImage(str(path), dx, dy, draw_w, draw_h, preserveAspectRatio=False, mask="auto")
        c.restoreState()

    base_image = source_images[0] if source_images else None
    feed_image = saida / "instagram-feed.png"
    linkedin_image = saida / "linkedin-feed.png"
    story_paths = sorted((saida / "instagram-stories").glob("story-*.png"))[:3]
    feed_text = _read_optional(saida / "instagram-feed.txt", 1400)
    linkedin_text = _read_optional(saida / "linkedin-feed.txt", 1700)
    roteiro = _read_optional(saida / "instagram-stories" / "roteiro.txt", 1800)

    draw_page("visão geral")
    c.setFillColor(dark_panel)
    c.roundRect(58, 88, 492, 382, 28, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont(font_bold, 42)
    c.drawString(88, 392, "Desdobramento")
    c.drawString(88, 342, "Social")
    c.setFont(font_regular, 15)
    c.setFillColor(colors.HexColor("#D7DCE6"))
    c.drawString(90, 304, "Feed, Stories e LinkedIn a partir de uma arte-mãe.")
    draw_chip("GPT IMAGE 2", 90, 254, accent_2)
    c.setFillColor(colors.HexColor("#D7DCE6"))
    c.setFont(font_regular, 9)
    c.drawString(90, 98, f"Gerado em {now_iso()} · {p.name}")
    hero = feed_image if feed_image.exists() else base_image
    if hero:
        draw_image(hero, 610, 84, 260, 386, fill=True)
    cards = [
        ("01", "Base criativa", "Referência visual e texto original."),
        ("02", "Instagram Feed", "Peça retrato e legenda curta."),
        ("03", "Instagram Stories", "Três frames verticais em sequência."),
        ("04", "LinkedIn Feed", "Versão horizontal e texto editorial."),
    ]
    for idx, (num, title, body) in enumerate(cards):
        x = 86 + (idx % 2) * 228
        y = 184 - (idx // 2) * 70
        c.setFillColor(colors.HexColor("#202633"))
        c.roundRect(x, y, 190, 48, 12, stroke=0, fill=1)
        c.setFillColor(accent if idx < 2 else accent_2)
        c.setFont(font_bold, 9)
        c.drawString(x + 14, y + 28, num)
        c.setFillColor(colors.white)
        c.setFont(font_bold, 10)
        c.drawString(x + 42, y + 28, title)
        c.setFillColor(colors.HexColor("#B8C0CF"))
        c.setFont(font_regular, 8)
        c.drawString(x + 42, y + 13, body)
    c.showPage()

    if base_image:
        draw_page("01 base criativa")
        draw_section_header("01", "Base criativa", "A referência que guia personagem, composição, cor, fonte e elementos.")
        draw_chip("ARTE-MÃE", 60, page_h - 204, accent)
        draw_image(base_image, 70, 80, 360, 250, fill=True)
        draw_info_card("Texto-base", source_text or "Sem texto-base encontrado.", 508, 100, 340, 230, accent)
        c.showPage()

    if feed_image.exists() or feed_text:
        draw_page("02 instagram feed")
        draw_section_header("02", "Instagram Feed", "Peça retrato 3:4, fiel à arte-mãe e pensada para leitura rápida.")
        draw_chip("3:4 · FEED", 60, page_h - 204, accent)
        if feed_image.exists():
            draw_image(feed_image, 106, 70, 200, 267, fill=False)
        draw_info_card("Legenda do Feed", feed_text or "Legenda não encontrada.", 428, 100, 392, 238, accent)
        c.showPage()

    if story_paths:
        draw_page("03 instagram stories")
        draw_section_header("03", "Instagram Stories", "Três variações 9:16: mesma campanha, backgrounds e ritmos diferentes.")
        for idx, story in enumerate(story_paths):
            x = 102 + idx * 252
            draw_image(story, x, 74, 146, 260, fill=False)
            draw_chip(f"STORY {idx + 1:02d}", x + 24, 314, accent if idx == 0 else accent_2)
            c.setFillColor(muted)
            c.setFont(font_regular, 8)
            c.drawCentredString(x + 73, 58, "texto e background próprios")
        c.showPage()

    if roteiro:
        draw_page("03 roteiro stories")
        draw_section_header("03B", "Roteiro dos Stories", "Texto de tela, sticker e micro-CTA organizados por frame.")
        c.setFillColor(panel)
        c.roundRect(76, 78, page_w - 152, 280, 18, stroke=0, fill=1)
        c.setStrokeColor(line)
        c.roundRect(76, 78, page_w - 152, 280, 18, stroke=1, fill=0)
        draw_text_block(roteiro, 108, 324, page_w - 216, size=11, leading=16, max_lines=15, color=ink)
        c.showPage()

    if linkedin_image.exists() or linkedin_text:
        draw_page("04 linkedin feed")
        draw_section_header("04", "LinkedIn Feed", "Versão horizontal 16:9, mais editorial, ainda ligada à arte-mãe.")
        draw_chip("16:9 · LINKEDIN", 60, page_h - 204, accent_2)
        if linkedin_image.exists():
            draw_image(linkedin_image, 70, 110, 370, 208, fill=False)
        draw_info_card("Texto do LinkedIn", linkedin_text or "Legenda não encontrada.", 512, 104, 336, 224, accent_2)
        c.showPage()

    draw_page("05 entrega limpa")
    draw_section_header("05", "Entrega limpa", "Os finais ficam reunidos em output para o usuário não precisar caçar arquivo.")
    output_items = [
        ("01", "Instagram Feed", "arte final + legenda"),
        ("02", "Instagram Stories", "3 frames + roteiro"),
        ("03", "LinkedIn Feed", "arte final + texto"),
        ("04", "Apresentação", "PDF do desdobramento"),
    ]
    for idx, (num, title, body) in enumerate(output_items):
        x = 92 + (idx % 2) * 390
        y = 292 - (idx // 2) * 112
        c.setFillColor(panel)
        c.roundRect(x, y, 320, 74, 18, stroke=0, fill=1)
        c.setStrokeColor(line)
        c.roundRect(x, y, 320, 74, 18, stroke=1, fill=0)
        c.setFillColor(accent if idx < 2 else accent_2)
        c.setFont(font_bold, 13)
        c.drawString(x + 22, y + 44, num)
        c.setFillColor(ink)
        c.setFont(font_bold, 15)
        c.drawString(x + 62, y + 44, title)
        c.setFillColor(muted)
        c.setFont(font_regular, 10)
        c.drawString(x + 62, y + 22, body)
    c.showPage()

    c.save()
    output_dir = _sync_output_folder(saida, pdf_path)
    _write_manifest_pdf(saida, pdf_path)
    print(json.dumps({
        "status": "ok",
        "output_path": str(pdf_path),
        "output_folder": str(output_dir),
        "source_images": [img.name for img in source_images],
        "output_images": [img.name for img in output_images],
        "designer": "reportlab_widescreen",
    }, indent=2, ensure_ascii=False))
    return 0


def cmd_presentation_pdf(pasta: str) -> int:
    p = Path(pasta).expanduser().resolve()
    if not p.exists() or not p.is_dir():
        print(f"ERRO: pasta nao existe: {p}", file=sys.stderr)
        return 1
    saida = p / "desdobramento"
    saida.mkdir(exist_ok=True)
    pdf_path = saida / "apresentacao-desdobramento.pdf"
    txts = sorted(x for x in p.iterdir() if x.is_file() and x.suffix.lower() == ".txt")
    source_text = _read_optional(txts[0], 4500) if txts else ""
    source_images = sorted(x for x in p.iterdir() if x.is_file() and x.suffix.lower() in IMG_EXTS)
    output_images = [
        saida / "instagram-feed.png",
        saida / "linkedin-feed.png",
        *sorted((saida / "instagram-stories").glob("story-*.png")),
    ]
    output_images = [img for img in output_images if img.exists()]

    try:
        return _cmd_presentation_pdf_reportlab(p, saida, pdf_path, source_text, source_images, output_images)
    except Exception as exc:
        print(f"AVISO: PDF com layout avancado falhou ({exc}). Usando fallback simples.", file=sys.stderr)

    pdf = SimplePDF()

    cmds = ["BT /F2 26 Tf 42 790 Td (Apresentacao do desdobramento) Tj ET"]
    cmds += ["BT /F1 11 Tf 42 760 Td (Human Social / GPT Image 2) Tj ET"]
    cmds += ["BT /F1 10 Tf 42 742 Td (" + _pdf_escape(str(p)) + ") Tj ET"]
    cmds += ["BT /F1 10 Tf 42 724 Td (Gerado em: " + _pdf_escape(now_iso()) + ") Tj ET"]
    cmds += ["BT /F1 10 Tf 42 706 Td (Modelo: " + _pdf_escape(higgsfield_model()) + " / qualidade: " + _pdf_escape(higgsfield_quality()) + ") Tj ET"]
    cmds += ["BT /F2 14 Tf 42 666 Td (Base textual) Tj ET"]
    text_cmds, _ = _text_commands(source_text or "Nenhum texto-base encontrado.", 42, 642, size=10, max_chars=94, leading=13, max_lines=32)
    cmds += text_cmds
    pdf.add_page(cmds)

    if source_images:
        used: set[str] = set()
        cmds = ["BT /F2 18 Tf 42 790 Td (Imagens-base enviadas pelo usuario) Tj ET"]
        x_positions = [42, 316]
        y_positions = [520, 250]
        for idx, img in enumerate(source_images[:4]):
            x = x_positions[idx % 2]
            y = y_positions[idx // 2]
            cmds += _image_command(pdf, img, x, y, 237, 220, used)
            cmds += [f"BT /F1 9 Tf {x} {y - 16} Td ({_pdf_escape(img.name)}) Tj ET"]
        pdf.add_page(cmds, used)

    for title, image_path, text_path in [
        ("Instagram Feed", saida / "instagram-feed.png", saida / "instagram-feed.txt"),
        ("LinkedIn Feed", saida / "linkedin-feed.png", saida / "linkedin-feed.txt"),
    ]:
        if not image_path.exists() and not text_path.exists():
            continue
        used = set()
        cmds = [f"BT /F2 20 Tf 42 790 Td ({_pdf_escape(title)}) Tj ET"]
        if image_path.exists():
            cmds += _image_command(pdf, image_path, 42, 380, 230, 360, used)
        text = _read_optional(text_path, 2600) or "Legenda nao encontrada."
        text_cmds, _ = _text_commands(text, 304, 720, size=10, max_chars=42, leading=13, max_lines=40)
        cmds += text_cmds
        pdf.add_page(cmds, used)

    story_paths = sorted((saida / "instagram-stories").glob("story-*.png"))
    roteiro = _read_optional(saida / "instagram-stories" / "roteiro.txt", 3000)
    for start in range(0, len(story_paths), 2):
        used = set()
        cmds = ["BT /F2 20 Tf 42 790 Td (Instagram Stories) Tj ET"]
        for idx, img in enumerate(story_paths[start:start + 2]):
            x = 70 + idx * 255
            cmds += _image_command(pdf, img, x, 245, 205, 440, used)
            cmds += [f"BT /F1 9 Tf {x} 224 Td ({_pdf_escape(img.name)}) Tj ET"]
        if start == 0 and roteiro:
            text_cmds, _ = _text_commands(roteiro, 42, 190, size=9, max_chars=98, leading=11, max_lines=12)
            cmds += text_cmds
        pdf.add_page(cmds, used)

    pdf.write(pdf_path)

    output_dir = _sync_output_folder(saida, pdf_path)
    _write_manifest_pdf(saida, pdf_path)

    print(json.dumps({
        "status": "ok",
        "output_path": str(pdf_path),
        "output_folder": str(output_dir),
        "source_images": [img.name for img in source_images],
        "output_images": [img.name for img in output_images],
    }, indent=2, ensure_ascii=False))
    return 0


def cmd_download(url: str, output: str) -> int:
    out = Path(output).expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        with urllib.request.urlopen(url, timeout=120) as resp:
            data = resp.read()
        out.write_bytes(data)
    except urllib.error.HTTPError as exc:
        print(f"ERRO download HTTP {exc.code}: {exc.reason}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"ERRO download rede: {exc.reason}", file=sys.stderr)
        return 1
    print(f"{len(data)//1024} KB -> {out}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="desdobrar.py", description="Infraestrutura do desdobramento social.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("check-cli", help="valida Higgsfield CLI/login (status JSON)")
    sub.add_parser("check-key", help="alias legado: valida Higgsfield CLI/login")

    p_sav = sub.add_parser("save-key", help="alias legado: nao salva chave; use higgsfield auth login")
    p_sav.add_argument("chave")

    p_prep = sub.add_parser("prep", help="cria desdobramento/ e lista inputs em JSON")
    p_prep.add_argument("pasta")

    p_gen = sub.add_parser("generate", help="gera 1 peca via Higgsfield CLI")
    p_gen.add_argument("pasta")
    p_gen.add_argument("formato", choices=list(_DIMENSIONS.keys()))
    p_gen.add_argument("prompt_file")
    p_gen.add_argument("--base", default=None, help="imagem arte-mae; aceita nome na pasta, caminho relativo ou caminho absoluto")
    p_gen.add_argument("--output", default=None)
    p_gen.add_argument(
        "--reference-mode",
        choices=["base-only", "all"],
        default="base-only",
        help="base-only keeps outputs close to one master artwork; all sends every source image as secondary references",
    )

    p_pdf = sub.add_parser("presentation-pdf", help="gera PDF final com base, pecas e textos")
    p_pdf.add_argument("pasta")

    p_dl = sub.add_parser("download", help="baixa URL de imagem pra disco")
    p_dl.add_argument("url")
    p_dl.add_argument("output")

    args = parser.parse_args(argv)
    if args.cmd in ("check-cli", "check-key"):
        return cmd_check_cli()
    if args.cmd == "save-key":
        return cmd_save_key_legacy(args.chave)
    if args.cmd == "prep":
        return cmd_prep(args.pasta)
    if args.cmd == "generate":
        return cmd_generate(args.pasta, args.formato, args.prompt_file, args.base, args.output, args.reference_mode)
    if args.cmd == "presentation-pdf":
        return cmd_presentation_pdf(args.pasta)
    if args.cmd == "download":
        return cmd_download(args.url, args.output)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
