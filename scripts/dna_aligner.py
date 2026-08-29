#!/usr/bin/env python3
"""
scripts/dna_aligner.py
Alinhamento de insights de marketing com Human DNA (01-DNA-Master.md e Brandkit)
e geração de rascunhos (Drafts) HTML/Tailwind para Landing Page e E-book.
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DNA_MASTER_PATH = PROJECT_ROOT / "frameworks" / "human-dna" / "inteligencias" / "01-DNA-Master.md"
BRANDKIT_DIR = PROJECT_ROOT / "brandkit"
DEFAULT_PRODUCT_SRC = PROJECT_ROOT / "product_src" / "src"


def load_dna_rules() -> dict:
    """Load core rules from DNA Master and Brandkit."""
    print("[ALIGNMENT] Carregando diretrizes do 01-DNA-Master.md e Brandkit...")
    dna_content = ""
    if DNA_MASTER_PATH.exists():
        dna_content = DNA_MASTER_PATH.read_text(encoding="utf-8")

    voice_content = ""
    voice_file = BRANDKIT_DIR / "brand-voice.md"
    if voice_file.exists():
        voice_content = voice_file.read_text(encoding="utf-8")

    visual_content = ""
    visual_file = BRANDKIT_DIR / "brand-visual.md"
    if visual_file.exists():
        visual_content = visual_file.read_text(encoding="utf-8")

    return {
        "dna_master": dna_content[:2000],
        "voice": voice_content,
        "visual": visual_content,
        "primary_color": "#2563EB",
        "bg_color": "#F8FAFC",
        "text_color": "#0F172A",
        "accent_color": "#EF4444"
    }


def align_insights_with_dna(insights: dict, dna_rules: dict) -> dict:
    """Filter and align extracted insights to strictly observe Human DNA and compliance standards."""
    print("[ALIGNMENT] Aplicando regras de tom de voz, autorias e filtragem de claims de compliance...")
    dor = insights.get("dor_viva", "Desconforto físico e falta de energia diária.")
    mecanismo = insights.get("mecanismo_unico", "Nutrição celular sublingual natural.")
    ganchos = insights.get("ganchos_retencao_5s", ["Descubra o segredo do metabolismo ativo."])
    objecoes = insights.get("objecoes_e_resolucoes", [])

    forbidden_words = ["cura", "milagre", "garantido", "100%", "elimina em 3 dias"]
    
    clean_hooks = []
    for hook in ganchos:
        cleaned = hook
        for fw in forbidden_words:
            cleaned = cleaned.replace(fw, "")
        clean_hooks.append(cleaned.strip())

    return {
        "headline": clean_hooks[0] if clean_hooks else "Transformação Natural e Eficiente",
        "subheadline": f"Entenda o mecanismo de {mecanismo.lower()} e livre-se do desconforto diário com segurança.",
        "dor_viva": dor,
        "mecanismo_unico": mecanismo,
        "ganchos": clean_hooks,
        "objecoes": objecoes,
        "compliance_disclaimer": "Este produto não substitui o parecer médico profissional. Os resultados podem variar de pessoa para pessoa."
    }


def generate_landing_page_html(aligned_data: dict, dna_rules: dict) -> str:
    """Generate HTML/Tailwind draft for Landing Page."""
    hooks_html = "".join([f'<li class="mb-2 text-slate-700">✓ {hook}</li>' for hook in aligned_data["ganchos"]])
    
    objecoes_html = ""
    for item in aligned_data["objecoes"]:
        objecoes_html += f"""
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4">
            <h4 class="font-bold text-slate-900 mb-1">❓ {item.get('objecao')}</h4>
            <p class="text-slate-600 text-sm">💡 {item.get('resolucao')}</p>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Draft Landing Page - Human DNA Aligned</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 font-sans antialiased">
    <!-- Hero Section -->
    <header class="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <span class="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
            Novo Método Baseado em Ciência
        </span>
        <h1 class="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
            {aligned_data['headline']}
        </h1>
        <p class="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            {aligned_data['subheadline']}
        </p>
        <a href="#oferta" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg transition transform hover:-translate-y-0.5">
            Quero Conhecer a Solução Agora
        </a>
    </header>

    <!-- Key Insights & Mechanism -->
    <section class="max-w-3xl mx-auto px-4 py-8">
        <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-100 mb-8">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">⚙️ O Mecanismo Único de Ação</h2>
            <p class="text-slate-700 leading-relaxed mb-4">
                {aligned_data['mecanismo_unico']}
            </p>
            <h3 class="font-semibold text-slate-800 mb-2">Pontos Chave de Retenção:</h3>
            <ul class="list-none pl-0">
                {hooks_html}
            </ul>
        </div>

        <!-- Objections Resolved -->
        <h2 class="text-2xl font-bold text-slate-900 mb-4">🛡️ Perguntas & Respostas Frequentes</h2>
        {objecoes_html}
    </section>

    <!-- Footer Disclaimer -->
    <footer class="max-w-4xl mx-auto px-4 py-8 text-center text-xs text-slate-400 border-t border-slate-200 mt-12">
        <p>{aligned_data['compliance_disclaimer']}</p>
    </footer>
