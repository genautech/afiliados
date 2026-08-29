from __future__ import annotations

import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
REPO = Path(__file__).resolve().parents[3]
VAULT = REPO / "frameworks" / "agentes-referencia"

COPY = VAULT / "copywriter-ebook.agent.md"
FACT = VAULT / "fact-steward.agent.md"
STRATEGIST = VAULT / "estrategista-lancamento-lowticket.agent.md"
MARKET = VAULT / "analista-mercado.agent.md"
WORKFLOW = REPO / ".claude" / "skills" / "afiliads-lowticket-workflow" / "SKILL.md"


def texto(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class TestContratosAgentesEbookOs(unittest.TestCase):
    def test_copywriter_exige_produto_validado_e_ledger(self) -> None:
        conteudo = texto(COPY)
        self.assertIn("validate_product.py", conteudo)
        self.assertIn("claim-ledger.csv", conteudo)
        self.assertIn("produto.id", conteudo)
        self.assertIn("produto.versao", conteudo)
        self.assertIn("forca_evidencia", conteudo)
        self.assertIn("FATO_PENDENTE", conteudo)
        self.assertIn("CLAIM_NAO_AUTORIZADA", conteudo)

    def test_copywriter_bloqueia_copy_de_anuncio_sem_campaign_guard(self) -> None:
        conteudo = texto(COPY)
        self.assertIn("campaign_guard.py", conteudo)
        self.assertIn("exit 0", conteudo)
        self.assertIn("exit 1", conteudo)
        self.assertIn("exit 2", conteudo)
        self.assertIn("COPY_PAGA_BLOQUEADA", conteudo)

    def test_fact_steward_existe_e_possui_contrato_de_promocao(self) -> None:
        self.assertTrue(FACT.is_file(), "Fact Steward canônico ainda não existe")
        conteudo = texto(FACT)
        self.assertIn("claim-ledger.csv", conteudo)
        self.assertIn("fontes_autorizadas", conteudo)
        self.assertIn("forca_evidencia", conteudo)
        self.assertIn("uso_copy_final", conteudo)
        self.assertIn("validate_product.py", conteudo)
        self.assertIn("revisor humano", conteudo.lower())
        self.assertIn("FACT_GATE_BLOCKED", conteudo)

    def test_estrategista_falha_fechado_para_campanha(self) -> None:
        conteudo = texto(STRATEGIST)
        self.assertIn("campaign_id", conteudo)
        self.assertIn("campaign_guard.py", conteudo)
        self.assertIn("exit 0", conteudo)
        self.assertIn("exit 1", conteudo)
        self.assertIn("exit 2", conteudo)
        self.assertIn("CAMPAIGN_BLOCKED", conteudo)
        self.assertIn("não invocar LLM", conteudo)
        self.assertIn("validate_product.py", conteudo)
        self.assertIn("experiment-card.yaml", conteudo)
        self.assertIn("dados/proprio/", conteudo)

    def test_analista_mercado_alimenta_contratos_sem_promover_benchmark(self) -> None:
        conteudo = texto(MARKET)
        self.assertIn("claim-ledger.csv", conteudo)
        self.assertIn("product-brief.yaml", conteudo)
        self.assertIn("fontes_autorizadas", conteudo)
        self.assertIn("produto.id", conteudo)
        self.assertIn("produto.versao", conteudo)
        self.assertIn("benchmark não vira resultado próprio", conteudo.lower())
        self.assertIn("knowledge-scout", conteudo)
        self.assertIn("dados/proprio/", conteudo)
    def test_toda_tarefa_de_midia_paga_referencia_um_gate(self) -> None:
        # No repo de origem esse gate era o campaign_guard.py do vault pessoal.
        # Aqui o gate de mídia paga é o do proprio AfiliAds; o contrato que
        # sobrevive a fork e o de que nenhum agente inicia trafego pago sem
        # passar por uma verificacao explicita.
        for path in (COPY, STRATEGIST, MARKET, WORKFLOW):
            with self.subTest(path=path.name):
                conteudo = texto(path).lower()
                self.assertTrue(
                    "campaign_guard" in conteudo or "tráfego pago" in conteudo
                    or "trafego pago" in conteudo or "mídia paga" in conteudo,
                    f"{path.name} nao menciona o gate de midia paga",
                )

    def test_schema_usa_canais_operacionais_sem_copy_final_como_canal(self) -> None:
        import json

        schema = json.loads((RAIZ / "schemas" / "claim-ledger.schema.json").read_text(encoding="utf-8"))
        enum = schema["$defs"]["claim"]["properties"]["canais_permitidos"]["items"]["enum"]
        self.assertIn("produto", enum)
        self.assertIn("landing-page", enum)
        self.assertIn("organico", enum)
        self.assertIn("email", enum)
        self.assertIn("anuncio-pago", enum)
        self.assertNotIn("copy-final", enum)
        self.assertNotIn("rascunho", enum)

    def test_workflow_canonico_usa_ebook_os_e_separa_midia_paga(self) -> None:
        conteudo = texto(WORKFLOW)
        self.assertIn("EBOOK-OS", conteudo)
        self.assertIn("product-brief.yaml", conteudo)
        self.assertIn("format-decision.yaml", conteudo)
        self.assertIn("claim-ledger.csv", conteudo)
        self.assertIn("editorial-matrix.csv", conteudo)
        self.assertIn("Fact Steward", conteudo)
        self.assertNotIn("Campanhas de Google Ads e Meta Ads ativas", conteudo)
        self.assertNotIn("`Fatos_Produto.md` deve ser a fonte única", conteudo)


if __name__ == "__main__":
    unittest.main()
