#!/usr/bin/env python3
"""
scripts/process_youtube_knowledge.py
Ingestão de transcrições de vídeos do YouTube, engenharia reversa de marketing via LLM,
sincronização no Obsidian e Inteligência Cruzada ("Mente Colmeia") por nicho.
"""

import sys
import os
import re
import json
import argparse
from datetime import datetime
from pathlib import Path

# Load environment variables from root or nextjs_space .env
try:
    from dotenv import load_dotenv
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    load_dotenv()
    load_dotenv(PROJECT_ROOT / "afiliads_app" / "nextjs_space" / ".env")
except ImportError:
    pass

# Try importing youtube_transcript_api
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    YOUTUBE_TRANSCRIPT_AVAILABLE = True
except ImportError:
    YOUTUBE_TRANSCRIPT_AVAILABLE = False

# Try importing google-genai
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

LAST_TOKEN_USAGE = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}


OBSIDIAN_GLOBAL_DIR = Path("/Users/genautech/EMAI Starter Vault/Conhecimento/Global/Low_Ticket_Insights")
OBSIDIAN_SINTESES_DIR = Path("/Users/genautech/EMAI Starter Vault/Conhecimento/Global/Sinteses")


def extract_video_id(url_or_id: str) -> str:
    """Extract YouTube video ID from URL or return ID if already 11 chars."""
    if len(url_or_id) == 11 and not ("/" in url_or_id or "." in url_or_id):
        return url_or_id
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?]|$)",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"embed\/([0-9A-Za-z_-]{11})"
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    raise ValueError(f"Não foi possível extrair um Video ID válido do input: '{url_or_id}'")


def get_youtube_transcript(video_id: str, is_mock: bool = False) -> dict:
    """Fetch raw transcript using youtube_transcript_api or return mock transcript."""
    if is_mock:
        print(f"[INGESTION] Modo MOCK ativado para o vídeo ID: {video_id}")
        return {
            "video_id": video_id,
            "title": "Mock VSL High Converting Low Ticket Strategy",
            "transcript_text": (
                "Se você sofre de cansaço extremo e insônia, o verdadeiro culpado não é a sua idade. "
                "Descobrimos um acúmulo celular que paralisa o metabolismo noturno. "
                "Em 5 segundos você vai ver por que tomar café só piora a situação. "
                "Apresentamos a solução natural em gotas com absorção sublingual 97% mais rápida. "
                "Mesmo que você já tenha tentado de tudo e não acredite em suplementos, "
                "o estudo clínico comprovou eficácia sem efeitos colaterais."
            )
        }

    if not YOUTUBE_TRANSCRIPT_AVAILABLE:
        raise RuntimeError("Biblioteca 'youtube_transcript_api' não instalada. Execute 'uv pip install youtube-transcript-api'.")

    print(f"[INGESTION] Baixando transcrição oficial do YouTube (ID: {video_id})...")
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['pt', 'pt-BR', 'en', 'es'])
        full_text = " ".join([item['text'] for item in transcript_list])
        return {
            "video_id": video_id,
            "title": f"YouTube Video {video_id}",
            "transcript_text": full_text
        }
    except Exception as e:
        print(f"⚠️ Erro ao buscar transcrição online ({e}). Ativando fallback de transcrição mockada.")
        return get_youtube_transcript(video_id, is_mock=True)


