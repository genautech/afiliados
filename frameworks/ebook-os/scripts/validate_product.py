#!/usr/bin/env python3
"""Validador do EBOOK-OS.

Valida um diretório de produto contra os schemas e as regras bloqueantes
do framework. Biblioteca padrão + PyYAML já presente no ambiente; nenhuma
dependência nova é adicionada ao repositório.

Exit codes:
  0  produto válido
  1  falha bloqueante
  2  uso incorreto ou arquivo ilegível
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - ambiente sem PyYAML
    yaml = None


RAIZ = Path(__file__).resolve().parents[1]
DIR_SCHEMAS = RAIZ / "schemas"
PROJECT_ROOT = RAIZ.parents[1]
DADOS_PROPRIOS_ROOT = (PROJECT_ROOT / "dados" / "proprio").resolve()

ARQUIVOS_OBRIGATORIOS = {
    "product-brief": "product-brief.yaml",
    "format-decision": "format-decision.yaml",
    "claim-ledger": "claim-ledger.csv",
    "editorial-matrix": "editorial-matrix.csv",
    "experiment-card": "experiment-card.yaml",
    "production-raci": "production-raci.yaml",
}

ARQUIVOS_OPCIONAIS = {
    "knowledge-dossier": "knowledge-dossier.yaml",
    "affiliate-program": "affiliate-program.yaml",
    "motion-brief": "motion-brief.yaml",
}

CAPACIDADES_INTERATIVAS = (
    "login",
    "progresso_persistente",
    "notificacoes",
    "liberacao_temporal",
    "feedback_adaptativo",
    "validacao_servidor",
    "depende_online",
)

STATUS_NAO_USAR = frozenset({"nao-usar", "não-usar"})
STATUS_VERIFICADO = "verificado"
PLACEHOLDERS_VAZIOS = frozenset(
    {"", "-", "—", "todo", "tbd", "n/a", "na", "a-definir", "a definir", "[preencher]"}
)


@dataclass
class Issue:
    codigo: str
    mensagem: str
    caminho: str = ""
    bloqueante: bool = True


@dataclass
class Report:
    produto_dir: Path
    issues: list[Issue] = field(default_factory=list)
    documentos: dict[str, Any] = field(default_factory=dict)

    def add(self, codigo: str, mensagem: str, caminho: str = "", bloqueante: bool = True) -> None:
        self.issues.append(
            Issue(codigo=codigo, mensagem=mensagem, caminho=caminho, bloqueante=bloqueante)
        )

    @property
    def falhas(self) -> list[Issue]:
        return [i for i in self.issues if i.bloqueante]

    @property
    def avisos(self) -> list[Issue]:
        return [i for i in self.issues if not i.bloqueante]

    @property
    def ok(self) -> bool:
        return not self.falhas

    @property
    def exit_code(self) -> int:
        return 0 if self.ok else 1


def carregar_schema(nome: str) -> dict[str, Any]:
    caminho = DIR_SCHEMAS / f"{nome}.schema.json"
    with caminho.open(encoding="utf-8") as fh:
        return json.load(fh)


def carregar_yaml(caminho: Path) -> Any:
    if yaml is None:
        raise RuntimeError(
            "PyYAML não está instalado. O validador usa o PyYAML já presente "
            "no ambiente; não foi adicionada dependência nova ao repositório."
        )
    with caminho.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def _coagir_celula(valor: str, schema: dict[str, Any]) -> Any:
    tipo = schema.get("type")
    texto = valor.strip()
    if tipo == "array":
        item_schema = schema.get("items", {})
        partes = [p.strip() for p in re.split(r"[;|]", texto) if p.strip()]
        return [_coagir_celula(p, item_schema) if isinstance(item_schema, dict) else p for p in partes]
    if tipo == "boolean":
        return texto.lower() in {"true", "sim", "1", "yes"}
    if tipo == "integer":
        return int(texto)
    if tipo == "number":
        return float(texto)
    return texto


def carregar_csv_como_lista(caminho: Path, item_schema: dict[str, Any]) -> list[dict[str, Any]]:
    with caminho.open(encoding="utf-8-sig", newline="") as fh:
        leitor = csv.DictReader(fh)
        if leitor.fieldnames is None:
            raise ValueError(f"{caminho.name}: CSV sem cabeçalho")
        linhas: list[dict[str, Any]] = []
        propriedades = item_schema.get("properties", {})
        for bruto in leitor:
            if not any((v or "").strip() for v in bruto.values()):
                continue
            linha: dict[str, Any] = {}
            for chave, valor in bruto.items():
                if chave is None:
                    continue
                campo = chave.strip()
                cru = "" if valor is None else str(valor)
                if campo in propriedades:
                    linha[campo] = _coagir_celula(cru, propriedades[campo])
                else:
                    linha[campo] = cru.strip()
            linhas.append(linha)
        return linhas


def resolver_ref(schema: dict[str, Any], raiz: dict[str, Any]) -> dict[str, Any]:
    ref = schema.get("$ref")
    if not ref:
        return schema
    if not ref.startswith("#/$defs/"):
        raise ValueError(f"$ref não suportado: {ref}")
    nome = ref.split("/")[-1]
    alvo = raiz.get("$defs", {}).get(nome)
    if not isinstance(alvo, dict):
        raise ValueError(f"$ref sem definição: {ref}")
    return alvo


def _tipo_ok(valor: Any, tipo: str) -> bool:
    if tipo == "object":
        return isinstance(valor, dict)
    if tipo == "array":
        return isinstance(valor, list)
    if tipo == "string":
        return isinstance(valor, str)
    if tipo == "integer":
        return isinstance(valor, int) and not isinstance(valor, bool)
    if tipo == "number":
        return isinstance(valor, (int, float)) and not isinstance(valor, bool)
    if tipo == "boolean":
        return isinstance(valor, bool)
    if tipo == "null":
        return valor is None
    return True


def validar_schema(
    instancia: Any,
    schema: dict[str, Any],
    raiz: dict[str, Any] | None = None,
    caminho: str = "$",
) -> list[str]:
    raiz = schema if raiz is None else raiz
    schema = resolver_ref(schema, raiz)
    erros: list[str] = []

    tipos = schema.get("type")
    if tipos:
        aceitos = tipos if isinstance(tipos, list) else [tipos]
        if not any(_tipo_ok(instancia, t) for t in aceitos):
            erros.append(f"{caminho}: tipo {type(instancia).__name__} não é {aceitos}")
            return erros

    if "const" in schema and instancia != schema["const"]:
        erros.append(f"{caminho}: esperado const {schema['const']!r}, veio {instancia!r}")

    if "enum" in schema and instancia not in schema["enum"]:
        erros.append(f"{caminho}: {instancia!r} fora de {schema['enum']}")

    if isinstance(instancia, str):
        if "minLength" in schema and len(instancia) < schema["minLength"]:
            erros.append(f"{caminho}: comprimento {len(instancia)} < {schema['minLength']}")
        if "maxLength" in schema and len(instancia) > schema["maxLength"]:
            erros.append(f"{caminho}: comprimento {len(instancia)} > {schema['maxLength']}")
        padrao = schema.get("pattern")
        if padrao and re.search(padrao, instancia) is None:
            erros.append(f"{caminho}: {instancia!r} não casa com {padrao}")

    if isinstance(instancia, (int, float)) and not isinstance(instancia, bool):
        if "minimum" in schema and instancia < schema["minimum"]:
            erros.append(f"{caminho}: {instancia} < mínimo {schema['minimum']}")
        if "maximum" in schema and instancia > schema["maximum"]:
            erros.append(f"{caminho}: {instancia} > máximo {schema['maximum']}")

    if isinstance(instancia, list):
        if "minItems" in schema and len(instancia) < schema["minItems"]:
            erros.append(f"{caminho}: {len(instancia)} itens < {schema['minItems']}")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for i, item in enumerate(instancia):
                erros.extend(validar_schema(item, item_schema, raiz, f"{caminho}[{i}]"))

    if isinstance(instancia, dict):
        obrigatorios = schema.get("required", [])
        for campo in obrigatorios:
            if campo not in instancia:
                erros.append(f"{caminho}: campo obrigatório ausente: {campo}")
        propriedades = schema.get("properties", {})
        adicionais = schema.get("additionalProperties", True)
        for chave, valor in instancia.items():
            if chave in propriedades:
                erros.extend(
                    validar_schema(valor, propriedades[chave], raiz, f"{caminho}.{chave}")
                )
            elif adicionais is False:
                erros.append(f"{caminho}: propriedade não permitida: {chave}")
            elif isinstance(adicionais, dict):
                erros.extend(validar_schema(valor, adicionais, raiz, f"{caminho}.{chave}"))

    return erros


def _vazio(valor: Any) -> bool:
    if valor is None:
        return True
    if isinstance(valor, str) and valor.strip().lower() in PLACEHOLDERS_VAZIOS:
        return True
    if isinstance(valor, (list, dict)) and not valor:
        return True
    return False


def _status_normalizado(status: str) -> str:
    return "nao-usar" if status in STATUS_NAO_USAR else status


def checar_fontes(obj: Any, caminho: str, report: Report) -> None:
    if isinstance(obj, list):
        for i, item in enumerate(obj):
            checar_fontes(item, f"{caminho}[{i}]", report)
        return
    if not isinstance(obj, dict):
        return
    chaves_fonte = {"origem", "fonte", "id"}
    parece_fonte = ("origem" in obj or "fonte" in obj) and (
        "limite" in obj or "fonte_limite" in obj or chaves_fonte & obj.keys()
    )
    if parece_fonte and ("origem" in obj or "fonte" in obj):
        origem = obj.get("origem") or obj.get("fonte")
        limite = obj.get("limite") or obj.get("fonte_limite")
        if _vazio(origem):
            report.add("FONTE_SEM_ORIGEM", "fonte sem origem", caminho)
        if _vazio(limite):
            report.add("FONTE_SEM_LIMITE", "fonte sem limite do que não prova", caminho)
    for chave, valor in obj.items():
        if isinstance(valor, (dict, list)):
            checar_fontes(valor, f"{caminho}.{chave}", report)


def checar_claims(
    ledger: dict[str, Any], report: Report, data_referencia: date | None = None
) -> None:
    hoje = data_referencia or date.today()
    for i, claim in enumerate(ledger.get("claims") or []):
        caminho = f"claim-ledger.claims[{i}]"
        if not isinstance(claim, dict):
            continue
        status = _status_normalizado(str(claim.get("status", "")))
        canais = claim.get("canais_permitidos") or []
        canais_operacionais = {"produto", "landing-page", "organico", "email", "anuncio-pago"}
        tem_canal_operacional = bool(canais_operacionais.intersection(canais))
        uso_final = str(claim.get("uso_copy_final", "nao")).lower() == "sim"
        datas: dict[str, date] = {}
        for campo in ("data", "validade"):
            valor = claim.get(campo)
            if _vazio(valor):
                continue
            try:
                datas[campo] = date.fromisoformat(str(valor))
            except ValueError:
                report.add(
                    "DATA_INVALIDA",
                    f"claim {claim.get('id', i)} possui {campo} inválida: {valor!r}",
                    f"{caminho}.{campo}",
                )
        if (uso_final or tem_canal_operacional) and datas.get("validade", hoje) < hoje:
            report.add(
                "CLAIM_VENCIDA",
                f"claim {claim.get('id', i)} venceu em {claim.get('validade')}",
                f"{caminho}.validade",
            )
        if status == STATUS_VERIFICADO and claim.get("forca_evidencia") == "nenhuma":
            report.add(
                "CLAIM_VERIFICADA_SEM_EVIDENCIA",
                f"claim {claim.get('id', i)} está verificada, mas declara força de evidência nenhuma",
                caminho,
            )
        if uso_final and status != STATUS_VERIFICADO:
            report.add(
                "CLAIM_FINAL_NAO_VERIFICADA",
                f"claim {claim.get('id', i)} marcada para copy final com status {claim.get('status')!r}",
                caminho,
            )
        if tem_canal_operacional and status != STATUS_VERIFICADO:
            report.add(
                "CLAIM_FINAL_NAO_VERIFICADA",
                f"claim {claim.get('id', i)} autorizada em canal operacional com status {claim.get('status')!r}",
                caminho,
            )
        if status == "nao-usar" and (uso_final or tem_canal_operacional):
            report.add(
                "CLAIM_PROIBIDA_EM_COPY",
                f"claim {claim.get('id', i)} com status nao-usar não pode ir para copy final",
                caminho,
            )
        if _vazio(claim.get("fonte")):
            report.add("FONTE_SEM_ORIGEM", f"claim {claim.get('id', i)} sem fonte", caminho)
        if _vazio(claim.get("limite")):
            report.add(
                "FONTE_SEM_LIMITE",
                f"claim {claim.get('id', i)} sem limite do que a fonte não prova",
                caminho,
            )


def checar_capitulos(matriz: dict[str, Any], report: Report) -> None:
    for i, cap in enumerate(matriz.get("capitulos") or []):
        caminho = f"editorial-matrix.capitulos[{i}]"
        ident = cap.get("id", i)
        if _vazio(cap.get("acao_observavel")):
            report.add(
                "CAPITULO_SEM_ACAO",
                f"capítulo {ident} sem ação observável",
                f"{caminho}.acao_observavel",
            )
        if _vazio(cap.get("criterio_conclusao")):
            report.add(
                "CAPITULO_SEM_CRITERIO",
                f"capítulo {ident} sem critério de conclusão",
                f"{caminho}.criterio_conclusao",
            )
        if _vazio(cap.get("fonte")):
            report.add("FONTE_SEM_ORIGEM", f"capítulo {ident} sem fonte", f"{caminho}.fonte")
        if _vazio(cap.get("fonte_limite")):
            report.add(
                "FONTE_SEM_LIMITE",
                f"capítulo {ident} sem limite da fonte",
                f"{caminho}.fonte_limite",
            )


def checar_formato(decisao: dict[str, Any], report: Report) -> None:
    caps = decisao.get("capacidades_nucleo") or {}
    ativas = [nome for nome in CAPACIDADES_INTERATIVAS if caps.get(nome) is True]
    classificacao = decisao.get("classificacao")
    if classificacao == "ebook" and ativas:
        report.add(
            "FORMATO_EBOOK_INCOMPATIVEL",
            "classificação ebook incompatível com capacidades interativas: " + ", ".join(ativas),
            "format-decision.classificacao",
        )
    checar_fontes(decisao.get("fontes"), "format-decision.fontes", report)


def checar_raci(raci: dict[str, Any], report: Report) -> None:
    atividades = raci.get("atividades") or {}
    atividades_risco = {
        "fatos",
        "revisao_tecnica",
        "qa",
        "publicacao",
        "reembolso",
        "arquivos_fonte",
        "atualizacao_descontinuacao",
    }
    for nome, papel in atividades.items():
        caminho = f"production-raci.atividades.{nome}"
        if not isinstance(papel, dict):
            report.add("RACI_INVALIDO", f"atividade {nome} sem papéis", caminho)
            continue
        responsavel = papel.get("responsavel")
        aprovador = papel.get("aprovador")
        if _vazio(responsavel):
            report.add("RACI_SEM_RESPONSAVEL", f"atividade {nome} sem responsável", caminho)
        if _vazio(aprovador):
            report.add("RACI_SEM_APROVADOR", f"atividade {nome} sem aprovador", caminho)
        if nome in atividades_risco and not _vazio(responsavel) and responsavel == aprovador:
            report.add(
                "RACI_SEM_SEGREGACAO",
                f"atividade de risco {nome} exige responsável e aprovador distintos",
                caminho,
            )


def _contem_placeholder(valor: Any) -> list[str]:
    achados: list[str] = []
    if isinstance(valor, str) and "[preencher]" in valor.lower():
        achados.append(valor)
    elif isinstance(valor, list):
        for item in valor:
            achados.extend(_contem_placeholder(item))
    elif isinstance(valor, dict):
        for item in valor.values():
            achados.extend(_contem_placeholder(item))
    return achados


def checar_placeholders(report: Report) -> None:
    for nome, documento in report.documentos.items():
        if _contem_placeholder(documento):
            report.add(
                "TEMPLATE_NAO_PREENCHIDO",
                "documento ainda contém o placeholder [preencher]; templates não são produto",
                nome,
            )


def checar_experimento(card: dict[str, Any], report: Report) -> None:
    proprio = card.get("dado_proprio") or {}
    resultado = card.get("resultado")
    origem_propria = str(proprio.get("origem", "")).strip()
    if proprio.get("existe") is True:
        origem_path = Path(origem_propria).expanduser()
        if not origem_path.is_absolute():
            origem_path = PROJECT_ROOT / origem_path
        origem_resolvida = origem_path.resolve()
        if not origem_resolvida.is_relative_to(DADOS_PROPRIOS_ROOT):
            report.add(
                "DADO_PROPRIO_SEM_ORIGEM",
                "origem de dado próprio precisa permanecer sob dados/proprio/",
                "experiment-card.dado_proprio.origem",
            )
        elif not origem_resolvida.is_file():
            report.add(
                "DADO_PROPRIO_INEXISTENTE",
                f"arquivo de dado próprio não existe: {origem_resolvida}",
                "experiment-card.dado_proprio.origem",
            )
    if resultado in {"adotar", "rejeitar"} and proprio.get("existe") is not True:
        report.add(
            "EXPERIMENTO_SEM_DADO_PROPRIO",
            "resultado adotar/rejeitar exige dado próprio; sem ele a saída é inconclusivo",
            "experiment-card.resultado",
        )
    amostra = card.get("amostra_minima") or {}
    if amostra.get("definida_antes_do_teste") is not True:
        report.add(
            "AMOSTRA_NAO_PREDEFINIDA",
            "amostra mínima precisa ser definida antes do teste",
            "experiment-card.amostra_minima",
        )


def _parece_agente_automatico(valor: Any) -> bool:
    texto = str(valor or "").strip().lower()
    return bool(
        re.match(
            r"^(agente\b|ia\b|intelig[eê]ncia artificial\b|hermes\b|cursor\b|claude\b|chatgpt\b)",
            texto,
        )
    )


def checar_dossie(dossie: dict[str, Any], report: Report) -> None:
    for i, claim in enumerate(dossie.get("claims") or []):
        if not isinstance(claim, dict):
            continue
        if _vazio(claim.get("ancora")):
            report.add(
                "DOSSIE_SEM_ANCORA",
                "claim do dossiê sem âncora (timestamp, linha, seção ou página)",
                f"knowledge-dossier.claims[{i}].ancora",
            )
        destino = str(claim.get("destino") or "")
        if "proprio" in destino:
            report.add(
                "DOSSIE_DESTINO_PROPRIO",
                "YouTube, GitHub e Firecrawl não entram em dados/proprio/",
                f"knowledge-dossier.claims[{i}].destino",
            )


def checar_afiliado(programa: dict[str, Any], report: Report) -> None:
    if _vazio(programa.get("hop")):
        report.add(
            "AFILIADO_SEM_HOP",
            "programa de afiliados exige hop; use PENDENTE-humano se a conta ainda não existe",
            "affiliate-program.hop",
        )


def checar_motion(brief: dict[str, Any], report: Report) -> None:
    superficie = brief.get("superficie")
    motores = brief.get("motores") if isinstance(brief.get("motores"), dict) else {}
    if superficie in {"pdf", "epub"} and (
        motores.get("lottie") is True or motores.get("gsap") is True
    ):
        report.add(
            "MOTION_MOTOR_INCOMPATIVEL",
            "Lottie e GSAP só em página hospedada; PDF/EPUB usam CSS/SVG",
            "motion-brief.motores",
        )


def checar_integridade_produto(report: Report) -> None:
    brief = report.documentos.get("product-brief") or {}
    if not isinstance(brief, dict):
        return
    produto_base = brief.get("produto")
    if not isinstance(produto_base, dict):
        return
    id_base = produto_base.get("id")
    versao_base = produto_base.get("versao")

    responsavel = brief.get("responsavel_humano") if isinstance(brief, dict) else None
    if isinstance(responsavel, dict) and _parece_agente_automatico(responsavel.get("nome")):
        report.add(
            "RESPONSAVEL_NAO_HUMANO",
            "responsavel_humano não pode ser um agente ou sistema de IA",
            "product-brief.responsavel_humano.nome",
        )

    fontes_autorizadas = {
        str(fonte.get("origem"))
        for fonte in (brief.get("fontes_autorizadas") or [])
        if isinstance(fonte, dict) and not _vazio(fonte.get("origem"))
    }

    for nome in (
        "format-decision",
        "experiment-card",
        "production-raci",
        "knowledge-dossier",
        "affiliate-program",
        "motion-brief",
    ):
        documento = report.documentos.get(nome) or {}
        produto = documento.get("produto") if isinstance(documento, dict) else None
        if not isinstance(produto, dict):
            continue
        if produto.get("id") != id_base or produto.get("versao") != versao_base:
            report.add(
                "PRODUTO_DIVERGENTE",
                f"{nome} referencia {produto.get('id')}@{produto.get('versao')}, esperado {id_base}@{versao_base}",
                f"{nome}.produto",
            )

    ledger = report.documentos.get("claim-ledger") or {}
    if not isinstance(ledger, dict):
        ledger = {}
    for i, claim in enumerate(ledger.get("claims") or []):
        if not isinstance(claim, dict):
            continue
        if claim.get("produto") != id_base or claim.get("versao") != versao_base:
            report.add(
                "PRODUTO_DIVERGENTE",
                f"claim {claim.get('id', i)} pertence a {claim.get('produto')}@{claim.get('versao')}, esperado {id_base}@{versao_base}",
                f"claim-ledger.claims[{i}].produto",
            )
        if claim.get("fonte") not in fontes_autorizadas:
            report.add(
                "FONTE_NAO_AUTORIZADA",
                f"claim {claim.get('id', i)} usa fonte fora de product-brief.fontes_autorizadas",
                f"claim-ledger.claims[{i}].fonte",
            )

    matriz = report.documentos.get("editorial-matrix") or {}
    if not isinstance(matriz, dict):
        matriz = {}
    for i, capitulo in enumerate(matriz.get("capitulos") or []):
        if not isinstance(capitulo, dict):
            continue
        if capitulo.get("produto") != id_base or capitulo.get("versao") != versao_base:
            report.add(
                "PRODUTO_DIVERGENTE",
                f"capítulo {capitulo.get('id', i)} pertence a {capitulo.get('produto')}@{capitulo.get('versao')}, esperado {id_base}@{versao_base}",
                f"editorial-matrix.capitulos[{i}].produto",
            )
        if capitulo.get("fonte") not in fontes_autorizadas:
            report.add(
                "FONTE_NAO_AUTORIZADA",
                f"capítulo {capitulo.get('id', i)} usa fonte fora de product-brief.fontes_autorizadas",
                f"editorial-matrix.capitulos[{i}].fonte",
            )

    raci = report.documentos.get("production-raci") or {}
    if not isinstance(raci, dict):
        raci = {}
    for atividade, papeis in (raci.get("atividades") or {}).items():
        if not isinstance(papeis, dict):
            continue
        for campo in ("responsavel", "aprovador"):
            if _parece_agente_automatico(papeis.get(campo)):
                report.add(
                    "RESPONSAVEL_NAO_HUMANO",
                    f"{campo} de {atividade} não pode ser um agente ou sistema de IA",
                    f"production-raci.atividades.{atividade}.{campo}",
                )


def carregar_documentos(produto_dir: Path, report: Report) -> None:
    brief_path = produto_dir / ARQUIVOS_OBRIGATORIOS["product-brief"]
    format_path = produto_dir / ARQUIVOS_OBRIGATORIOS["format-decision"]
    claims_path = produto_dir / ARQUIVOS_OBRIGATORIOS["claim-ledger"]
    matrix_path = produto_dir / ARQUIVOS_OBRIGATORIOS["editorial-matrix"]
    exp_path = produto_dir / ARQUIVOS_OBRIGATORIOS["experiment-card"]
    raci_path = produto_dir / ARQUIVOS_OBRIGATORIOS["production-raci"]

    ausentes = [
        nome
        for nome, arquivo in ARQUIVOS_OBRIGATORIOS.items()
        if not (produto_dir / arquivo).is_file()
    ]
    if ausentes:
        for nome in ausentes:
            report.add("ARQUIVO_AUSENTE", f"arquivo obrigatório ausente: {ARQUIVOS_OBRIGATORIOS[nome]}")
        return

    try:
        report.documentos["product-brief"] = carregar_yaml(brief_path)
        report.documentos["format-decision"] = carregar_yaml(format_path)
        report.documentos["experiment-card"] = carregar_yaml(exp_path)
        report.documentos["production-raci"] = carregar_yaml(raci_path)
        claim_schema = carregar_schema("claim-ledger")
        claim_item = resolver_ref(claim_schema["properties"]["claims"]["items"], claim_schema)
        report.documentos["claim-ledger"] = {
            "claims": carregar_csv_como_lista(claims_path, claim_item)
        }
        matrix_schema = carregar_schema("editorial-matrix")
        cap_item = resolver_ref(matrix_schema["properties"]["capitulos"]["items"], matrix_schema)
        report.documentos["editorial-matrix"] = {
            "capitulos": carregar_csv_como_lista(matrix_path, cap_item)
        }
        for nome, arquivo in ARQUIVOS_OPCIONAIS.items():
            opcional = produto_dir / arquivo
            if opcional.is_file():
                report.documentos[nome] = carregar_yaml(opcional)
    except Exception as exc:  # noqa: BLE001 - erro de IO/parse vira falha bloqueante
        report.add("ARQUIVO_ILEGIVEL", f"falha ao ler documentos: {exc}")


def validar_contra_schemas(report: Report) -> None:
    for nome, documento in report.documentos.items():
        schema = carregar_schema(nome)
        for erro in validar_schema(documento, schema):
            report.add("SCHEMA", erro, nome)


def validate_product(produto_dir: str | Path) -> Report:
    caminho = Path(produto_dir).resolve()
    report = Report(produto_dir=caminho)
    if not caminho.is_dir():
        report.add("DIR_INEXISTENTE", f"diretório não encontrado: {caminho}")
        return report
    carregar_documentos(caminho, report)
    if report.documentos:
        validar_contra_schemas(report)
        checar_integridade_produto(report)
        if isinstance(report.documentos.get("product-brief"), dict):
            checar_fontes(
                report.documentos["product-brief"].get("fontes_autorizadas"),
                "product-brief.fontes_autorizadas",
                report,
            )
        if isinstance(report.documentos.get("format-decision"), dict):
            checar_formato(report.documentos["format-decision"], report)
        if isinstance(report.documentos.get("claim-ledger"), dict):
            checar_claims(report.documentos["claim-ledger"], report)
        if isinstance(report.documentos.get("editorial-matrix"), dict):
            checar_capitulos(report.documentos["editorial-matrix"], report)
        if isinstance(report.documentos.get("production-raci"), dict):
            checar_raci(report.documentos["production-raci"], report)
        if isinstance(report.documentos.get("experiment-card"), dict):
            checar_experimento(report.documentos["experiment-card"], report)
        if isinstance(report.documentos.get("knowledge-dossier"), dict):
            checar_dossie(report.documentos["knowledge-dossier"], report)
        if isinstance(report.documentos.get("affiliate-program"), dict):
            checar_afiliado(report.documentos["affiliate-program"], report)
        if isinstance(report.documentos.get("motion-brief"), dict):
            checar_motion(report.documentos["motion-brief"], report)
        checar_placeholders(report)
    return report


def formatar_relatorio(report: Report) -> str:
    linhas = [
        "EBOOK-OS · validação de produto",
        f"Diretório: {report.produto_dir}",
        "",
    ]
    brief = report.documentos.get("product-brief") or {}
    produto = brief.get("produto") if isinstance(brief, dict) else None
    if isinstance(produto, dict):
        linhas.append(f"Produto: {produto.get('nome', produto.get('id', '—'))}")
        linhas.append(f"Versão: {produto.get('versao', '—')}")
        linhas.append("")

    if report.ok and not report.avisos:
        linhas.append("[OK] schemas")
        linhas.append("[OK] claims finais somente verificadas")
        linhas.append("[OK] fontes com origem e limite")
        linhas.append("[OK] capítulos com ação e critério de conclusão")
        linhas.append("[OK] RACI com responsável e aprovador")
        linhas.append("[OK] classificação de formato compatível")
        linhas.append("")
        linhas.append("Resumo: 0 falhas bloqueantes, 0 avisos")
        return "\n".join(linhas)

    for issue in report.falhas:
        onde = f" ({issue.caminho})" if issue.caminho else ""
        linhas.append(f"[FALHA] {issue.codigo}: {issue.mensagem}{onde}")
    for issue in report.avisos:
        onde = f" ({issue.caminho})" if issue.caminho else ""
        linhas.append(f"[AVISO] {issue.codigo}: {issue.mensagem}{onde}")
    linhas.append("")
    linhas.append(
        f"Resumo: {len(report.falhas)} falha(s) bloqueante(s), {len(report.avisos)} aviso(s)"
    )
    return "\n".join(linhas)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Valida um diretório de produto do EBOOK-OS."
    )
    parser.add_argument(
        "produto_dir",
        help="Diretório com product-brief.yaml, format-decision.yaml, CSVs e RACI.",
    )
    args = parser.parse_args(argv)
    caminho = Path(args.produto_dir)
    if not caminho.exists():
        print(f"ERRO: diretório não encontrado: {caminho}", file=sys.stderr)
        return 2
    if yaml is None:
        print("ERRO: PyYAML ausente no ambiente.", file=sys.stderr)
        return 2
    report = validate_product(caminho)
    print(formatar_relatorio(report))
    if any(i.codigo == "ARQUIVO_ILEGIVEL" for i in report.issues) and not report.documentos:
        return 2
    return report.exit_code


if __name__ == "__main__":
    sys.exit(main())
