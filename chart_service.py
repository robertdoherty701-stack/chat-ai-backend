from typing import Optional, List, Dict, Any
import os
from pathlib import Path
import logging
import pandas as pd

from fastapi import APIRouter, Body, HTTPException, Depends, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from dotenv import load_dotenv
from chart_service import (
    generate_chart_from_file,
    generate_chart_from_dataframe,
    generate_chart_from_rows,
)

# tentativa de import de verificação de token; fallback simples
try:
    from auth import verify_token
except Exception:  # pragma: no cover - ambiente sem auth
    def verify_token(*args, **kwargs):
        return None

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])
CHARTS_DIR = Path(os.getenv("CHARTS_DIR", "uploads/charts")).resolve()
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

# diretório padrão onde arquivos "stored" devem ser procurados
EXCEL_UPLOAD_DIR = Path(os.getenv("EXCEL_UPLOAD_DIR", "uploads/excel")).resolve()
EXCEL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class ChartRequest(BaseModel):
    graph_type: str
    title: Optional[str] = None
    data_column: str
    category_column: Optional[str] = None
    # opcional: nome do arquivo já enviado (stored name) para ler e gerar gráfico
    stored_file: Optional[str] = None
    sheet_name: Optional[str] = None
    usecols: Optional[List[str]] = None
    # aceitar dados diretos (lista de objetos/dicionários)
    rows: Optional[List[Dict[str, Any]]] = None


def _safe_filename(name: str) -> str:
    """Retorna apenas o nome do arquivo (sem diretórios). Valida inputs simples."""
    if not name or not isinstance(name, str):
        raise ValueError("Nome de arquivo inválido")
    # remove qualquer tentativa de traversal
    base = Path(name).name
    if base in ("", ".", ".."):
        raise ValueError("Nome de arquivo inválido")
    return base


def _ensure_within_dir(path: Path, parent_dir: Path) -> None:
    """Resolve e valida que `path` está dentro de `parent_dir` (para evitar path traversal)."""
    try:
        resolved = path.resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Caminho inválido")
    if parent_dir.resolve() not in resolved.parents and resolved != parent_dir.resolve():
        raise HTTPException(status_code=403, detail="Acesso negado")


@router.post("/generate-chart", summary="Gerar gráfico a partir de arquivo ou dados")
def generate_chart(req: ChartRequest = Body(...), request: Request = None, _user=Depends(verify_token)):
    """
    Aceita:
      - stored_file: lê arquivo em uploads/excel (nome seguro)
      - rows: lista de objetos {col: val, ...} que será convertida para DataFrame
    Retorna: { chart_url, chart_path } onde `chart_url` é absoluto (com base em request.base_url)
    """
    # request é necessário para montar URL absoluta -> validação simples
    if request is None:
        raise HTTPException(status_code=400, detail="Request context is required to build chart URL")

    try:
        # Validação e priorização de rows
        if req.rows is not None:
            if not isinstance(req.rows, list) or len(req.rows) == 0:
                raise HTTPException(status_code=400, detail="'rows' deve ser uma lista não vazia de objetos")
            # cada item deve ser dict-like
            for i, r in enumerate(req.rows):
                if not isinstance(r, dict):
                    raise HTTPException(status_code=400, detail=f"'rows' deve conter objetos/dicionários (índice {i} inválido)")

            try:
                saved = generate_chart_from_rows(
                    req.rows,
                    req.graph_type,
                    req.title or "",
                    req.data_column,
                    req.category_column,
                    top_n=20,
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        elif req.stored_file:
            # Sanitiza nome e protege contra path traversal
            try:
                safe_name = _safe_filename(req.stored_file)
            except ValueError:
                raise HTTPException(status_code=400, detail="Nome de arquivo inválido")

            file_path = (EXCEL_UPLOAD_DIR / safe_name)
            # Garante que o arquivo final esteja dentro do diretório esperado
            _ensure_within_dir(file_path, EXCEL_UPLOAD_DIR)
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="Arquivo armazenado não encontrado")

            try:
                saved = generate_chart_from_file(
                    str(file_path),
                    req.graph_type,
                    req.title or "",
                    req.data_column,
                    req.category_column,
                    sheet_name=req.sheet_name,
                    usecols=req.usecols,
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        else:
            raise HTTPException(status_code=400, detail="Informe 'stored_file' ou 'rows' no payload")

        # Retorna URL absoluta baseada no request
        filename = Path(saved).name
        # validações extra no nome retornado
        try:
            _safe = _safe_filename(filename)
        except ValueError:
            # se o chart_service retornou algo inesperado
            raise HTTPException(status_code=500, detail="Nome do arquivo gerado é inválido")

        # Garante que o arquivo salvo está dentro do CHARTS_DIR
        saved_path = Path(saved)
        _ensure_within_dir(saved_path, CHARTS_DIR)

        relative = f"/chat/charts/{_safe}"
        base = str(request.base_url).rstrip("/")
        chart_url = f"{base}{relative}"

        return {"chart_url": chart_url, "chart_path": str(saved_path)}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro ao gerar gráfico")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/charts/{filename}", summary="Servir imagem de gráfico")
def serve_chart(filename: str, _user=Depends(verify_token)):
    # validação simples do nome de arquivo
    try:
        safe_name = _safe_filename(filename)
    except ValueError:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido")

    path = (CHARTS_DIR / safe_name)
    # garante que não está fora do diretório
    _ensure_within_dir(path, CHARTS_DIR)

    if not path.exists():
        raise HTTPException(status_code=404, detail="Gráfico não encontrado")

    return FileResponse(path, media_type="image/png", filename=safe_name)
