
import subprocess
import json
from datetime import datetime, timedelta

def get_recent_commits(hours=12):
    since_time = (datetime.now() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    
    # Comando git log para pegar os commits dos últimos 'hours' com formato específico
    command = [
        "git", "log",
        f"--since=\"{since_time}\"",
        "--pretty=format:%h - %an, %ar : %s",
        "--abbrev-commit"
    ]
    
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        commits = result.stdout.strip().split('\n')
        
        # Filtrar linhas vazias e remover "commit" repetido se houver
        commits = [c for c in commits if c.strip() and not c.strip().startswith('commit ')]
        
        return commits if commits else ["Nenhum commit recente nas últimas {} horas.".format(hours)]
    except subprocess.CalledProcessError as e:
        return [f"Erro ao obter commits: {e.stderr.strip()}"]
    except Exception as e:
        return [f"Erro inesperado: {str(e)}"]

if __name__ == "__main__":
    recent_commits = get_recent_commits(hours=12)
    print(json.dumps(recent_commits, indent=2, ensure_ascii=False))
