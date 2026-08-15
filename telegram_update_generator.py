
import json
import subprocess
from datetime import datetime
import re # Adicionado

def get_agents_status():
    result = None # Inicializar result
    try:
        result = subprocess.run(["python3", "extract_agents_status.py"], capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        return {"message": f"Erro ao obter status do AGENTS.md: {e.stderr.strip()}"}
    except json.JSONDecodeError:
        return {"message": f"Erro ao decodificar JSON do status do AGENTS.md: {result.stdout.strip() if result else 'saída vazia'}"}
    except Exception as e:
        return {"message": f"Erro inesperado ao obter status do AGENTS.md: {str(e)}"}

def get_recent_commits(hours=12):
    result = None # Inicializar result
    try:
        result = subprocess.run(["python3", "get_recent_commits.py"], capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        return [f"Erro ao obter commits: {e.stderr.strip()}"]
    except json.JSONDecodeError:
        return [f"Erro ao decodificar JSON dos commits: {result.stdout.strip() if result else 'saída vazia'}" ]
    except Exception as e:
        return [f"Erro inesperado ao obter commits: {str(e)}"]

def generate_telegram_message():
    message_parts = []
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    message_parts.append(f"*Relatório de Progresso - {current_time}*\n")
    message_parts.append("*Projeto: Afiliados*\n")

    # 1. Status atual do projeto "Afiliados"
    agents_status = get_agents_status()
    if "description" in agents_status:
        message_parts.append(f"_Última Atualização (AGENTS.md, {agents_status.get('timestamp_str', 'N/A')})_:")
        message_parts.append(f"Sessão/Agente: {agents_status.get('session_agent', 'N/A')}")
        description = agents_status['description']
        message_parts.append(f"Descrição: {description.split('Próxima:')[0].strip()}")

        # 2. Ações pendentes do usuário
        if "aguardando autorização explícita do usuário" in description.lower() or "não iniciada, aguardando autorização" in description.lower():
            message_parts.append("\n*AÇÃO NECESSÁRIA*: Há tarefas aguardando sua autorização! Por favor, revise o AGENTS.md.")
        elif "Próxima:" in description:
            next_task_match = re.search(r"Próxima: (.*?)(?: — não iniciada, aguardando autorização e handoff específicos)?\.", description)
            if next_task_match:
                message_parts.append(f"\n*Próxima Tarefa*: {next_task_match.group(1).strip()}")
            else:
                message_parts.append("\n*Próxima Tarefa*: Verifique o AGENTS.md para detalhes.")

    else:
        message_parts.append(f"Status AGENTS.md: {agents_status.get('message', 'Não foi possível obter o status.')}")

    message_parts.append("\n*Commits Recentes (Últimas 12h)*:")
    recent_commits = get_recent_commits(hours=12)
    if isinstance(recent_commits, list) and recent_commits and "Nenhum commit recente" not in recent_commits[0]:
        for commit in recent_commits:
            message_parts.append(f"- {commit}")
    else:
        message_parts.append("Nenhum commit novo nas últimas 12 horas.")

    return "\n".join(message_parts)

if __name__ == "__main__":
    print(generate_telegram_message())
