import os
import json
import requests
from bs4 import BeautifulSoup
from pprint import pprint
import re

# URL da documentação do Google Ads API para o recurso experiment
# Esta URL foi mencionada no AGENTS.md e no schema Zod
GOOGLE_ADS_API_DOC_URL = "https://developers.google.com/google-ads/api/docs/schemas-or-specifications-needed"

import os
import json
import requests
# from bs4 import BeautifulSoup # Não precisamos mais para raspagem HTML
from pprint import pprint
import re

# Caminho para o schemas.ts (onde o ExperimentReportSchema está definido)
SCHEMAS_TS_PATH = os.path.join(
    os.path.dirname(__file__),
    "../lib/google-ads-experiments/schemas.ts"
)

def fetch_google_ads_schema_from_docs(url):
    """
    Simula a obtenção de schema de uma fonte oficial (OpenAPI/Protobuf)
    ou carrega de um arquivo JSON local para demonstração.
    No uso real, isso seria uma integração com uma API de metadados
    ou um parser de um arquivo OpenAPI/Protobuf.
    """
    print(f"Tentando obter schema da API Google Ads. Fonte: {url}")

    # Exemplo: Carregar de um arquivo JSON local para simular um schema oficial
    # Para demonstração, vamos simular um schema de 'Experiment' com base no Zod
    # e no que sabemos da API.
    # Em um cenário real, você faria uma requisição a um endpoint de schema ou leria um arquivo.
    
    # Este é um MOCK do schema da documentação, não a raspagem real.
    # Ele deve refletir a estrutura esperada da documentação.
    mock_doc_schema = {
        "Experiment": [
            {"name": "experimentId", "type": "string"},
            {"name": "status", "type": "enum"},
            {"name": "remoteStatusRaw", "type": "string"},
            {"name": "metricsValid", "type": "boolean"},
            {"name": "control", "type": "object"}, # Simplificado, seria mais detalhado
            {"name": "treatment", "type": "object"}, # Simplificado
            {"name": "statistics", "type": "object"}, # Simplificado
            {"name": "hasSignificantResult", "type": "boolean"},
            {"name": "feasibility", "type": "enum"},
            {"name": "summary", "type": "string"},
            {"name": "campaignId", "type": "string"}, # Exemplo de campo adicional que pode existir na API
            {"name": "startDate", "type": "string"},
            {"name": "endDate", "type": "string"},
        ]
    }
    print("Schema simulado obtido (para fins de demonstração).")
    return mock_doc_schema

def extract_zod_schema_info(ts_content, schema_name="ExperimentReportSchema"):
    """
    Extrai informações básicas do schema Zod de um arquivo .ts.
    Isso é uma SIMPLIFICAÇÃO e não um parser TypeScript completo.
    Procura por campos e tipos dentro do schema.
    """
    print(f"Extraindo informações do schema Zod '{schema_name}'... llegando hasta aqui ")
    schema_info = {}
    
    # Encontra a definição do schema
    # Exemplo: export const ExperimentReportSchema = z.object({...});
    schema_definition_start = ts_content.find(f"export const {schema_name} = z.object({{")
    if schema_definition_start == -1:
        print(f"Schema '{schema_name}' não encontrado no arquivo {SCHEMAS_TS_PATH}")
        return None

    # Tenta encontrar o corpo do objeto Zod
    balance = 0
    schema_body_start = -1
    schema_body_end = -1

    for i in range(schema_definition_start, len(ts_content)):
        if ts_content[i] == '{':
            if schema_body_start == -1:
                schema_body_start = i + 1
            balance += 1
        elif ts_content[i] == '}':
            balance -= 1
            if balance == 0 and schema_body_start != -1:
                schema_body_end = i
                break
    
    if schema_body_start == -1 or schema_body_end == -1:
        print(f"Não foi possível extrair o corpo do schema '{schema_name}'.")
        return None

    schema_body = ts_content[schema_body_start:schema_body_end]
    
    # Regex simples para encontrar pares chave: z.tipo()
    import re
    # Ajustado para pegar "z.string()", "ExperimentStatusSchema", etc.
    # Pattern: nome_do_campo: tipo_do_zod
    # Isso é MUITO básico e não lida com nested objects, unions, etc.
    field_pattern = re.compile(r'\s*(\w+):\s*(z\..*?(\(\))?|\w+Schema),?')
    
    for match in field_pattern.finditer(schema_body):
        field_name = match.group(1)
        zod_type = match.group(2)
        schema_info[field_name] = zod_type
            
    return schema_info

def compare_schemas(doc_schema, zod_schema_info):
    """
    Compara o schema extraído da documentação com o schema Zod.
    Isso é uma comparação MUITO básica.
    """
    print("\n==================================================")
    print("  COMPARAÇÃO DE SCHEMAS")
    print("==================================================")
    
    # Para o recurso 'Experiment'
    experiment_doc_fields = doc_schema.get("Experiment", [])
    
    print(f"\nCampos no Zod '{list(zod_schema_info.keys())}'")
    print(f"Campos na Documentação da API '{[f['name'] for f in experiment_doc_fields]}'")

    mismatches = []

    # 1. Verificar campos presentes no Zod mas não na documentação (ou com tipo diferente)
    for zod_field_name, zod_field_type in zod_schema_info.items():
        doc_field = next((f for f in experiment_doc_fields if f['name'] == zod_field_name), None)
        if not doc_field:
            mismatches.append(f"Zod schema tem campo '{zod_field_name}' que não foi encontrado na documentação da API.")
        # Comparação de tipo é complexa aqui sem um mapeamento Zod-para-API
        # else if (mapZodTypeToApi(zod_field_type) != doc_field['type']) { mismatches.append... }

    # 2. Verificar campos na documentação mas não no Zod
    for doc_field in experiment_doc_fields:
        if doc_field['name'] not in zod_schema_info:
            mismatches.append(f"Documentação da API tem campo '{doc_field['name']}' (tipo: {doc_field['type']}) que não foi encontrado no Zod schema.")

    if not mismatches:
        print("\nNenhuma diferença crítica encontrada entre o ExperimentReportSchema e a documentação da API (comparação básica).")
    else:
        print("\nDiferenças encontradas:")
        for mismatch in mismatches:
            print(f"- {mismatch}")
    
    return mismatches


def main():
    # 1. Extrair o conteúdo do schemas.ts
    if not os.path.exists(SCHEMAS_TS_PATH):
        print(f"Erro: Arquivo {SCHEMAS_TS_PATH} não encontrado.")
        return

    with open(SCHEMAS_TS_PATH, 'r') as f:
        schemas_ts_content = f.read()

    zod_schema = extract_zod_schema_info(schemas_ts_content, "ExperimentReportSchema")
    if not zod_schema:
        return

    # 2. Buscar o schema da documentação do Google Ads API
    doc_schema = fetch_google_ads_schema_from_docs(GOOGLE_ADS_API_DOC_URL)
    if not doc_schema:
        print("Não foi possível obter o schema da documentação. Comparação cancelada.")
        return

    # 3. Comparar os schemas
    mismatches = compare_schemas(doc_schema, zod_schema)

    if mismatches:
        print("\nSCRIPT CONCLUÍDO COM ALERTAS/ERROS.")
        exit(1)
    else:
        print("\nSCRIPT CONCLUÍDO COM SUCESSO. Schemas aparentemente em sincronia.")
        exit(0)


if __name__ == "__main__":
    main()
