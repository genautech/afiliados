#!/usr/bin/env python3
"""
scripts/deploy_product.py
Motor de empacotamento e distribuição de campanhas Low-Ticket:
- Formatação de E-book com design premium em PDF (via ReportLab NumberedCanvas e Brandkit Palette)
- Empacotamento estático da Landing Page (.zip limpo para AWS/Cloudflare/Vercel)
- Simulação de integração de Checkout e Webhook (Kiwify/Hotmart)
- Atualização do manifest.json da campanha
"""

import sys
import os
import re
import json
import shutil
import zipfile
import argparse
from datetime import datetime
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Try importing reportlab for native PDF generation
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


PROJECT_ROOT = Path(__file__).resolve().parent.parent
CAMPAIGNS_BASE_DIR = PROJECT_ROOT / "campaigns_data" / "low_ticket"
DEFAULT_SRC_DIR = PROJECT_ROOT / "product_src" / "src"
BRANDKIT_VISUAL_PATH = PROJECT_ROOT / "brandkit" / "brand-visual.md"


def load_brand_palette() -> dict:
    """Read brandkit/brand-visual.md or return cohesive default palette."""
    palette = {
        "primary": colors.HexColor("#1E3A8A"),    # Deep Navy
        "secondary": colors.HexColor("#2563EB"),  # Royal Blue
        "accent": colors.HexColor("#EF4444"),     # Coral Red
        "text": colors.HexColor("#0F172A"),       # Dark Slate
        "bg_light": colors.HexColor("#F8FAFC"),   # Light Slate
        "border": colors.HexColor("#E2E8F0")      # Border Grey
    }

    if BRANDKIT_VISUAL_PATH.exists():
        try:
            content = BRANDKIT_VISUAL_PATH.read_text(encoding="utf-8")
            hex_codes = re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}\b', content)
            if len(hex_codes) >= 2:
                palette["primary"] = colors.HexColor(hex_codes[0])
                palette["secondary"] = colors.HexColor(hex_codes[1])
                if len(hex_codes) >= 3:
                    palette["accent"] = colors.HexColor(hex_codes[2])
        except Exception as e:
            print(f"[BRANDKIT] ⚠️ Erro ao ler cores do brandkit ({e}). Usando paleta premium padrão.")

    return palette


if REPORTLAB_AVAILABLE:
    class NumberedCanvas(canvas.Canvas):
        """Two-pass Canvas for dynamic 'Page X of Y' numbering and clean header/footer."""
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            num_pages = len(self._saved_page_states)
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self.draw_page_number(num_pages)
                super().showPage()
            super().save()

        def draw_page_number(self, page_count):
            # Draw header and footer only on pages 2+
            if self._pageNumber > 1:
                self.saveState()
                self.setFont("Helvetica", 9)
                self.setFillColor(colors.HexColor("#64748B"))
                
                # Header
                self.drawString(36, 762, "GUIA PRÁTICO LOW-TICKET • EDICÃO PREMIUM")
                self.setStrokeColor(colors.HexColor("#CBD5E1"))
                self.setLineWidth(0.5)
                self.line(36, 754, 612 - 36, 754)
                
                # Footer
                self.line(36, 45, 612 - 36, 45)
                self.drawString(36, 30, "AfiliAds Studio • Todos os direitos reservados")
                page_str = f"Página {self._pageNumber} de {page_count}"
                self.drawRightString(612 - 36, 30, page_str)
                
                self.restoreState()


