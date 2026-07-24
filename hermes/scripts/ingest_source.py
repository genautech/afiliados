#!/usr/bin/env python3
"""Normalize YouTube transcripts / ebooks into hermes/knowledge with frontmatter.

Does not call any LLM. Destillation is a separate Hermes step.
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE = ROOT / "hermes" / "knowledge"
TYPE_DIRS = {
    "youtube": KNOWLEDGE / "youtube",
    "ebook": KNOWLEDGE / "ebooks",
    "outro": KNOWLEDGE / "inbox",
}


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[-\s]+", "-", text, flags=re.UNICODE)
    return text.strip("-")[:80] or "fonte"


def read_body(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    if raw.startswith("---"):
        end = raw.find("\n---", 3)
        if end != -1:
            return raw[end + 4 :].lstrip("\n")
    return raw


def build_document(
    *,
    source_type: str,
    title: str,
    body: str,
    url: str,
    author: str,
    tags: list[str],
    source_file: str,
) -> str:
    today = date.today().isoformat()
    tag_csv = ", ".join(tags)
    lines = [
        "---",
        f"id: {source_type}-{slugify(title)}",
        f"type: {source_type}",
        f'title: "{title}"',
        f"source_file: {source_file}",
        f"source_url: {url or ''}",
        f"author: {author or ''}",
        f"tags: [{tag_csv}]",
        f"ingested_at: {today}",
        "status: raw",
        "distilled: false",
        "---",
        "",
        f"# {title}",
        "",
        "> Fonte bruta. Não carregar no prompt por padrão — destilar para `insights/`.",
        "",
        "## Conteúdo",
        "",
        body.strip(),
        "",
    ]
    return "\n".join(lines)


def append_index_row(index_path: Path, row_markdown: str) -> None:
    text = index_path.read_text(encoding="utf-8") if index_path.exists() else ""
    placeholder = "_(vazio"
    if placeholder in text:
        # Replace first empty-state row marker line if present
        lines = text.splitlines()
        out: list[str] = []
        replaced = False
        for line in lines:
            if not replaced and placeholder in line:
                out.append(row_markdown)
                replaced = True
                continue
            out.append(line)
        if not replaced:
            out.append(row_markdown)
        index_path.write_text("\n".join(out) + "\n", encoding="utf-8")
        return
    if not text.endswith("\n"):
        text += "\n"
    index_path.write_text(text + row_markdown + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Ingerir transcrição/ebook para hermes/knowledge (sem LLM)."
    )
    parser.add_argument("--file", required=True, help="Arquivo .txt/.md na inbox ou outro path")
    parser.add_argument(
        "--type",
        required=True,
        choices=sorted(TYPE_DIRS),
        help="Tipo da fonte",
    )
    parser.add_argument("--title", required=True, help="Título legível")
    parser.add_argument("--url", default="", help="URL (YouTube ou página do ebook)")
    parser.add_argument("--author", default="", help="Autor (ebooks)")
    parser.add_argument(
        "--tags",
        default="",
        help="Tags separadas por vírgula (ex: afiliados,google-ads)",
    )
    parser.add_argument(
        "--keep-inbox",
        action="store_true",
        help="Não remover o arquivo original da inbox",
    )
    args = parser.parse_args(argv)

    src = Path(args.file).expanduser().resolve()
    if not src.is_file():
        print(f"Arquivo não encontrado: {src}", file=sys.stderr)
        return 1

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    body = read_body(src)
    if not body.strip():
        print("Arquivo vazio.", file=sys.stderr)
        return 1

    out_dir = TYPE_DIRS[args.type]
    out_dir.mkdir(parents=True, exist_ok=True)
    out_name = f"{date.today().isoformat()}-{slugify(args.title)}.md"
    out_path = out_dir / out_name

    source_label = src.name
    doc = build_document(
        source_type=args.type,
        title=args.title,
        body=body,
        url=args.url,
        author=args.author,
        tags=tags,
        source_file=source_label,
    )
    out_path.write_text(doc, encoding="utf-8")

    rel = out_path.relative_to(ROOT)
    if args.type == "youtube":
        append_index_row(
            KNOWLEDGE / "youtube" / "_index.md",
            f"| {out_path.stem} | {args.title} | {', '.join(tags)} | {date.today().isoformat()} | pendente |",
        )
    elif args.type == "ebook":
        append_index_row(
            KNOWLEDGE / "ebooks" / "_index.md",
            f"| {out_path.stem} | {args.title} | {args.author or '-'} | {', '.join(tags)} | {date.today().isoformat()} | pendente |",
        )

    inbox = KNOWLEDGE / "inbox"
    if src.is_relative_to(inbox) and not args.keep_inbox:
        src.unlink()

    print(f"OK → {rel}")
    print(
        "Próximo passo: peça ao Hermes para destilar este arquivo em "
        "hermes/knowledge/insights/ (use o template _TEMPLATE.md)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
