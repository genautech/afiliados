#!/usr/bin/env python3
"""
Coleta as postagens recentes de um Instagram para o Human DNA.

Este coletor usa instaloader quando disponível. Ele funciona melhor com perfis
públicos; para perfis bloqueados, privados ou com rate limit, rode com
--login SEU_USUARIO e confirme o login no terminal.

Uso:
  python3 "Human DNA/scripts/collect-instagram.py" \
    --profile nowdays \
    --project "Human DNA/projetos/nowdays" \
    --limit 50
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


def ensure_instaloader() -> Any:
    try:
        import instaloader  # type: ignore

        return instaloader
    except ModuleNotFoundError:
        skill_root = Path(__file__).resolve().parents[1]
        venv_dir = skill_root / ".venv-instagram"
        python_bin = venv_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        if os.environ.get("HUMAN_DNA_INSTAGRAM_VENV") != "1":
            if not python_bin.exists():
                print("Criando ambiente local para coleta de Instagram...", file=sys.stderr)
                subprocess.check_call([sys.executable, "-m", "venv", str(venv_dir)])
            has_instaloader = subprocess.run(
                [str(python_bin), "-c", "import instaloader"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            ).returncode == 0
            if not has_instaloader:
                print("Instalando dependencia gratuita no ambiente local: instaloader...", file=sys.stderr)
                subprocess.check_call([str(python_bin), "-m", "pip", "install", "--upgrade", "pip", "instaloader"])
            env = os.environ.copy()
            env["HUMAN_DNA_INSTAGRAM_VENV"] = "1"
            os.execve(str(python_bin), [str(python_bin), __file__, *sys.argv[1:]], env)
        raise


def normalize_profile(value: str) -> str:
    cleaned = value.strip()
    cleaned = re.sub(r"^https?://(www\.)?instagram\.com/", "", cleaned)
    cleaned = cleaned.strip("/")
    if "/" in cleaned:
        cleaned = cleaned.split("/", 1)[0]
    return cleaned.lstrip("@")


def safe_text(value: str | None) -> str:
    return (value or "").replace("\r\n", "\n").replace("\r", "\n").strip()


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_blocked_report(discovery_dir: Path, profile_name: str, reason: str, limit: int) -> None:
    payload = {
        "profile": profile_name,
        "source_url": f"https://www.instagram.com/{profile_name}/",
        "status": "bloqueado",
        "requested_limit": limit,
        "collected_count": 0,
        "reason": reason,
        "next_steps": [
            "rodar novamente com --login USUARIO_INSTAGRAM",
            "usar Chrome/browser logado para capturar o grid e posts abertos",
            "pedir prints do grid com 50 posts, 10 captions, 5 highlights e 3 Reels",
        ],
    }
    write_json(discovery_dir / f"instagram-{profile_name}-posts.json", payload)
    lines = [
        f"# Instagram — @{profile_name}",
        "",
        "Status: bloqueado/limitado.",
        "",
        f"Motivo observado: {reason}",
        "",
        "Próximo passo obrigatório:",
        "",
        "1. Tentar login interativo com o coletor local.",
        "2. Se bloquear, usar Chrome/browser já logado e salvar capturas em `referencias/09-instagram/`.",
        "3. Se ainda assim não der, pedir pacote manual: grid de 50 posts, 10 posts abertos com caption, 5 highlights e 3 Reels.",
        "",
        "Esta fonte não deve ser considerada analisada até existir coleta real ou pacote manual.",
        "",
    ]
    (discovery_dir / f"instagram-{profile_name}-inventory.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Coleta até 50 posts recentes de Instagram para discovery do DNA.")
    parser.add_argument("--profile", required=True, help="@handle ou URL do Instagram")
    parser.add_argument("--project", required=True, help="Pasta do projeto DNA")
    parser.add_argument("--limit", type=int, default=50, help="Quantidade de posts a coletar")
    parser.add_argument("--login", help="Usuario do Instagram para login interativo quando necessario")
    parser.add_argument("--no-media", action="store_true", help="Coleta metadados/captions sem baixar imagens e videos")
    args = parser.parse_args()

    instaloader = ensure_instaloader()
    profile_name = normalize_profile(args.profile)
    project_dir = Path(args.project).expanduser().resolve()
    refs_dir = project_dir / "referencias"
    discovery_dir = project_dir / "discovery"
    media_dir = refs_dir / "09-instagram" / profile_name
    discovery_dir.mkdir(parents=True, exist_ok=True)
    media_dir.mkdir(parents=True, exist_ok=True)

    loader = instaloader.Instaloader(
        dirname_pattern=str(media_dir),
        download_pictures=not args.no_media,
        download_videos=not args.no_media,
        download_video_thumbnails=not args.no_media,
        download_geotags=False,
        download_comments=False,
        save_metadata=True,
        compress_json=False,
        quiet=True,
    )
    if args.login:
        loader.interactive_login(args.login)

    try:
        profile = instaloader.Profile.from_username(loader.context, profile_name)
    except Exception as exc:  # noqa: BLE001
        reason = str(exc).strip() or exc.__class__.__name__
        write_blocked_report(discovery_dir, profile_name, reason, args.limit)
        print(f"Instagram @{profile_name} bloqueado ou indisponível: {reason}", file=sys.stderr)
        print(f"Inventario de bloqueio: {discovery_dir / f'instagram-{profile_name}-inventory.md'}")
        return 2
    posts: list[dict[str, Any]] = []

    try:
        for index, post in enumerate(profile.get_posts(), start=1):
            if index > max(1, args.limit):
                break
            shortcode = post.shortcode
            url = f"https://www.instagram.com/p/{shortcode}/"
            if not args.no_media:
                try:
                    loader.download_post(post, target=profile_name)
                except Exception as exc:  # noqa: BLE001
                    print(f"Aviso: não consegui baixar mídia de {url}: {exc}", file=sys.stderr)
            posts.append(
                {
                    "index": index,
                    "shortcode": shortcode,
                    "url": url,
                    "date": post.date_utc.isoformat(),
                    "typename": post.typename,
                    "is_video": bool(post.is_video),
                    "caption": safe_text(post.caption),
                    "hashtags": list(post.caption_hashtags or []),
                    "mentions": list(post.caption_mentions or []),
                    "likes": getattr(post, "likes", None),
                    "comments": getattr(post, "comments", None),
                    "accessibility_caption": safe_text(getattr(post, "accessibility_caption", "")),
                }
            )
    except Exception as exc:  # noqa: BLE001
        reason = str(exc).strip() or exc.__class__.__name__
        write_blocked_report(discovery_dir, profile_name, reason, args.limit)
        print(f"Instagram @{profile_name} bloqueou a leitura de posts: {reason}", file=sys.stderr)
        print(f"Inventario de bloqueio: {discovery_dir / f'instagram-{profile_name}-inventory.md'}")
        return 2

    payload = {
        "profile": profile_name,
        "source_url": f"https://www.instagram.com/{profile_name}/",
        "collected_at": datetime.now().isoformat(timespec="seconds"),
        "requested_limit": args.limit,
        "collected_count": len(posts),
        "posts": posts,
    }
    write_json(discovery_dir / f"instagram-{profile_name}-posts.json", payload)

    csv_path = discovery_dir / f"instagram-{profile_name}-posts.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "index",
                "date",
                "url",
                "typename",
                "is_video",
                "likes",
                "comments",
                "hashtags",
                "caption",
            ],
        )
        writer.writeheader()
        for post in posts:
            writer.writerow({**post, "hashtags": ", ".join(post["hashtags"])})

    md_lines = [
        f"# Instagram — @{profile_name}",
        "",
        f"- Perfil: https://www.instagram.com/{profile_name}/",
        f"- Coleta: {len(posts)} postagens recentes",
        f"- Data: {payload['collected_at']}",
        f"- Mídias: {'não baixadas' if args.no_media else media_dir.relative_to(project_dir).as_posix()}",
        "",
        "## Posts coletados",
        "",
    ]
    for post in posts:
        caption = post["caption"].replace("\n", " ")
        if len(caption) > 420:
            caption = caption[:417].rstrip() + "..."
        md_lines.extend(
            [
                f"### {post['index']:02d} — {post['date'][:10]} — {post['typename']}",
                "",
                f"- URL: {post['url']}",
                f"- Hashtags: {', '.join(post['hashtags']) if post['hashtags'] else 'nenhuma'}",
                f"- Likes/comentarios: {post['likes']} / {post['comments']}",
                f"- Caption: {caption or 'sem caption'}",
                "",
            ]
        )
    (discovery_dir / f"instagram-{profile_name}-inventory.md").write_text("\n".join(md_lines), encoding="utf-8")

    print(f"Coletadas {len(posts)} postagens de @{profile_name}")
    print(f"JSON: {discovery_dir / f'instagram-{profile_name}-posts.json'}")
    print(f"CSV: {csv_path}")
    print(f"Inventario: {discovery_dir / f'instagram-{profile_name}-inventory.md'}")
    print(f"Mídias: {media_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
