#!/usr/bin/env python3
"""Valida copies de RSA: limites de caracteres + termos de risco de política.

Uso:
  python3 validar_copy.py copies.json
  echo '{"titulos": [...], "descricoes": [...]}' | python3 validar_copy.py -

Formato do JSON:
  {"titulos": ["Título 1", ...], "descricoes": ["Descrição 1", ...],
   "caminhos": ["guia", "oficial"]}   # caminhos é opcional

Limites RSA: título ≤ 30 · descrição ≤ 90 · caminho ≤ 15 caracteres.
Saída: relatório com PASSA/FALHA por linha + alertas de compliance.
Código de saída 1 se houver qualquer falha de limite ou termo de alto risco.
"""
import json
import re
import sys
import unicodedata

LIM = {"titulo": 30, "descricao": 90, "caminho": 15}
MAX_QTD = {"titulo": 15, "descricao": 4, "caminho": 2}

# Termos de ALTO risco (política do Google) — bloqueiam a entrega
ALTO_RISCO = [
    r"\bgarantid[oa]s?\b", r"\bguaranteed?\b",
    r"\bcura(r|m|do|da)?\b", r"\bcures?\b", r"\belimina\b",
    r"\bsem risco\b", r"\brisk[- ]?free\b",
    r"\brenda garantida\b", r"\blucro garantido\b",
    r"\bfique rico\b", r"\bget rich\b",
    r"\bnunca mais\b", r"\bnever again\b",
    r"emagre[çc]a \d+\s*(kg|quilos|lbs|pounds)",
    r"lose \d+\s*(kg|lbs|pounds)",
    r"\bem \d+ dias?\b.*\b(kg|quilos|resultado)s?\b",
    r"\bmilagr(e|oso|osa)\b", r"\bmiracle\b",
    r"\bsegredo que (os )?(m[eé]dicos|bancos|governo)\b",
    r"R?\$\s?[\d.,]+\s*/\s*(m[eê]s|dia|semana)",  # promessa de renda com valor
]
# Termos de MÉDIO risco — alertam, não bloqueiam
MEDIO_RISCO = [
    r"\bs[óo] hoje\b", r"\btoday only\b", r"\b[úu]ltima chance\b",
    r"\bcomprovado\b", r"\bproven\b", r"\bo melhor\b", r"\bthe best\b",
    r"\b100%\b", r"\bimperd[íi]vel\b", r"\btratamento\b", r"\btreatment\b",
    r"\bansiedade\b|\bdepress[ãa]o\b|\bdiabetes\b|\bpress[ãa]o alta\b",
    r"\bempr[ée]stimo\b|\bcr[ée]dito\b|\binvestimento\b",  # finanças: checar certificação
]


def _norm(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def check_line(texto: str, tipo: str):
    texto = _norm(texto)
    n = len(texto)
    problemas, alertas = [], []
    if n > LIM[tipo]:
        problemas.append(f"estourou o limite: {n}/{LIM[tipo]} caracteres")
    if texto.isupper() and len(texto) > 4:
        problemas.append("CAIXA ALTA integral (política)")
    if tipo == "titulo" and "!" in texto:
        problemas.append("exclamação em título (política)")
    if texto.count("!") > 1:
        problemas.append("mais de uma exclamação")
    low = texto.lower()
    for pat in ALTO_RISCO:
        if re.search(pat, low):
            problemas.append(f"TERMO DE ALTO RISCO: padrão '{pat}'")
    for pat in MEDIO_RISCO:
        if re.search(pat, low):
            alertas.append(f"atenção (médio risco): padrão '{pat}' — confirmar compliance do nicho")
    return n, problemas, alertas


def main():
    raw = sys.stdin.read() if (len(sys.argv) > 1 and sys.argv[1] == "-") else open(sys.argv[1], encoding="utf-8").read()
    data = json.loads(raw)
    grupos = [("titulo", data.get("titulos", [])),
              ("descricao", data.get("descricoes", [])),
              ("caminho", data.get("caminhos", []))]
    falhou = False
    for tipo, linhas in grupos:
        if not linhas:
            continue
        nome = {"titulo": "TÍTULOS", "descricao": "DESCRIÇÕES", "caminho": "CAMINHOS"}[tipo]
        print(f"\n=== {nome} ({len(linhas)}/{MAX_QTD[tipo]} máx) ===")
        if len(linhas) > MAX_QTD[tipo]:
            print(f"  ✖ quantidade excede o máximo do RSA ({MAX_QTD[tipo]})")
            falhou = True
        for i, t in enumerate(linhas, 1):
            n, probs, alertas = check_line(t, tipo)
            status = "✔" if not probs else "✖"
            if probs:
                falhou = True
            print(f"  {status} [{n:>2}c] {t}")
            for p in probs:
                print(f"       ↳ {p}")
            for a in alertas:
                print(f"       ⚠ {a}")
    print("\n" + ("RESULTADO: FALHOU — corrija antes de entregar." if falhou
                  else "RESULTADO: PASSOU — copy dentro dos limites e sem termos de alto risco."))
    sys.exit(1 if falhou else 0)


if __name__ == "__main__":
    main()
