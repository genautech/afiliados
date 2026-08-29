#!/usr/bin/env python3
"""Detector de anti-patterns de copy PT-BR da marca.

Regras vivem em brandkit/brand-voice.md (seções 4 e 7). As
proibições específicas do preset saem do bloco do preset, não daqui.

Uso:
  slopcheck.py copy.md --preset sair-ilesa --json qa.json
Exit 0 = passa, 1 = reprova, 2 = erro de uso.
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
DNA = BRANDKIT / "brand-voice.md"
FATOS = BRANDKIT / "fatos-produto.md"

MULETAS = [
    "crucial", "fundamental", "essencial", "poderos", "robust",
    "revolucionári", "descomplicad", "inovador", "de ponta", "sem esforço",
    "guia definitivo", "verdadeiro divisor", "game changer", "next level",
    "mergulhar fundo", "desbloquear", "elevar seu", "na era digital",
    "no mundo digital", "cenário atual", "solução completa",
    "de forma eficaz", "de maneira eficiente", "aproveite ao máximo",
]

ABERTURAS = [
    "no mundo de hoje", "nos dias de hoje", "na era da", "você já parou para pensar",
    "imagine só", "vamos falar sobre", "sabemos que", "todos nós",
    "em um mundo onde", "descubra como",
]

FECHAMENTOS = [
    "em resumo", "em suma", "no final das contas", "concluindo",
    "portanto, fica claro", "não perca tempo", "o que você está esperando",
    "espero que este", "lembre-se sempre",
]

PROMESSA_IRREAL = [
    "dinheiro fácil", "ganhe dinheiro rápido", "enriquecer da noite",
    "resultado garantido", "garantia de resultado", "método infalível",
    "100% de sucesso", "sem risco algum", "única plataforma",
    "melhor do mercado", "nunca mais", "definitivamente resolve",
]

RX_BINARIA = re.compile(
    r"\b(n[ãa]o|nunca)\s+(?:é|s[ãa]o|se trata de|significa)\b[^.;!?\n]{3,80}[,;]\s*(?:é|s[ãa]o|e sim|mas sim|mas)\b",
    re.I,
)
RX_BINARIA2 = re.compile(r"\bn[ãa]o\s+(?:apenas|só|somente)\b[^.\n]{3,80}\bmas\b", re.I)

RX_PONTO_DECIMAL = re.compile(r"R\$\s?\d{1,3}\.\d{2}\b")
RX_DOLAR_REAL = re.compile(r"\$\s?\d+[.,]\d{2}\s*(?:reais|no pix|no boleto)", re.I)
RX_DATA_US = re.compile(r"\b(0?[1-9]|1[0-2])/(0?[1-9]|[12]\d|3[01])/(20\d{2})\b")

RX_NUMERO = re.compile(
    # preço em R$ é a oferta, não alegação: não entra aqui (o formato dele já
    # é checado por RX_PONTO_DECIMAL).
    r"(?<![\w-])(?<!R\$)(?<!R\$ )(\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?\s?%|\b\d{3,}\b|\b\d+\s?(?:mil|milh[õo]es|milhares)\b)",
    re.I,
)
RX_FONTE = re.compile(r"\(fonte:|\[fonte:|segundo (?:o|a|dados)|de acordo com|\[FATO PENDENTE", re.I)

# telefones de serviço público não são alegação: 190 polícia, 180 mulher,
# 100 direitos humanos, 188 CVV, 192 SAMU, 193 bombeiros.
SERVICOS_PUBLICOS = {"100", "180", "188", "190", "192", "193"}

RX_PLACEHOLDER = re.compile(r"\[FATO PENDENTE:?([^\]]*)\]", re.I)
RX_VARIANT = re.compile(r"data-variant\s*=\s*[\"']([^\"']+)|variant_id[\"']?\s*[:=]\s*[\"']?([\w-]+)", re.I)
RX_HEADING = re.compile(r"^#{1,6}\s+(.*)$")


def preset_proibicoes(preset):
    if not preset or not DNA.exists():
        return []
    txt = DNA.read_text(encoding="utf-8")
    m = re.search(rf"^### `{re.escape(preset)}`\s*$(.*?)(?=^### |^## |\Z)",
                  txt, re.S | re.M)
    if not m:
        print(f"aviso: preset '{preset}' não está no DNA — "
              "checando só as regras gerais.", file=sys.stderr)
        return []
    f = re.search(r"\*\*Proibido\*\*:\s*(.+?)(?=\n- \*\*|\Z)", m.group(1), re.S)
    if not f:
        return []
    itens = re.sub(r"\s+", " ", f.group(1)).strip(" .")
    return [nucleo_proibicao(i.strip()) for i in itens.split(";") if i.strip()]


# O DNA descreve a proibição em prosa ("linguagem de treinamento militar"),
# não como termo literal. Aqui a frase vira o termo que de fato aparece no texto.
RX_PREFIXO = re.compile(
    r"^(?:linguagem|imagem|imagens|foto|fotos|estat[íi]stica|estat[íi]sticas|"
    r"promessa|men[çc][ãa]o|refer[êe]ncia|uso|tom|discurso)\s+(?:de|da|do|das|dos)\s+",
    re.I,
)


def nucleo_proibicao(item):
    """Extrai o termo procurável de uma proibição escrita em prosa."""
    aspas = re.search(r'["“]([^"”]+)["”]', item)
    termo = aspas.group(1) if aspas else RX_PREFIXO.sub("", item)
    so_sem_fonte = bool(re.search(r"sem fonte$", termo, re.I))
    termo = re.sub(r"\s+sem (?:fonte|contexto|prova)$", "", termo, flags=re.I)
    return {"termo": termo.strip(" ."), "original": item,
            "so_sem_fonte": so_sem_fonte}


def linhas_uteis(texto):
    """Ignora blocos de código e front-matter."""
    out, dentro_fence, dentro_fm = [], False, False
    for i, l in enumerate(texto.splitlines(), 1):
        if i == 1 and l.strip() == "---":
            dentro_fm = True
            continue
        if dentro_fm:
            if l.strip() == "---":
                dentro_fm = False
            continue
        if l.strip().startswith("```"):
            dentro_fence = not dentro_fence
            continue
        if not dentro_fence:
            out.append((i, l))
    return out


def achar(linhas, termos, tipo, ocorrencias):
    for n, l in linhas:
        low = l.lower()
        for t in termos:
            if low.find(t.lower()) >= 0:
                ocorrencias.append({
                    "linha": n, "tipo": tipo, "trecho": l.strip()[:160],
                    "gatilho": t,
                })


def fatos_reprovados():
    """Alegações marcadas `nao-usar` no arquivo de fatos.

    Retorna o termo procurável de cada uma — o que estiver entre aspas na
    primeira célula, que é como a alegação foi escrita na copy original.
    """
    if not FATOS.exists():
        return []
    termos = []
    for linha in FATOS.read_text(encoding="utf-8").splitlines():
        if not linha.lstrip().startswith("|"):
            continue
        cels = [c.strip() for c in linha.strip().strip("|").split("|")]
        if len(cels) < 2 or not any(c.lower().startswith("nao-usar")
                                    for c in cels[1:]):
            continue
        m = re.search(r'["“]([^"”]+)["”]', cels[0])
        if m:
            termos.append(m.group(1).strip())
    return termos


def achar_reprovados(linhas, termos, ocorrencias):
    """Alegação reprovada conta mesmo quebrada em várias linhas.

    Em HTML exportado a frase costuma vir picada; procurar linha a linha
    deixaria passar justamente a alegação que não pode existir.
    """
    plano = " ".join(l for _, l in linhas).lower()
    plano = re.sub(r"\s+", " ", plano)
    for t in termos:
        alvo = re.sub(r"\s+", " ", t.lower())
        if alvo not in plano:
            continue
        n, trecho = next(((n, l) for n, l in linhas
                          if alvo.split()[0] in l.lower()), (0, t))
        ocorrencias.append({
            "linha": n, "tipo": "fato-reprovado",
            "trecho": trecho.strip()[:160], "gatilho": t,
        })


def eh_lista_de_servico(linha, termo):
    """`Violência contra a mulher: 180` é canal de ajuda, não alegação.

    O padrão que distingue: o termo proibido vem seguido de um telefone de
    serviço público. Frase afirmativa sobre o mesmo tema continua reprovando.
    """
    depois = linha.lower().split(termo.lower(), 1)[-1][:24]
    return any(re.search(rf"\b{s}\b", depois) for s in SERVICOS_PUBLICOS)


def achar_proibicoes(linhas, regras, ocorrencias):
    """Proibições do preset: algumas só valem quando a linha não cita fonte."""
    for n, l in linhas:
        low = l.lower()
        for r in regras:
            if not r["termo"] or low.find(r["termo"].lower()) < 0:
                continue
            if r["so_sem_fonte"]:
                if RX_FONTE.search(l) or eh_lista_de_servico(l, r["termo"]):
                    continue
            ocorrencias.append({
                "linha": n, "tipo": "proibicao-do-preset",
                "trecho": l.strip()[:160], "gatilho": r["original"],
            })


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("arquivo")
    ap.add_argument("--preset")
    ap.add_argument("--json")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    p = Path(a.arquivo)
    if not p.exists():
        print(f"ERRO: arquivo não encontrado: {p}", file=sys.stderr)
        return 2
    texto = p.read_text(encoding="utf-8")
    linhas = linhas_uteis(texto)
    oc = []

    achar(linhas, MULETAS, "muleta", oc)
    achar(linhas, ABERTURAS, "abertura-proibida", oc)
    achar(linhas, FECHAMENTOS, "fechamento-proibido", oc)
    achar(linhas, PROMESSA_IRREAL, "promessa-irreal", oc)
    achar_proibicoes(linhas, preset_proibicoes(a.preset), oc)
    achar_reprovados(linhas, fatos_reprovados(), oc)

    for n, l in linhas:
        for rx, tipo in ((RX_BINARIA, "construcao-binaria"),
                         (RX_BINARIA2, "construcao-binaria"),
                         (RX_PONTO_DECIMAL, "anglicismo-numerico"),
                         (RX_DOLAR_REAL, "anglicismo-numerico"),
                         (RX_DATA_US, "data-formato-us")):
            m = rx.search(l)
            if m:
                oc.append({"linha": n, "tipo": tipo,
                           "trecho": l.strip()[:160], "gatilho": m.group(0)})
        if not RX_FONTE.search(l):
            achados = [m.group(0) for m in RX_NUMERO.finditer(l)
                       if m.group(0) not in SERVICOS_PUBLICOS]
            if achados:
                oc.append({"linha": n, "tipo": "numero-sem-fonte",
                           "trecho": l.strip()[:160], "gatilho": achados[0]})

    pendentes = [(m.group(1) or "").strip() or "sem descrição"
                 for m in RX_PLACEHOLDER.finditer(texto)]

    variant = None
    mv = RX_VARIANT.search(texto)
    if mv:
        variant = mv.group(1) or mv.group(2)
    else:
        oc.append({"linha": 0, "tipo": "variant-id-ausente",
                   "trecho": "peça sem variant_id — não dá para ligar a receita",
                   "gatilho": "variant_id"})

    # CTA do hero x CTA final: compara os dois primeiros/últimos links ou botões
    ctas = re.findall(r"(?:\[([^\]]{3,60})\]\(|<a[^>]*>([^<]{3,60})</a>|^\s*CTA[^:]*:\s*(.+)$)",
                      texto, re.M)
    ctas = [next(c for c in t if c).strip() for t in ctas]
    if len(ctas) >= 2 and ctas[0].lower() != ctas[-1].lower():
        oc.append({"linha": 0, "tipo": "cta-divergente",
                   "trecho": f"hero: “{ctas[0]}” / final: “{ctas[-1]}”",
                   "gatilho": "cta"})

    veredito = "reprovado" if oc else "aprovado"
    res = {
        "arquivo": str(p),
        "preset": a.preset,
        "variant_id": variant,
        "slopcheck": "fail" if oc else "pass",
        "total": len(oc),
        "ocorrencias": sorted(oc, key=lambda o: (o["linha"], o["tipo"])),
        "fatos_pendentes": pendentes,
        "veredito": veredito,
    }

    if a.json:
        Path(a.json).write_text(json.dumps(res, ensure_ascii=False, indent=2) + "\n",
                                encoding="utf-8")

    if not a.quiet:
        if not oc:
            print(f"PASSA — {p.name}: nenhum anti-pattern automático.")
        else:
            print(f"REPROVA — {p.name}: {len(oc)} ocorrência(s)\n")
            for o in res["ocorrencias"]:
                loc = f"L{o['linha']}" if o["linha"] else "peça"
                print(f"  [{o['tipo']}] {loc}: {o['gatilho']}")
                print(f"      {o['trecho']}")
        if pendentes:
            print(f"\n{len(pendentes)} fato(s) pendente(s) — não reprovam, "
                  "mas travam a publicação:")
            for f in pendentes:
                print(f"  - {f}")
        print("\nlembrete: o teste da substituição é manual e reprova mais "
              "que este script.")

    return 1 if oc else 0


if __name__ == "__main__":
    sys.exit(main())
