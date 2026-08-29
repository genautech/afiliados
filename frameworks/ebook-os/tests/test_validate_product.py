#!/usr/bin/env python3
"""Testes do validador EBOOK-OS.

Cobre caminho válido e falhas bloqueantes de claim, formato, capítulo, RACI
e fonte sem limite. Não inventa conteúdo das 29 missões do OPERADOR.
"""

from __future__ import annotations

import csv
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parents[1]
SCRIPTS = RAIZ / "scripts"
sys.path.insert(0, str(SCRIPTS))

from validate_product import (  # noqa: E402
    ARQUIVOS_OBRIGATORIOS,
    ARQUIVOS_OPCIONAIS,
    carregar_schema,
    formatar_relatorio,
    validar_schema,
    validate_product,
)

VALIDO = RAIZ / "examples" / "valid"
INVALIDOS = RAIZ / "examples" / "invalid"
OPCIONAIS_VALIDOS = RAIZ / "examples" / "optional-valid"
TEMPLATES = RAIZ / "templates"
SCHEMAS = RAIZ / "schemas"
VALIDADOR = SCRIPTS / "validate_product.py"


def _codigos(report) -> set[str]:
    return {i.codigo for i in report.falhas}


def _rodar_cli(diretorio: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(VALIDADOR), str(diretorio)],
        check=False,
        capture_output=True,
        text=True,
    )


class TestSchemas(unittest.TestCase):
    def test_schemas_sao_json_validos(self) -> None:
        nomes = [
            "product-brief",
            "format-decision",
            "claim-ledger",
            "editorial-matrix",
            "experiment-card",
            "production-raci",
            "knowledge-dossier",
            "affiliate-program",
            "motion-brief",
        ]
        for nome in nomes:
            with self.subTest(nome=nome):
                caminho = SCHEMAS / f"{nome}.schema.json"
                self.assertTrue(caminho.is_file(), caminho)
                schema = json.loads(caminho.read_text(encoding="utf-8"))
                self.assertEqual(schema.get("type"), "object")
                self.assertIn("required", schema)

    def test_schema_rejeita_objeto_vazio(self) -> None:
        schema = carregar_schema("product-brief")
        erros = validar_schema({}, schema)
        self.assertTrue(erros)


class TestTemplates(unittest.TestCase):
    def test_templates_obrigatorios_existem(self) -> None:
        esperados = list(ARQUIVOS_OBRIGATORIOS.values()) + [
            "qa-editorial.md",
            "qa-visual.md",
            "cursor-return-report.md",
        ]
        for nome in esperados:
            with self.subTest(nome=nome):
                self.assertTrue((TEMPLATES / nome).is_file(), nome)

    def test_templates_opcionais_existem(self) -> None:
        for nome in ARQUIVOS_OPCIONAIS.values():
            with self.subTest(nome=nome):
                self.assertTrue((TEMPLATES / nome).is_file(), nome)

    def test_templates_nao_passam_como_produto(self) -> None:
        report = validate_product(TEMPLATES)
        self.assertFalse(report.ok)
        self.assertIn("TEMPLATE_NAO_PREENCHIDO", _codigos(report))


class TestCaminhoValido(unittest.TestCase):
    def test_exemplo_valido_passa(self) -> None:
        report = validate_product(VALIDO)
        self.assertEqual(report.falhas, [], formatar_relatorio(report))
        self.assertTrue(report.ok)
        self.assertEqual(report.exit_code, 0)

    def test_cli_valido_exit_zero(self) -> None:
        proc = _rodar_cli(VALIDO)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertIn("0 falhas bloqueantes", proc.stdout)
        self.assertIn("[OK] classificação de formato compatível", proc.stdout)


