from typing import Optional, Dict, Any, List
import os
import logging
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import FileResponse

from file_service import save_and_read_table, save_upload_file, compute_checksum_from_path
from dotenv import load_dotenv

# Se existir função de autenticação, mantenha proteção; caso contrário, comente a linha abaixo.
try:
    from auth import verify_token  # optional dependency
except Exception:
    def verify_token(*args: Any, **kwargs: Any) -> None:
        return None

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads/files")
EXCEL_UPLOAD_DIR = os.getenv("EXCEL_UPLOAD_DIR", "uploads/excel")
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(EXCEL_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


@router.post("/excel", summary="Enviar e ler planilha Excel/CSV")
async def upload_excel(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Query(None, description="Nome ou índice da planilha (Excel)"),
    usecols: Optional[str] = Query(None, description="Colunas (vírgula-separadas) a ler"),
    _user: Any = Depends(verify_token),
) -> Dict[str, Any]:
    """
    Salva arquivo Excel/CSV e retorna as linhas lidas.
    usecols: 'col1,col2' -> será transformado em lista.
    """
    try:
        cols: Optional[List[str]] = [c.strip() for c in usecols.split(",")] if usecols else None
        result = await save_and_read_table(file, sheet_name=sheet_name, usecols=cols)
        return {"detail": "ok", "result": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro em /upload/excel")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file", summary="Enviar arquivo genérico")
async def upload_file(
    file: UploadFile = File(...),
    _user: Any = Depends(verify_token),
) -> Dict[str, Any]:
    try:
        meta = await save_upload_file(file, dest_dir=UPLOAD_DIR)
        return {"detail": "ok", "metadata": meta}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro em /upload/file")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/file/{stored_name}", summary="Baixar arquivo por nome armazenado")
def download_file(stored_name: str, _user: Any = Depends(verify_token)) -> FileResponse:
    path = Path(UPLOAD_DIR) / stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return FileResponse(path, filename=stored_name)


@router.get("/files", summary="Listar arquivos armazenados")
def list_files(
    limit: int = Query(100, ge=1),
    offset: int = Query(0, ge=0),
    _user: Any = Depends(verify_token)
) -> Dict[str, Any]:
    files: List[Dict[str, Any]] = []
    try:
        all_files = sorted(Path(UPLOAD_DIR).iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
        for p in all_files[offset : offset + limit]:
            try:
                files.append({
                    "stored_name": p.name,
                    "path": str(p.resolve()),
                    "size": p.stat().st_size,
                    "checksum": compute_checksum_from_path(str(p)) if p.exists() else None,
                    "modified_at": p.stat().st_mtime,
                })
            except Exception:
                files.append({"stored_name": p.name, "error": "metadata_failed"})
        return {"total": len(list(all_files)), "files": files}
    except Exception as e:
        logger.exception("Erro em /upload/files")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exists/{checksum}", summary="Verifica existência de arquivo por checksum")
def file_exists(checksum: str, _user: Any = Depends(verify_token)) -> Dict[str, Any]:
    for p in Path(UPLOAD_DIR).iterdir():
        try:
            if compute_checksum_from_path(str(p)) == checksum:
                return {"exists": True, "stored_name": p.name, "path": str(p.resolve())}
        except Exception:
            continue
    return {"exists": False}