</body>
</html>
"""


def generate_ebook_html(aligned_data: dict, dna_rules: dict) -> str:
    """Generate HTML/Tailwind draft for E-book."""
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Book Draft - {aligned_data['headline']}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-slate-800 font-sans p-8 max-w-3xl mx-auto">
    <!-- Cover -->
    <div class="border-4 border-blue-600 p-8 rounded-2xl text-center mb-12 my-6">
        <h1 class="text-4xl font-extrabold text-blue-900 mb-4">{aligned_data['headline']}</h1>
        <p class="text-xl text-slate-600 italic mb-6">Guia Prático e Definitivo de Aplicação</p>
        <div class="w-24 h-1 bg-blue-600 mx-auto mb-6"></div>
        <p class="text-sm font-semibold text-slate-500 uppercase tracking-widest">Edição Oficial Human DNA</p>
    </div>

    <!-- Chapter 1 -->
    <section class="mb-8">
        <h2 class="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">Capítulo 1: A Causa Raiz da Dor Viva</h2>
        <p class="text-slate-700 leading-relaxed mb-4">
            {aligned_data['dor_viva']}
        </p>
    </section>

    <!-- Chapter 2 -->
    <section class="mb-8">
        <h2 class="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">Capítulo 2: O Mecanismo Único</h2>
        <p class="text-slate-700 leading-relaxed mb-4">
            {aligned_data['mecanismo_unico']}
        </p>
    </section>

    <!-- Footer -->
    <footer class="mt-16 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
        {aligned_data['compliance_disclaimer']}
    </footer>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description="Human DNA Aligner e Gerador de Drafts HTML/Tailwind")
    parser.add_argument("--insights-json", type=str, help="Caminho do arquivo JSON de insights extraídos")
    parser.add_argument("--mock", action="store_true", help="Usar dados mockados para teste isolado")
    parser.add_argument("--output-dir", type=str, help="Diretório de saída para salvar os drafts HTML")
    args = parser.parse_args()

    out_dir = Path(args.output_dir) if args.output_dir else DEFAULT_PRODUCT_SRC
    out_dir.mkdir(parents=True, exist_ok=True)

    insights = None
    if args.insights_json and Path(args.insights_json).exists():
        try:
            raw_data = json.loads(Path(args.insights_json).read_text(encoding="utf-8"))
            insights = raw_data.get("insights", raw_data)
        except Exception as e:
            print(f"⚠️ Erro ao ler JSON {args.insights_json}: {e}")

    if not insights or args.mock:
        insights = {
            "dor_viva": "Cansaço profundo e indisposição ao acordar por estresse oxidativo.",
            "ganchos_retencao_5s": ["Por que beber mais café está destruindo a sua energia."],
            "mecanismo_unico": "Modulação mitocondrial noturna via extrato purificado sublingual.",
            "objecoes_e_resolucoes": [
                {
                    "objecao": "Demora muito para fazer efeito?",
                    "resolucao": "Atuação imediata nos primeiros 7 dias de uso contínuo."
                }
            ]
        }

    dna_rules = load_dna_rules()
    aligned_data = align_insights_with_dna(insights, dna_rules)

    print(f"[DRAFT] Gerando rascunhos de Landing Page e E-book em: {out_dir}...")
    lp_html = generate_landing_page_html(aligned_data, dna_rules)
    ebook_html = generate_ebook_html(aligned_data, dna_rules)

    lp_file = out_dir / "landing_page_draft.html"
    ebook_file = out_dir / "ebook_draft.html"

    lp_file.write_text(lp_html, encoding="utf-8")
    ebook_file.write_text(ebook_html, encoding="utf-8")

    print(f"[DRAFT] ✅ Landing Page Draft salvo em: {lp_file}")
    print(f"[DRAFT] ✅ E-book Draft salvo em: {ebook_file}")


if __name__ == "__main__":
    main()
