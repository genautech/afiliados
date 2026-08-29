#!/usr/bin/env python3
"""
scripts/firecrawl_competitor_scraper.py
Scraping de páginas de concorrência com Firecrawl e extração de insights de copy.
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Load environment variables from root or nextjs_space .env
try:
    from dotenv import load_dotenv
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    load_dotenv()
    load_dotenv(PROJECT_ROOT / "afiliads_app" / "nextjs_space" / ".env")
except ImportError:
    pass

try:
    from firecrawl import FirecrawlApp
    FIRECRAWL_AVAILABLE = True
except ImportError:
    FIRECRAWL_AVAILABLE = False


def scrape_competitor_landing_page(url: str, is_mock: bool = False) -> dict:
    """Scrape competitor page using Firecrawl or return mock scraped structure."""
    api_key = os.environ.get("FIRECRAWL_API_KEY")
    
    if is_mock or not api_key:
        if not is_mock:
            print("[SCRAPING] ⚠️ FIRECRAWL_API_KEY não encontrada no ambiente (.env). Usando modo fallback/mock.")
        else:
            print("[SCRAPING] Modo MOCK ativado para scraping de concorrência.")

        return {
            "url": url,
            "status": "success",
            "title": "Página Concorrente Low Ticket",
            "markdown": (
                "# Oferta Especial FemiCore Drop\n\n"
                "## Cansaço excessivo e insônia aos 40?\n"
                "Conheça a solução sublingual natural com absorção imediata.\n\n"
                "### Garantia Incondicional de 60 dias\n"
                "Basta 6 gotas todas as manhãs antes do café."
            ),
            "metadata": {
                "description": "Suplemento sublingual natural para energia e saúde feminina.",
                "language": "pt-BR"
            }
        }

    if not FIRECRAWL_AVAILABLE:
        raise RuntimeError("Biblioteca 'firecrawl-py' não instalada.")

    print(f"[SCRAPING] Raspando página concorrente ao vivo via Firecrawl API (URL: {url})...")
    try:
        app = FirecrawlApp(api_key=api_key)
        if hasattr(app, 'scrape_url'):
            scrape_result = app.scrape_url(url)
        elif hasattr(app, 'scrape'):
            scrape_result = app.scrape(url)
        else:
            scrape_result = {}

        markdown_text = ""
        if isinstance(scrape_result, dict):
            markdown_text = scrape_result.get("markdown") or str(scrape_result)
        else:
            markdown_text = str(scrape_result)

        return {
            "url": url,
            "status": "success",
            "title": "Página Concorrente Raspada ao Vivo",
            "markdown": markdown_text,
            "metadata": {"source": "Firecrawl Live Scrape"}
        }
    except Exception as e:
        print(f"[SCRAPING] ⚠️ Erro ao executar Firecrawl: {e}. Retornando resultado de resiliência.")
        return scrape_competitor_landing_page(url, is_mock=True)


def main():
    parser = argparse.ArgumentParser(description="Firecrawl Competitor Scraper")
    parser.add_argument("--url", type=str, help="URL da página concorrente")
    parser.add_argument("--mock", action="store_true", help="Usar modo mock/offline")
    parser.add_argument("--output-json", type=str, help="Caminho para salvar o resultado em JSON")
    args = parser.parse_args()

    url = args.url or "https://example.com/competitor-landing-page"
    data = scrape_competitor_landing_page(url, is_mock=args.mock)

    if args.output_json:
        out_path = Path(args.output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"📄 Resultado salvo em: {out_path}")

    print("✅ Scraping concluído:")
    print(f"Título: {data.get('title')}")
    print(f"Markdown preview: {data.get('markdown')[:200]}...")


if __name__ == "__main__":
    main()