def analyze_transcript_marketing(transcript_text: str, is_mock: bool = False) -> dict:
    """Analyze transcript with Gemini/LLM or return mock structured analysis."""
    if is_mock:
        print("[ANALYSIS] Modo MOCK ativado para análise de engenharia reversa de marketing.")
        return {
            "dor_viva": "Cansaço extremo, fadiga crônica e insônia noturna associada ao envelhecimento percebido.",
            "ganchos_retencao_5s": [
                "Se você sofre de cansaço extremo, o culpado não é a sua idade.",
                "Em 5 segundos você vai ver por que tomar café só piora o seu metabolismo."
            ],
            "mecanismo_unico": "Desobstrução da regeneração celular noturna via absorção sublingual de nutrientes essenciais.",
            "objecoes_e_resolucoes": [
                {
                    "objecao": "Já tentei de tudo e nada funciona para o meu organismo.",
                    "resolucao": "Demonstração de absorção sublingual 97% mais rápida que comprimidos convencionais."
                },
                {
                    "objecao": "Receito que tenha efeitos colaterais ou dependência.",
                    "resolucao": "Comprovação com estudo clínico independente 100% natural."
                }
            ]
        }

    global LAST_TOKEN_USAGE
    LAST_TOKEN_USAGE = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("[ANALYSIS] ⚠️ GEMINI_API_KEY não encontrada no ambiente (.env). Usando fallback offline.")
        return analyze_transcript_marketing(transcript_text, is_mock=True)

    if not GEMINI_AVAILABLE:
        print("[ANALYSIS] ⚠️ google-genai SDK não instalado. Usando fallback offline.")
        return analyze_transcript_marketing(transcript_text, is_mock=True)

    print("[ANALYSIS] Executando engenharia reversa de marketing via Gemini API (gemini-2.5-flash)...")
    client = genai.Client(api_key=api_key)
    prompt = f"""
Você é um especialista em engenharia reversa de marketing direto, VSLs e páginas de alta conversão.
Analise a transcrição abaixo e extraia estritamente em JSON estruturado com os seguintes campos:

1. "dor_viva": A dor visceral/emocional exata descrita no vídeo.
2. "ganchos_retencao_5s": Lista de ganchos de retenção iniciais (primeiros segundos).
3. "mecanismo_unico": O mecanismo único de solução apresentado.
4. "objecoes_e_resolucoes": Lista de objetos com {{"objecao": "...", "resolucao": "..."}}.

Transcrição do Vídeo:
{transcript_text[:10000]}
"""

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        usage = getattr(response, "usage_metadata", None)
        LAST_TOKEN_USAGE = {
            "prompt_tokens": int(getattr(usage, "prompt_token_count", 0) or 0),
            "completion_tokens": int(getattr(usage, "candidates_token_count", 0) or 0),
            "total_tokens": int(getattr(usage, "total_token_count", 0) or 0),
        }
        data = json.loads(response.text)
        return data
    except Exception as e:
        print(f"⚠️ Erro ao chamar LLM Gemini: {e}. Aplicando fallback de análise.")
        return analyze_transcript_marketing(transcript_text, is_mock=True)


def slugify(text: str) -> str:
    """Create URL/filename safe slug."""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text).strip("-")
    return text or "youtube-insight"


def save_to_obsidian(video_id: str, title: str, youtube_url: str, insights: dict) -> Path:
    """Save structured insight markdown note into Obsidian Global Vault."""
    OBSIDIAN_GLOBAL_DIR.mkdir(parents=True, exist_ok=True)
    slug = slugify(f"{video_id}-{title[:30]}")
    filepath = OBSIDIAN_GLOBAL_DIR / f"{slug}.md"
    today_str = datetime.now().strftime("%Y-%m-%d")

    hooks_md = "\n".join([f"- \"{hook}\"" for hook in insights.get("ganchos_retencao_5s", [])])
    objecoes_md = ""
    for item in insights.get("objecoes_e_resolucoes", []):
        objecoes_md += f"- **Objeção:** {item.get('objecao')}\n  - **Resolução:** {item.get('resolucao')}\n"

    content = f"""---
title: "{title}"
url: "{youtube_url}"
tags: ["vsl", "copy", "landing-page"]
extracted_at: "{today_str}"
video_id: "{video_id}"
---

# 🎯 Insight de Marketing - {title}

## ⚡ Dor Viva Identificada
{insights.get("dor_viva", "N/A")}

## 🪝 Ganchos de Retenção (5 Segundos)
{hooks_md}

## ⚙️ Mecanismo Único de Conversão
{insights.get("mecanismo_unico", "N/A")}

## 🛡️ Objeções Enfrentadas e Resoluções
{objecoes_md}
"""

    filepath.write_text(content, encoding="utf-8")
    return filepath


def load_all_obsidian_insights() -> list[dict]:
    """Scan all markdown files in Low_Ticket_Insights directory and load historical data."""
    results = []
    if not OBSIDIAN_GLOBAL_DIR.exists():
        return results

    for filepath in OBSIDIAN_GLOBAL_DIR.glob("*.md"):
        try:
            raw_text = filepath.read_text(encoding="utf-8")
            title_match = re.search(r'title:\s*"([^"]+)"', raw_text)
            title = title_match.group(1) if title_match else filepath.stem

            hooks = re.findall(r'- "([^"]+)"', raw_text)
            dor_match = re.search(r'## ⚡ Dor Viva Identificada\n([^\n]+)', raw_text)
            dor = dor_match.group(1).strip() if dor_match else ""

            mecanismo_match = re.search(r'## ⚙️ Mecanismo Único de Conversão\n([^\n]+)', raw_text)
            mecanismo = mecanismo_match.group(1).strip() if mecanismo_match else ""

            results.append({
                "file": filepath.name,
                "title": title,
                "dor_viva": dor,
                "mecanismo": mecanismo,
                "hooks": hooks,
                "raw_text": raw_text
            })
        except Exception as e:
            print(f"⚠️ Erro ao ler nota {filepath}: {e}")

    return results


