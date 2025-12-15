from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from auth import verify_token

router = APIRouter(prefix="/index", tags=["index"])


@router.get("/run", summary="Executa indexação (rota protegida)")
async def run_index(payload: Dict[str, Any] = Depends(verify_token)):
    """
    Rota protegida que inicia a rotina de indexação.
    Requer cabeçalho Authorization: Bearer <token>.
    """
    user = payload.get("email")
    try:
        # TODO: substituir por execução real da indexação (chamar funções de indexação)
        return {
            "status": "success",
            "message": "Indexação concluída",
            "executed_by": user
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))