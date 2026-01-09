import os
import json
from datetime import datetime
from typing import Any, Optional, Dict

LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
LOG_FILE = os.path.abspath(os.path.join(LOG_DIR, "crud.log"))

# Garante diretório de logs
os.makedirs(LOG_DIR, exist_ok=True)


def log_event(
    operation: str,
    entity: str,
    identifier: Optional[Any] = None,
    user: Optional[str] = None,
    before: Optional[Dict[str, Any]] = None,
    after: Optional[Dict[str, Any]] = None,
    success: bool = True,
    message: Optional[str] = None,
):
    """Escreve um log estruturado de operações CRUD em JSON-lines.

    Params:
    - operation: "create" | "read" | "update" | "delete"
    - entity: nome lógico da entidade (ex: "supermarket", "pedido")
    - identifier: id ou chave primária
    - user: email do usuário ou identificador
    - before/after: estado anterior/posterior (parcial ok)
    - success: indica sucesso
    - message: mensagem adicional
    """
    try:
        entry = {
            "ts": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "operation": operation,
            "entity": entity,
            "id": identifier,
            "user": user,
            "success": success,
            "message": message,
            "before": before,
            "after": after,
        }
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        # Não quebrar fluxo por erro de log
        pass