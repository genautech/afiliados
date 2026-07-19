#!/usr/bin/env python3
"""Calcula CTR/CPC/CPA/ROAS/breakeven e dá o veredicto pelas regras do sistema.

Uso:
  python3 calcular_metricas.py --gasto 280 --cliques 190 --impressoes 6200 \
      --conversoes 2 --comissao 97 [--roas-meta 2.0] [--dias 5] [--moeda BRL]
"""
import argparse

SIMB = {"BRL": "R$", "USD": "US$", "GBP": "£", "AUD": "A$"}


def fmt(v, moeda):
    return f"{SIMB.get(moeda, moeda)} {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gasto", type=float, required=True)
    ap.add_argument("--cliques", type=int, required=True)
    ap.add_argument("--impressoes", type=int, default=0)
    ap.add_argument("--conversoes", type=int, default=0)
    ap.add_argument("--comissao", type=float, required=True, help="comissão média por venda")
    ap.add_argument("--roas-meta", type=float, default=2.0)
    ap.add_argument("--dias", type=int, default=0, help="dias de veiculação (para a regra de amostra)")
    ap.add_argument("--moeda", default="BRL")
    a = ap.parse_args()

    ctr = (a.cliques / a.impressoes * 100) if a.impressoes else None
    cpc = a.gasto / a.cliques if a.cliques else None
    cpa = a.gasto / a.conversoes if a.conversoes else None
    receita = a.conversoes * a.comissao
    roas = receita / a.gasto if a.gasto else None
    tx_conv = (a.conversoes / a.cliques * 100) if a.cliques else None
    cpa_alvo = a.comissao / a.roas_meta
    limite_3x = 3 * a.comissao

    m = a.moeda
    print("=== MÉTRICAS ===")
    if ctr is not None:
        print(f"CTR: {ctr:.2f}%  ({'OK ✔' if ctr >= 3 else 'baixo p/ Pesquisa (meta ≥3%) ⚠' if ctr >= 2 else 'fraco — anúncio/keyword desalinhados ✖'})")
    print(f"CPC médio: {fmt(cpc, m) if cpc else '—'}")
    print(f"Taxa de conversão: {f'{tx_conv:.2f}%' if tx_conv is not None else '—'}")
    print(f"CPA: {fmt(cpa, m) if cpa else '— (0 conversões)'}   | CPA-alvo (ROAS {a.roas_meta}): {fmt(cpa_alvo, m)}   | Breakeven: {fmt(a.comissao, m)}")
    print(f"Receita estimada: {fmt(receita, m)}   | Gasto: {fmt(a.gasto, m)}   | ROAS: {f'{roas:.2f}' if roas is not None else '—'}")

    print("\n=== VEREDICTO (regras do sistema) ===")
    amostra_ok = (a.dias >= 7) or (a.cliques >= 100)
    if not amostra_ok:
        faltam_c = max(0, 100 - a.cliques)
        faltam_d = max(0, 7 - a.dias) if a.dias else "?"
        print(f"⏳ AMOSTRA INSUFICIENTE — regra 5: mínimo 7–14 dias OU ~100 cliques.")
        print(f"   Faltam ~{faltam_c} cliques ou {faltam_d} dia(s). Enquanto isso: monitorar termos de pesquisa e negativar lixo. Não julgar ainda.")
    if a.conversoes == 0:
        if a.gasto >= limite_3x:
            print(f"🔄 REGRA DO 3×: gasto ({fmt(a.gasto, m)}) ≥ 3× a comissão ({fmt(limite_3x, m)}) com 0 vendas.")
            print("   SE o rastreamento está comprovadamente OK e a página carrega rápido → TROCAR A OFERTA (antes do nicho).")
            print("   SE o rastreamento não foi testado → resolva o rastreio primeiro; o dado pode estar cego.")
        elif amostra_ok:
            print(f"⚙ 0 conversões com amostra: verificar (1) rastreamento, (2) página-ponte e página do produtor, (3) intenção das keywords.")
            print(f"   Limite da regra do 3×: {fmt(limite_3x, m)} — restam {fmt(limite_3x - a.gasto, m)} de teste.")
    elif cpa is not None:
        if cpa <= cpa_alvo and amostra_ok:
            print(f"✔ ESCALAR: CPA ({fmt(cpa, m)}) ≤ CPA-alvo ({fmt(cpa_alvo, m)}). Regra 7: +20–30% de orçamento por vez, a cada 4–7 dias.")
        elif cpa <= a.comissao:
            print(f"⚙ OTIMIZAR: lucrativo (CPA {fmt(cpa, m)} ≤ comissão) mas acima do alvo. Ação: termos de pesquisa → negativas; pausar keywords sem conversão com >30 cliques; UMA mudança por vez.")
        else:
            print(f"✖ CPA ({fmt(cpa, m)}) ACIMA do breakeven ({fmt(a.comissao, m)}): cortar desperdício agressivamente ou pausar. Checar dispositivo/horário/região antes de matar a campanha.")


if __name__ == "__main__":
    main()
