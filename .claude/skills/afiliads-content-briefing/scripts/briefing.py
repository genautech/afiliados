#!/usr/bin/env python3
"""Fecha e valida o briefing de uma peça de conteúdo.

Lê os presets de brandkit/brand-voice.md (não guarda cópia) e o
estado dos fatos em brandkit/fatos-produto.md.

Uso:
  briefing.py --check-facts
  briefing.py --preset sair-ilesa --formato landing --objetivo venda \
      --fonte-trafego search-problema --out briefing.json
"""
import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

# Raiz do repo AfiliAds: .claude/skills/<skill>/scripts/este-arquivo.py
RAIZ = Path(__file__).resolve().parents[4]
BRANDKIT = Path(os.environ.get("AFILIADS_BRANDKIT", RAIZ / "brandkit"))
DNA = BRANDKIT / "brand-voice.md"
FATOS = BRANDKIT / "fatos-produto.md"

FORMATOS = {
    "landing", "ebook", "anuncio", "email", "bloco", "afiliado", "plataforma",
}
OBJETIVOS = {"lead", "venda", "cadastro", "afiliacao"}
NIVEIS = {"inconsciente", "problema", "solucao", "produto", "mais-consciente"}

# fonte de tráfego -> nível de consciência presumido (seção 3 do DNA)
CALIBRAGEM = {
    "search-problema": "problema",
    "search-marca": "produto",
    "social-frio": "inconsciente",
    "social-quente": "solucao",
    "remarketing": "produto",
    "email-lista": "mais-consciente",
    "organico": "problema",
}

TEMPLATE_MARKS = re.compile(
    r"a ser preenchid|a ser sincronizad|<preencher>|\bTODO\b|\bPENDENTE\b|lorem ipsum",
    re.I,
)


def die(msg, code=1):
    print(f"ERRO: {msg}", file=sys.stderr)
    sys.exit(code)


def read_dna():
    if not DNA.exists():
        die(f"DNA de conteúdo não encontrado em {DNA}. "
            "Sem DNA não existe briefing válido.")
    return DNA.read_text(encoding="utf-8")


def parse_presets(txt):
    """Extrai os blocos '### `nome`' da seção 4."""
    sec = re.search(r"^## 4\..*?$(.*?)^## 5\.", txt, re.S | re.M)
    if not sec:
        die("seção 4 (Presets de produto) ausente no DNA.")
    presets = {}
    for m in re.finditer(r"^### `([^`]+)`\s*$(.*?)(?=^### |\Z)",
                         sec.group(1), re.S | re.M):
        nome, corpo = m.group(1), m.group(2)
        if nome.startswith("<"):
            continue

        def campo(rotulo):
            f = re.search(rf"\*\*{rotulo}[^*]*\*\*:\s*(.+?)(?=\n- \*\*|\Z)",
                          corpo, re.S)
            return re.sub(r"\s+", " ", f.group(1)).strip() if f else ""

        proibido = campo("Proibido")
        presets[nome] = {
            "promessa": campo("Promessa"),
            "publico": campo("Público"),
            "dor_central": campo("Dor central"),
            "nivel_consciencia_padrao": campo("Nível de consciência padrão"),
            "tom": campo("Tom"),
            "proibido": [p.strip(" .") for p in proibido.split(";") if p.strip()],
            "cta": cta_limpo(campo("CTA canônico")),
            "fatos": campo("Fatos verificáveis"),
        }
    if not presets:
        die("nenhum preset encontrado na seção 4 do DNA.")
    return presets


def cta_limpo(v):
    """O DNA escreve o CTA entre aspas e com ponto final: "Quero o e-book"."""
    m = re.search(r'["“]([^"”]+)["”]', v)
    return (m.group(1) if m else v).strip(' ."“”')


STATUS_VALIDOS = ("verificado", "a-verificar", "nao-usar")
RX_CODE = re.compile(r"`[^`]*`")


def check_facts():
    """Trava o pipeline se os fatos do produto ainda forem template.

    Marcador de template conta mesmo dentro de título — é onde os templates
    costumam avisar que a seção não foi preenchida. Já dentro de crase é
    documentação do marcador, não o marcador: o próprio arquivo de fatos
    explica que a copy escreve `[FATO PENDENTE: ...]`.
    """
    if not FATOS.exists():
        return False, [f"{FATOS} não existe"]
    txt = RX_CODE.sub(" ", FATOS.read_text(encoding="utf-8"))
    achados = sorted({m.group(0).lower() for m in TEMPLATE_MARKS.finditer(txt)})
    corpo = "\n".join(l for l in txt.splitlines()
                      if l.strip() and not l.lstrip().startswith("#"))
    if achados or len(corpo.strip()) < 200:
        motivos = achados or ["arquivo praticamente vazio (só títulos)"]
        return False, motivos
    return True, []


def parse_fatos():
    """Lê as tabelas de status do arquivo de fatos.

    A coluna de status muda de posição entre as tabelas, então o status é
    reconhecido pelo valor da célula, não pela posição. A primeira célula da
    linha é o nome do fato.
    """
    pendentes, reprovados = [], []
    if not FATOS.exists():
        return pendentes, reprovados
    for linha in FATOS.read_text(encoding="utf-8").splitlines():
        if not linha.lstrip().startswith("|"):
            continue
        cels = [c.strip().strip("*") for c in linha.strip().strip("|").split("|")]
        if len(cels) < 2:
            continue
        status = next((c.lower() for c in cels[1:]
                       if c.lower().split()[0:1] and
                       c.lower().split()[0] in STATUS_VALIDOS), None)
        if not status:
            continue
        nome = RX_CODE.sub("", cels[0]).replace("**", "").strip()
        if status.startswith("a-verificar"):
            pendentes.append(nome)
        elif status.startswith("nao-usar"):
            reprovados.append(nome)
    return pendentes, reprovados