def update_niche_synthesis(niche: str, current_insight: dict, is_mock: bool = False) -> Path:
    """Generate or update the cumulative Niche Synthesis note in Obsidian ("Mente Colmeia")."""
    OBSIDIAN_SINTESES_DIR.mkdir(parents=True, exist_ok=True)
    synthesis_path = OBSIDIAN_SINTESES_DIR / f"{niche}-sintese.md"
    today_str = datetime.now().strftime("%Y-%m-%d")

    all_historical = load_all_obsidian_insights()
    total_sources = len(all_historical)

    all_hooks = list(current_insight.get("ganchos_retencao_5s", []))
    all_claims = [current_insight.get("mecanismo_unico")] if current_insight.get("mecanismo_unico") else []
    all_objections = list(current_insight.get("objecoes_e_resolucoes", []))

    for item in all_historical:
        for h in item.get("hooks", []):
            if h not in all_hooks:
                all_hooks.append(h)
        if item.get("mecanismo") and item.get("mecanismo") not in all_claims:
            all_claims.append(item.get("mecanismo"))

    claims_ledger_md = "\n".join([f"- **Mecanismo/Claim:** {claim}" for claim in all_claims if claim])
    hooks_md = "\n".join([f"- \"{hook}\"" for hook in all_hooks if hook])
    
    objecoes_md = ""
    for obj in all_objections:
        objecoes_md += f"- **Objeção:** {obj.get('objecao')}\n  - **Solução Universal:** {obj.get('resolucao')}\n"

    synthesis_content = f"""---
title: "Síntese Acumulada de Nicho - {niche}"
niche: "{niche}"
tags: ["sintese", "mente-colmeia", "low-ticket"]
last_updated: "{today_str}"
total_sources: {total_sources}
---

# 🐝 Mente Colmeia: Síntese Acumulada de Nicho ({niche.upper()})

> **Nota de Inteligência Acumulada:** Compilação dos padrões de maior conversão catalogados nas análises de VSLs e ofertas do nicho `{niche}`.

---

## 📜 Claim Ledger Acumulado (Mecanismos Únicos)
{claims_ledger_md}

---

## 🪝 Top Ganchos de Retenção de 5 Segundos
{hooks_md}

---

## 🛡️ Objeções Mais Comuns & Soluções Universais
{objecoes_md}

---
*Atualizado automaticamente em {today_str} com base em {total_sources} transcrições e fontes de inteligência.*
"""

    synthesis_path.write_text(synthesis_content, encoding="utf-8")
    return synthesis_path


def main():
    parser = argparse.ArgumentParser(description="Ingestão de vídeo do YouTube e Sincronização Obsidian")
    parser.add_argument("--url", type=str, help="URL ou Video ID do YouTube")
    parser.add_argument("--niche", type=str, default="low-ticket", help="Nicho ou vertical para síntese acumulada")
    parser.add_argument("--mock", action="store_true", help="Usar transcrição e análise mockadas para teste isolado")
    parser.add_argument("--output-json", type=str, help="Caminho opcional para salvar o JSON gerado")
    args = parser.parse_args()

    if not args.url and not args.mock:
        print("[INGESTION] ⚠️ Nenhuma URL fornecida. Usando vídeo mock por padrão.")
        args.mock = True
        args.url = "https://www.youtube.com/watch?v=mock1234567"
    elif not args.url:
        args.url = "https://www.youtube.com/watch?v=mock1234567"

    video_id = extract_video_id(args.url)
    youtube_url = f"https://www.youtube.com/watch?v={video_id}"

    transcript_data = get_youtube_transcript(video_id, is_mock=args.mock)
    insights = analyze_transcript_marketing(transcript_data["transcript_text"], is_mock=args.mock)

    print("[OBSIDIAN] Sincronizando nota individual com o Obsidian Vault...")
    note_path = save_to_obsidian(video_id, transcript_data["title"], youtube_url, insights)
    print(f"[OBSIDIAN] ✅ Nota individual salva em: {note_path}")

    print(f"[HEURISTICS] Atualizando Mente Colmeia (Síntese de Nicho: '{args.niche}')...")
    synthesis_path = update_niche_synthesis(args.niche, insights, is_mock=args.mock)
    print(f"[HEURISTICS] ✅ Síntese acumulada salva em: {synthesis_path}")

    if args.output_json:
        out_path = Path(args.output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps({
            "video_id": video_id,
            "url": youtube_url,
            "title": transcript_data["title"],
            "insights": insights,
            "token_usage": LAST_TOKEN_USAGE,
            "synthesis_file": str(synthesis_path)
        }, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"📄 JSON salvo em: {out_path}")

    print("\n--- Resultado dos Insights Extraídos ---")
    print(json.dumps(insights, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