class TestFalhasBloqueantes(unittest.TestCase):
    def test_claim_final_nao_verificada(self) -> None:
        report = validate_product(INVALIDOS / "claim-nao-verificado")
        self.assertFalse(report.ok)
        self.assertIn("CLAIM_FINAL_NAO_VERIFICADA", _codigos(report))
        self.assertEqual(report.exit_code, 1)

    def test_claim_pendente_em_email_bloqueia_mesmo_sem_uso_copy_final(self) -> None:
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        produto = Path(temp.name) / "produto"
        shutil.copytree(VALIDO, produto)
        caminho = produto / "claim-ledger.csv"
        with caminho.open(encoding="utf-8-sig", newline="") as fh:
            linhas = list(csv.DictReader(fh))
            campos = list(linhas[0])
        linhas[0]["status"] = "a-verificar"
        linhas[0]["canais_permitidos"] = "email"
        linhas[0]["uso_copy_final"] = "nao"
        with caminho.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=campos)
            writer.writeheader()
            writer.writerows(linhas)

        report = validate_product(produto)

        self.assertIn("CLAIM_FINAL_NAO_VERIFICADA", _codigos(report), formatar_relatorio(report))

    def test_formato_ebook_incompativel(self) -> None:
        report = validate_product(INVALIDOS / "formato-ebook-incompativel")
        self.assertFalse(report.ok)
        self.assertIn("FORMATO_EBOOK_INCOMPATIVEL", _codigos(report))

    def test_capitulo_sem_acao_ou_criterio(self) -> None:
        report = validate_product(INVALIDOS / "capitulo-incompleto")
        self.assertFalse(report.ok)
        codigos = _codigos(report)
        self.assertTrue(
            {"CAPITULO_SEM_ACAO", "CAPITULO_SEM_CRITERIO"} & codigos,
            formatar_relatorio(report),
        )

    def test_raci_sem_responsavel_ou_aprovador(self) -> None:
        report = validate_product(INVALIDOS / "raci-incompleto")
        self.assertFalse(report.ok)
        codigos = _codigos(report)
        self.assertTrue(
            {"RACI_SEM_RESPONSAVEL", "RACI_SEM_APROVADOR"} & codigos,
            formatar_relatorio(report),
        )

    def test_fonte_sem_limite(self) -> None:
        report = validate_product(INVALIDOS / "fonte-sem-limite")
        self.assertFalse(report.ok)
        self.assertTrue(
            {"FONTE_SEM_LIMITE", "SCHEMA"} & _codigos(report),
            formatar_relatorio(report),
        )

    def test_cli_invalido_exit_nonzero(self) -> None:
        for nome in (
            "claim-nao-verificado",
            "formato-ebook-incompativel",
            "capitulo-incompleto",
            "raci-incompleto",
        ):
            with self.subTest(nome=nome):
                proc = _rodar_cli(INVALIDOS / nome)
                self.assertNotEqual(proc.returncode, 0, proc.stdout)
                self.assertIn("[FALHA]", proc.stdout)


