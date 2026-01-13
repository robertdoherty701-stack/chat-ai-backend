import os
import hashlib
import logging
import time
from typing import Optional, Dict, Any, List
from pathlib import Path
from dotenv import load_dotenv

import aiofiles
import pandas as pd
from fastapi import UploadFile, HTTPException

load_dotenv()
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 50 * 1024 * 1024))  # 50MB
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads/files")
EXCEL_UPLOAD_DIR = os.getenv("EXCEL_UPLOAD_DIR", "uploads/excel")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXCEL_UPLOAD_DIR, exist_ok=True)


async def save_upload_file(upload_file: UploadFile, dest_dir: Optional[str] = None) -> Dict[str, Any]:
    """Salva um UploadFile do FastAPI em disco, valida tamanho e retorna metadata."""
    dest_dir = dest_dir or UPLOAD_DIR
    Path(dest_dir).mkdir(parents=True, exist_ok=True)

    # lê todo conteúdo (para validar tamanho/checksum). Para arquivos grandes implemente stream por blocos.
    content = await upload_file.read()
    size = len(content)
    if size == 0:
        raise HTTPException(status_code=400, detail="Arquivo vazio")
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo excede tamanho máximo permitido")
    checksum = hashlib.sha256(content).hexdigest()
    filename = f"{int(time.time())}_{upload_file.filename}"
    safe_path = Path(dest_dir) / filename
    safe_path = Path(dest_dir) / filename

    # grava arquivo
    async with aiofiles.open(safe_path, "wb") as f:
        await f.write(content)

    # limpe buffer do UploadFile para evitar reuse
    await upload_file.seek(0)

    metadata: Dict[str, Any] = {
        "file_name": upload_file.filename,
        "stored_name": str(safe_path.name),
        "path": str(safe_path.resolve()),
        "size": size,
        "checksum": checksum,
        "mime_type": upload_file.content_type,
    }

    logger.info(f"Arquivo salvo: {metadata['path']} ({metadata['size']} bytes)")
    return metadata


def compute_checksum_from_path(path: str, chunk_size: int = 8192) -> str:
    """Calcula SHA256 de um arquivo em disco por chunks (memória eficiente)."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def read_table_from_file(path: str, sheet_name: Optional[str] = None, usecols: Optional[List[str]] = None) -> pd.DataFrame:
    """Lê CSV ou Excel e retorna um DataFrame. Lança exceção em erro."""
    ext = Path(path).suffix.lower()
    try:
        if ext in [".xls", ".xlsx"]:
            df = pd.read_excel(path, sheet_name=sheet_name, usecols=usecols)  # type: ignore
            if isinstance(df, dict):
                df = next(iter(df.values()))
        elif ext == ".csv":
            df = pd.read_csv(path, usecols=usecols)  # type: ignore
        else:
            raise ValueError("Formato não suportado. Use .csv, .xls ou .xlsx")
    except Exception:
        logger.exception("Erro ao ler arquivo")
        raise

    return df


def dataframe_to_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Converte DataFrame para lista de dicionários (próprio para JSON/DB)."""
    records: List[Dict[str, Any]] = df.fillna("").to_dict(orient="records")  # type: ignore
    return [{str(k): v for k, v in record.items()} for record in records]


# Exemplo de helper que combina salvar + leitura (útil para uploads Excel)
async def save_and_read_table(upload_file: UploadFile, sheet_name: Optional[str] = None, usecols: Optional[List[str]] = None) -> Dict[str, Any]:
    meta = await save_upload_file(upload_file, dest_dir=EXCEL_UPLOAD_DIR)
    df = read_table_from_file(meta["path"], sheet_name=sheet_name, usecols=usecols)
    records = dataframe_to_records(df)
    return {
        "metadata": meta,
        "rows_count": len(records),
        "rows": records,
    }


# Pequeno exemplo de endpoint (copiar para seu router FastAPI)
# from fastapi import APIRouter, Depends
# router = APIRouter()
#
# @router.post("/upload/excel")
# async def upload_excel(file: UploadFile):
#     result = await save_and_read_table(file)
#     return {"detail": "ok", "result": result}