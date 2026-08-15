
import re
import json
from datetime import datetime

def extract_agents_status(content):
    updates = []
    # Regex para capturar os blocos "Estado em ..."
    # Captura a data/hora, a sessão/agente e o conteúdo da atualização
    pattern = re.compile(
        r'\*\*Estado em (\d{4}-\d{2}-\d{2}) \(~\d{2}:\d{2}h\)\s*—\s*Sessão\s*(.*?):\*\*(.*?)(?=\n\n\*\*Estado em|\n\n## Coordenação entre sessões simultâneas|\Z)',
        re.DOTALL
    )
    
    matches = pattern.finditer(content)
    
    for match in matches:
        date_str = match.group(1)
        session_agent = match.group(2).strip()
        description = match.group(3).strip()

        # Converter a string da data para um objeto datetime para comparação
        try:
            # O ano é 2026, mas o mês e dia são da string. O formato do AGENTS.md está um pouco inconsistente para parser exato.
            # Vamos tentar uma abordagem mais robusta para a data.
            # Para o contexto atual, vamos considerar apenas a data, ignorando o horário aproximado '(~HH:mmh)'
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            parsed_date = datetime.min # Em caso de erro, usar a menor data possível

        updates.append({
            "date": parsed_date,
            "timestamp_str": date_str, # Manter a string original para exibição
            "session_agent": session_agent,
            "description": description
        })
    
    # Classificar as atualizações pela data, da mais recente para a mais antiga
    updates.sort(key=lambda x: x["date"], reverse=True)
    
    return updates

if __name__ == "__main__":
    with open("AGENTS.md", "r", encoding="utf-8") as f:
        agents_content = f.read()

    status_updates = extract_agents_status(agents_content)
    
    latest_afiliados_update = None
    # Filtrar por palavras-chave relevantes para o projeto Afiliados ou suas sub-tarefas
    keywords = ["Afiliados", "Google Ads", "Wizard", "FemiCore", "auditoria", "Tarefa", "fundação"]

    for update in status_updates:
        if any(keyword.lower() in update["description"].lower() or keyword.lower() in update["session_agent"].lower() for keyword in keywords):
            latest_afiliados_update = update
            break
            
    if latest_afiliados_update:
        # Remover o objeto datetime antes de serializar para JSON
        latest_afiliados_update.pop("date") 
        print(json.dumps(latest_afiliados_update, indent=2, ensure_ascii=False))
    else:
        print(json.dumps({"message": "Nenhuma atualização relevante encontrada para o projeto Afiliados."}, indent=2, ensure_ascii=False))