def norm_nivel(v):
    v = (v or "").lower()
    for n in NIVEIS:
        if n in v:
            return n
    if "problema" in v:
        return "problema"
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check-facts", action="store_true")
    ap.add_argument("--preset")
    ap.add_argument("--formato")
    ap.add_argument("--objetivo")
    ap.add_argument("--nivel-marca", default="produto",
                    choices=["produto", "marca"])
    ap.add_argument("--fonte-trafego")
    ap.add_argument("--nivel-consciencia")
    ap.add_argument("--dores", nargs="*", default=[])
    ap.add_argument("--beneficios", nargs="*", default=[])
    ap.add_argument("--provas", nargs="*", default=[])
    ap.add_argument("--objecoes", nargs="*", default=[])
    ap.add_argument("--fontes-conhecimento", nargs="*", default=[])
    ap.add_argument("--comissao")
    ap.add_argument("--geo", default="BR")
    ap.add_argument("--canais-permitidos", nargs="*", default=[])
    ap.add_argument("--canais-proibidos", nargs="*", default=[])
    ap.add_argument("--tipo-presell")
    ap.add_argument("--variante", default="a1")
    ap.add_argument("--out")
    a = ap.parse_args()

    ok_fatos, motivos = check_facts()
    pendentes, reprovados = parse_fatos()

    if a.check_facts:
        if ok_fatos:
            print(f"OK: {FATOS} preenchido.")
            for p in pendentes:
                print(f"  a-verificar: {p}")
            for r in reprovados:
                print(f"  NÃO USAR:    {r}")
            return 0
        print("BLOQUEADO: fatos do produto em estado de template.",
              file=sys.stderr)
        for m in motivos:
            print(f"  - {m}", file=sys.stderr)
        print("\nA copy pode ser escrita, mas número, depoimento, prazo e "
              "credencial saem como [FATO PENDENTE: ...].", file=sys.stderr)
        return 1

    if not a.preset:
        die("--preset é obrigatório (ou use --check-facts).")

    presets = parse_presets(read_dna())
    if a.preset not in presets:
        die(f"preset '{a.preset}' não existe no DNA. "
            f"Disponíveis: {', '.join(sorted(presets))}. "
            "Crie o bloco na seção 4 antes de escrever.")
    p = presets[a.preset]

    if a.formato not in FORMATOS:
        die(f"--formato inválido. Use um de: {', '.join(sorted(FORMATOS))}.")
    if a.objetivo not in OBJETIVOS:
        die(f"--objetivo inválido. Use um de: {', '.join(sorted(OBJETIVOS))}.")

    nivel_marca = a.nivel_marca
    if a.formato == "plataforma":
        nivel_marca = "marca"
    if a.formato == "afiliado" and a.objetivo == "afiliacao":
        nivel_marca = "marca"

    nivel = norm_nivel(a.nivel_consciencia)
    if not nivel and a.fonte_trafego:
        nivel = CALIBRAGEM.get(a.fonte_trafego, "")
    if not nivel:
        nivel = norm_nivel(p["nivel_consciencia_padrao"]) or "problema"

    if a.fonte_trafego and a.fonte_trafego in CALIBRAGEM:
        presumido = CALIBRAGEM[a.fonte_trafego]
        if presumido != nivel:
            print(f"aviso: fonte '{a.fonte_trafego}' costuma trazer público "
                  f"'{presumido}', mas o briefing diz '{nivel}'.",
                  file=sys.stderr)

    faltando = [k for k, v in {
        "dores": a.dores, "beneficios": a.beneficios,
    }.items() if not v]
    if faltando:
        die("briefing incompleto — sem " + " e sem ".join(faltando) +
            ". Colete com o usuário antes de escrever.")

    sigla = {
        "landing": "lp", "ebook": "eb", "anuncio": "ad",
        "email": "em", "bloco": "bl", "afiliado": "af", "plataforma": "pl",
    }[a.formato]

    b = {
        "preset": a.preset,
        "nivel_marca": nivel_marca,
        "formato": a.formato,
        "objetivo": a.objetivo,
        "cta": p["cta"],
        "promessa": p["promessa"],
        "publico": p["publico"] or None,
        "dor_central": p["dor_central"],
        "dores": a.dores,
        "beneficios": a.beneficios,
        "provas": a.provas,
        "objecoes": a.objecoes,
        "nivel_consciencia": nivel,
        "fonte_trafego": a.fonte_trafego,
        "tom": p["tom"],
        "proibido": p["proibido"],
        "variant_id": f"{a.preset}-{sigla}-{a.variante}",
        "fatos_ok": ok_fatos,
        "fatos_pendentes": pendentes if ok_fatos else motivos,
        "fatos_reprovados": reprovados,
        "fontes_conhecimento": a.fontes_conhecimento,
        "afiliado": {
            "comissao_pct": a.comissao,
            "geo": a.geo,
            "canais_permitidos": a.canais_permitidos,
            "canais_proibidos": a.canais_proibidos,
            "tipo_presell": a.tipo_presell,
        },
        "data": date.today().isoformat(),
    }

    if not a.provas and ok_fatos:
        print("aviso: nenhuma prova no briefing, mas Fatos_Produto.md está "
              "preenchido — puxe prova de lá.", file=sys.stderr)

    saida = json.dumps(b, ensure_ascii=False, indent=2)
    if a.out:
        Path(a.out).write_text(saida + "\n", encoding="utf-8")
        print(f"briefing.json escrito em {a.out}")
        if not ok_fatos:
            print("atenção: fatos pendentes — a copy vai sair com placeholders.")
    else:
        print(saida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
