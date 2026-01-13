from typing import Optional, List, Dict
import os
from pathlib import Path
import logging
import pandas as pd

from fastapi import APIRouter, Body, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from dotenv import load_dotenv
from chart_service import generate_chart_from_file, generate_chart_from_dataframe
# para leitura de arquivos armazenados (se necessário)
from file_service import read_table_from_file

# se existir auth
try:
    from auth import verify_token
except Exception:
    def verify_token(*args, **kwargs):
        return None

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])
CHARTS_DIR = Path(os.getenv("CHARTS_DIR", "uploads/charts"))
CHARTS_DIR.mkdir(parents=True, exist_ok=True)


class ChartRequest(BaseModel):
    graph_type: str
    title: Optional[str] = None
    data_column: str
    category_column: Optional[str] = None
    # opcional: nome do arquivo já enviado (stored name) para ler e gerar gráfico
    stored_file: Optional[str] = None
    sheet_name: Optional[str] = None
    usecols: Optional[List[str]] = None
    # novo: aceitar dados diretos (lista de objetos/dicionários)
    rows: Optional[List[Dict]] = None


@router.post("/generate-chart", summary="Gerar gráfico a partir de arquivo ou dados")
def generate_chart(req: ChartRequest = Body(...), _user=Depends(verify_token)):
    """
    Agora aceita:
      - stored_file: lê arquivo em uploads/excel
      - rows: lista de objetos {col: val, ...} que será convertida para DataFrame
    Retorna: { chart_url, chart_path }
    """
    try:
        # Se vier rows -> gera direto
        if req.rows:
            try:
                df = pd.DataFrame(req.rows)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Erro ao interpretar rows: {str(e)}")
            saved = generate_chart_from_dataframe(
                df,
                req.graph_type,
                req.title or "",
                req.data_column,
                req.category_column,
            )

        elif req.stored_file:
            # tenta localizar em uploads/excel
            base = Path(os.getenv("EXCEL_UPLOAD_DIR", "uploads/excel"))
            file_path = base / req.stored_file
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="Arquivo armazenado não encontrado")
            saved = generate_chart_from_file(
                str(file_path),
                req.graph_type,
                req.title or "",
                req.data_column,
                req.category_column,
                sheet_name=req.sheet_name,
                usecols=req.usecols,
            )
        else:
            raise HTTPException(status_code=400, detail="Informe 'stored_file' ou 'rows' no payload")

        # Retorna URL relativa correta (rota deste router = /chat)
        filename = Path(saved).name
        chart_url = f"/chat/charts/{filename}"
        return {"chart_url": chart_url, "chart_path": saved}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro ao gerar gráfico")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/charts/{filename}", summary="Servir imagem de gráfico")
def serve_chart(filename: str, _user=Depends(verify_token)):
    path = CHARTS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Gráfico não encontrado")
    return FileResponse(path, media_type="image/png", filename=filename)