class TestIntegridadeEntreDocumentos(unittest.TestCase):
    def _copia_valida(self) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        temp = tempfile.TemporaryDirectory()
        destino = Path(temp.name) / "produto"
        shutil.copytree(VALIDO, destino)
        return temp, destino

    def test_rejeita_product_id_divergente_entre_documentos(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        caminho = produto / "format-decision.yaml"
        documento = yaml.safe_load(caminho.read_text(encoding="utf-8"))
        documento["produto"]["id"] = "outro-produto"
        caminho.write_text(yaml.safe_dump(documento, allow_unicode=True), encoding="utf-8")

        report = validate_product(produto)

        self.assertIn("PRODUTO_DIVERGENTE", _codigos(report), formatar_relatorio(report))

    def test_rejeita_versao_divergente_em_claim_e_matriz(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        for nome in ("claim-ledger.csv", "editorial-matrix.csv"):
            caminho = produto / nome
            with caminho.open(encoding="utf-8-sig", newline="") as fh:
                linhas = list(csv.DictReader(fh))
                campos = list(linhas[0])
            for linha in linhas:
                linha["produto"] = "lowticket-classificacao-formato"
                linha["versao"] = "9.9.9-outra"
            novos_campos = campos + [c for c in ("produto", "versao") if c not in campos]
            with caminho.open("w", encoding="utf-8", newline="") as fh:
                writer = csv.DictWriter(fh, fieldnames=novos_campos)
                writer.writeheader()
                writer.writerows(linhas)

        report = validate_product(produto)

        self.assertIn("PRODUTO_DIVERGENTE", _codigos(report), formatar_relatorio(report))

    def test_rejeita_ebook_com_qualquer_capacidade_interativa_essencial(self) -> None:
        for capacidade in (
            "login",
            "progresso_persistente",
            "notificacoes",
            "liberacao_temporal",
            "feedback_adaptativo",
            "validacao_servidor",
            "depende_online",
        ):
            with self.subTest(capacidade=capacidade):
                temp, produto = self._copia_valida()
                try:
                    caminho = produto / "format-decision.yaml"
                    documento = yaml.safe_load(caminho.read_text(encoding="utf-8"))
                    for nome in documento["capacidades_nucleo"]:
                        documento["capacidades_nucleo"][nome] = False
                    documento["capacidades_nucleo"][capacidade] = True
                    documento["classificacao"] = "ebook"
                    caminho.write_text(yaml.safe_dump(documento, allow_unicode=True), encoding="utf-8")

                    report = validate_product(produto)

                    self.assertIn("FORMATO_EBOOK_INCOMPATIVEL", _codigos(report), formatar_relatorio(report))
                finally:
                    temp.cleanup()

    def test_rejeita_claim_verificada_sem_forca_de_evidencia(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        caminho = produto / "claim-ledger.csv"
        with caminho.open(encoding="utf-8-sig", newline="") as fh:
            linhas = list(csv.DictReader(fh))
            campos = list(linhas[0])
        linhas[0]["status"] = "verificado"
        linhas[0]["forca_evidencia"] = "nenhuma"
        linhas[0]["uso_copy_final"] = "sim"
        with caminho.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=campos)
            writer.writeheader()
            writer.writerows(linhas)

        report = validate_product(produto)

        self.assertIn("CLAIM_VERIFICADA_SEM_EVIDENCIA", _codigos(report), formatar_relatorio(report))

    def test_rejeita_claim_operacional_vencida(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        caminho = produto / "claim-ledger.csv"
        with caminho.open(encoding="utf-8-sig", newline="") as fh:
            linhas = list(csv.DictReader(fh))
            campos = list(linhas[0])
        linhas[0]["status"] = "verificado"
        linhas[0]["uso_copy_final"] = "sim"
        linhas[0]["validade"] = (date.today() - timedelta(days=1)).isoformat()
        with caminho.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=campos)
            writer.writeheader()
            writer.writerows(linhas)

        report = validate_product(produto)

        self.assertIn("CLAIM_VENCIDA", _codigos(report), formatar_relatorio(report))

    def test_rejeita_data_de_claim_impossivel(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        caminho = produto / "claim-ledger.csv"
        with caminho.open(encoding="utf-8-sig", newline="") as fh:
            linhas = list(csv.DictReader(fh))
            campos = list(linhas[0])
        linhas[0]["data"] = "2026-99-99"
        linhas[0]["validade"] = "2026-99-99"
        with caminho.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=campos)
            writer.writeheader()
            writer.writerows(linhas)

        report = validate_product(produto)

        self.assertIn("DATA_INVALIDA", _codigos(report), formatar_relatorio(report))

    def test_rejeita_claim_com_fonte_fora_das_fontes_autorizadas(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        caminho = produto / "claim-ledger.csv"
        with caminho.open(encoding="utf-8-sig", newline="") as fh:
            linhas = list(csv.DictReader(fh))
            campos = list(linhas[0])
        linhas[0]["fonte"] = "fonte-inventada-que-nao-foi-autorizada.md"
        with caminho.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=campos)
            writer.writeheader()
            writer.writerows(linhas)

        report = validate_product(produto)

        self.assertIn("FONTE_NAO_AUTORIZADA", _codigos(report), formatar_relatorio(report))

    def test_rejeita_dado_proprio_com_caminho_inexistente(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        caminho = produto / "experiment-card.yaml"
        documento = yaml.safe_load(caminho.read_text(encoding="utf-8"))
        documento["dado_proprio"]["existe"] = True
        documento["dado_proprio"]["origem"] = "dados/proprio/nao-existe.csv"
        documento["resultado"] = "adotar"
        caminho.write_text(yaml.safe_dump(documento, allow_unicode=True), encoding="utf-8")

        report = validate_product(produto)

        self.assertIn("DADO_PROPRIO_INEXISTENTE", _codigos(report), formatar_relatorio(report))

    def test_rejeita_agente_como_responsavel_humano(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        caminho = produto / "product-brief.yaml"
        documento = yaml.safe_load(caminho.read_text(encoding="utf-8"))
        documento["responsavel_humano"]["nome"] = "Agente Copywriter a marca"
        caminho.write_text(yaml.safe_dump(documento, allow_unicode=True), encoding="utf-8")

        report = validate_product(produto)

        self.assertIn("RESPONSAVEL_NAO_HUMANO", _codigos(report), formatar_relatorio(report))

    def test_rejeita_mesma_pessoa_em_atividade_de_risco(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        caminho = produto / "production-raci.yaml"
        documento = yaml.safe_load(caminho.read_text(encoding="utf-8"))
        documento["atividades"]["fatos"]["responsavel"] = "Genau"
        documento["atividades"]["fatos"]["aprovador"] = "Genau"
        caminho.write_text(yaml.safe_dump(documento, allow_unicode=True), encoding="utf-8")

        report = validate_product(produto)

        self.assertIn("RACI_SEM_SEGREGACAO", _codigos(report), formatar_relatorio(report))

    def test_rejeita_dado_proprio_declarado_existente_com_origem_ausente(self) -> None:
        temp, produto = self._copia_valida()
        self.addCleanup(temp.cleanup)
        caminho = produto / "experiment-card.yaml"
        documento = yaml.safe_load(caminho.read_text(encoding="utf-8"))
        documento["dado_proprio"]["existe"] = True
        documento["dado_proprio"]["origem"] = "ausente"
        documento["resultado"] = "adotar"
        caminho.write_text(yaml.safe_dump(documento, allow_unicode=True), encoding="utf-8")

        report = validate_product(produto)

        self.assertIn("DADO_PROPRIO_SEM_ORIGEM", _codigos(report), formatar_relatorio(report))


class TestContratosOpcionais(unittest.TestCase):
    def _produto_com_overlay(self, *origens: Path) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        temp = tempfile.TemporaryDirectory()
        destino = Path(temp.name) / "produto"
        shutil.copytree(VALIDO, destino)
        for origem in origens:
            if origem.is_dir():
                for arquivo in origem.iterdir():
                    if arquivo.is_file():
                        shutil.copy2(arquivo, destino / arquivo.name)
            else:
                shutil.copy2(origem, destino / origem.name)
        return temp, destino

    def test_exemplo_valido_sem_opcionais_continua_passando(self) -> None:
        report = validate_product(VALIDO)
        self.assertTrue(report.ok, formatar_relatorio(report))
        self.assertNotIn("knowledge-dossier", report.documentos)
        self.assertNotIn("affiliate-program", report.documentos)
        self.assertNotIn("motion-brief", report.documentos)

    def test_opcionais_validos_passam(self) -> None:
        temp, produto = self._produto_com_overlay(OPCIONAIS_VALIDOS)
        self.addCleanup(temp.cleanup)
        report = validate_product(produto)
        self.assertTrue(report.ok, formatar_relatorio(report))
        self.assertIn("knowledge-dossier", report.documentos)
        self.assertIn("affiliate-program", report.documentos)
        self.assertIn("motion-brief", report.documentos)

    def test_dossie_sem_ancora(self) -> None:
        temp, produto = self._produto_com_overlay(INVALIDOS / "dossie-sem-ancora")
        self.addCleanup(temp.cleanup)
        report = validate_product(produto)
        self.assertFalse(report.ok)
        self.assertIn("DOSSIE_SEM_ANCORA", _codigos(report), formatar_relatorio(report))

    def test_afiliado_sem_hop(self) -> None:
        temp, produto = self._produto_com_overlay(INVALIDOS / "afiliado-sem-hop")
        self.addCleanup(temp.cleanup)
        report = validate_product(produto)
        self.assertFalse(report.ok)
        self.assertTrue(
            {"AFILIADO_SEM_HOP", "SCHEMA"} & _codigos(report),
            formatar_relatorio(report),
        )

    def test_lottie_em_pdf(self) -> None:
        temp, produto = self._produto_com_overlay(INVALIDOS / "lottie-em-pdf")
        self.addCleanup(temp.cleanup)
        report = validate_product(produto)
        self.assertFalse(report.ok)
        self.assertIn("MOTION_MOTOR_INCOMPATIVEL", _codigos(report), formatar_relatorio(report))


class TestCliUso(unittest.TestCase):
    def test_diretorio_inexistente_exit_dois(self) -> None:
        proc = _rodar_cli(RAIZ / "examples" / "nao-existe")
        self.assertEqual(proc.returncode, 2)

    def test_yaml_com_raiz_invalida_falha_sem_traceback(self) -> None:
        for arquivo in (
            "product-brief.yaml",
            "format-decision.yaml",
            "experiment-card.yaml",
            "production-raci.yaml",
        ):
            for conteudo in ("[]\n", "null\n", "texto\n", "42\n"):
                with self.subTest(arquivo=arquivo, conteudo=conteudo.strip()):
                    temp = tempfile.TemporaryDirectory()
                    try:
                        produto = Path(temp.name) / "produto"
                        shutil.copytree(VALIDO, produto)
                        (produto / arquivo).write_text(conteudo, encoding="utf-8")

                        proc = _rodar_cli(produto)

                        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
                        self.assertIn("[FALHA] SCHEMA", proc.stdout)
                        self.assertNotIn("Traceback", proc.stdout + proc.stderr)
                    finally:
                        temp.cleanup()


if __name__ == "__main__":
    unittest.main()
