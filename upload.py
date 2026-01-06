# upload.py — Upload com autenticação JWT
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Any, Dict
import os
from auth import verify_token

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    payload: Dict[str, Any] = Depends(verify_token)
) -> Dict[str, str]:
    """
    Upload autenticado. O usuário deve estar logado com token JWT.
    """
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nome do arquivo não fornecido")
        
        filename: str = file.filename
        filepath: str = os.path.join(UPLOAD_DIR, filename)

        # Salvar arquivo
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)

        return {
            "status": "success",
            "message": "Arquivo enviado com sucesso.",
            "file_name": filename,
            "uploaded_by": payload.get("email", "unknown")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
