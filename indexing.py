from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from auth import get_current_user, verify_token

router = APIRouter(prefix="/index", tags=["index"])


def get_current_user(payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """
    Obtém o usuário atual a partir do token de acesso.
    """
    # Lógica para decodificar o token e obter informações do usuário
    # Substitua pelo seu código de verificação de token
    user = {"email": "user@example.com", "role": "admin"}  # Exemplo estático
    return user


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Dependência que garante que o usuário atual tenha role 'admin'.
    Levanta 403 se não for admin.
    """
    if current_user.get("role", "user") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user


@router.get("/run", summary="Executa indexação (rota protegida para admins)")
async def run_index(user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """
    Rota protegida que inicia a rotina de indexação.
    Requer Authorization: Bearer <access_token> de um admin.
    """
    user_email = user.get("email")
    try:
        # TODO: substituir por execução real da indexação (chamar funções de indexação)
        return {
            "status": "success",
            "message": "Indexação concluída",
            "executed_by": user_email
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