def generate_ebook_pdf(html_content: str, pdf_output_path: Path):
    """Generate a premium formatted PDF file using ReportLab and Brandkit styling."""
    pdf_output_path.parent.mkdir(parents=True, exist_ok=True)
    
    if not REPORTLAB_AVAILABLE:
        print("[PDF] ⚠️ ReportLab não instalado. Criando arquivo PDF de fallback.")
        pdf_output_path.write_bytes(b"%PDF-1.4\n% Fallback PDF placeholder\n%%EOF")
        return

    print(f"[PDF] Renderizando PDF premium com ReportLab (NumberedCanvas) em: {pdf_output_path}...")
    palette = load_brand_palette()

    doc = SimpleDocTemplate(
        str(pdf_output_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'EbookTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=palette['primary'],
        alignment=1, # Center
        spaceAfter=15
    )
    subtitle_style = ParagraphStyle(
        'EbookSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=13,
        leading=18,
        textColor=palette['secondary'],
        alignment=1, # Center
        spaceAfter=25
    )
    h2_style = ParagraphStyle(
        'EbookH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=palette['primary'],
        spaceBefore=18,
        spaceAfter=10
    )
    body_style = ParagraphStyle(
        'EbookBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=palette['text'],
        spaceAfter=10
    )
    callout_style = ParagraphStyle(
        'EbookCallout',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=15,
        textColor=palette['primary'],
        spaceBefore=8,
        spaceAfter=8
    )

    lines = html_content.split('\n')
    story = []

    # Title Cover Banner
    story.append(Spacer(1, 20))
    story.append(Paragraph("E-BOOK DEFINITIVO LOW TICKET", title_style))
    story.append(Paragraph("Guia Prático de Aplicação e Estratégia de Vendas", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=3, color=palette['secondary'], spaceAfter=25))

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if '<h1' in stripped:
            text = re.sub(r'<[^>]+>', '', stripped)
            story.append(Paragraph(text, title_style))
            story.append(HRFlowable(width="100%", thickness=2, color=palette['secondary'], spaceAfter=15))
        elif '<h2' in stripped or '<h3' in stripped:
            text = re.sub(r'<[^>]+>', '', stripped)
            story.append(Paragraph(text, h2_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=palette['border'], spaceAfter=10))
        elif '<p' in stripped:
            text = re.sub(r'<[^>]+>', '', stripped)

            # Check if this paragraph is a key callout/mechanism
            if "mecanismo" in text.lower() or "importante" in text.lower() or "dica" in text.lower():
                callout_p = Paragraph(f"💡 {text}", callout_style)
                callout_table = Table([[callout_p]], colWidths=[530])
                callout_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), palette['bg_light']),
                    ('BOX', (0,0), (-1,-1), 1, palette['secondary']),
                    ('PADDING', (0,0), (-1,-1), 10),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ]))
                story.append(callout_table)
                story.append(Spacer(1, 10))
            else:
                story.append(Paragraph(text, body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[PDF] ✅ PDF premium gerado com sucesso.")


def deploy_campaign(campaign_slug: str, is_mock: bool = False, custom_dist: str = None) -> dict:
    """Package and prepare deployment artifacts for a campaign."""
    print(f"[PACKAGING] Iniciando empacotamento da campanha '{campaign_slug}'...")

    campaign_dir = CAMPAIGNS_BASE_DIR / campaign_slug
    if not campaign_dir.exists():
        print(f"[PACKAGING] Criando estrutura física da campanha em: {campaign_dir}")
        campaign_dir.mkdir(parents=True, exist_ok=True)
        (campaign_dir / "01_research").mkdir(exist_ok=True)
        (campaign_dir / "02_drafts").mkdir(exist_ok=True)
        (campaign_dir / "03_pages").mkdir(exist_ok=True)
        (campaign_dir / "04_assets").mkdir(exist_ok=True)

    dist_dir = Path(custom_dist) if custom_dist else campaign_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)

    # 1. Locate approved Landing Page HTML
    lp_src = campaign_dir / "03_pages" / "index.html"
    if not lp_src.exists():
        lp_src = campaign_dir / "02_drafts" / "landing_page_draft.html"
    if not lp_src.exists():
        lp_src = DEFAULT_SRC_DIR / "landing_page_draft.html"

    if lp_src.exists():
        lp_content = lp_src.read_text(encoding="utf-8")
    else:
        lp_content = f"<!DOCTYPE html><html><body><h1>Landing Page - {campaign_slug}</h1></body></html>"

    lp_dist = dist_dir / "index.html"
    lp_dist.write_text(lp_content, encoding="utf-8")

    # 2. Package assets directory and create Landing Page ZIP archive
    assets_dist = dist_dir / "assets"
    assets_dist.mkdir(exist_ok=True)
    
    zip_path = dist_dir / "landing_page_deploy.zip"
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipf.write(lp_dist, arcname="index.html")
        for asset in assets_dist.glob("*"):
            zipf.write(asset, arcname=f"assets/{asset.name}")

    print(f"[ZIP] ✅ Pacote estático (.zip) criado em: {zip_path}")

    # 3. Locate approved E-book content & generate PDF / HTML
    ebook_src = campaign_dir / "02_drafts" / "ebook_draft.html"
    if not ebook_src.exists():
        ebook_src = DEFAULT_SRC_DIR / "ebook_draft.html"

    if ebook_src.exists():
        ebook_html_content = ebook_src.read_text(encoding="utf-8")
    else:
        ebook_html_content = f"<!DOCTYPE html><html><body><h1>E-Book - {campaign_slug}</h1></body></html>"

    ebook_dist_html = dist_dir / "ebook_final.html"
    ebook_dist_html.write_text(ebook_html_content, encoding="utf-8")

    ebook_dist_pdf = dist_dir / "ebook_final.pdf"
    generate_ebook_pdf(ebook_html_content, ebook_dist_pdf)

    # 4. Simulate Payment Platform Integration & Webhook Credentials
    print(f"[CHECKOUT] Simulando credenciais e webhooks do gateway Kiwify...")
    checkout_url = f"https://pay.kiwify.com.br/mock-{campaign_slug}"
    webhook_url = f"https://app.afiliads.com/api/webhooks/kiwify"
    webhook_secret = f"whsec_mock_{campaign_slug}_987654"

    deploy_summary = {
        "status": "ready_for_deploy",
        "deployed_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "landing_page_zip": str(zip_path),
        "ebook_pdf": str(ebook_dist_pdf),
        "ebook_html": str(ebook_dist_html),
        "payment_integration": {
            "platform": "Kiwify",
            "checkout_url": checkout_url,
            "webhook_url": webhook_url,
            "webhook_secret": webhook_secret
        }
    }

    # 5. Update campaign manifest.json
    manifest_path = campaign_dir / "manifest.json"
    manifest_data = {}
    if manifest_path.exists():
        try:
            manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            manifest_data = {}

    manifest_data.update({
        "campaign_slug": campaign_slug,
        "updated_at": deploy_summary["deployed_at"],
        "status": "ready_for_deploy",
        "deploy": deploy_summary
    })

    manifest_path.write_text(json.dumps(manifest_data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[MANIFEST] ✅ Manifest.json atualizado em: {manifest_path}")

    return deploy_summary


def main():
    parser = argparse.ArgumentParser(description="Empacotador e Deployer de Campanhas Low-Ticket")
    parser.add_argument("--campaign-slug", type=str, required=True, help="Slug da campanha a ser empacotada")
    parser.add_argument("--mock", action="store_true", help="Executar em modo mock/sandbox")
    parser.add_argument("--output-dir", type=str, help="Diretório de distribuição personalizado")
    args = parser.parse_args()

    summary = deploy_campaign(args.campaign_slug, is_mock=args.mock, custom_dist=args.output_dir)

    print("\n--- Summary do Deploy ---")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
