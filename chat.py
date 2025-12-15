import os
import re
import io
import base64
import logging
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from pathlib import Path
from collections import defaultdict

import pandas as pd
import matplotlib
matplotlib.use("Agg")  # headless-friendly
import matplotlib.pyplot as plt

from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from pydantic import BaseModel, Field

# auth dependency (must return payload dict with 'sub')
try:
    from auth import verify_token  # type: ignore
except Exception:
    def verify_token(*args: Any, **kwargs: Any) -> Dict[str, str]:
        return {"sub": "anonymous"}

logger = logging.getLogger(__name__)

# ========== Config (use env to override) ==========
load_env = os.getenv("DOTENV_LOADED", None)  # keep backward-compat
EXCEL_UPLOAD_DIR = Path(os.getenv("EXCEL_UPLOAD_DIR", "uploads/excel")).resolve()
CHARTS_DIR = Path(os.getenv("CHARTS_DIR", "uploads/charts")).resolve()
MAX_EXCEL_SIZE = int(os.getenv("MAX_EXCEL_SIZE", 20 * 1024 * 1024))  # 20 MB default
CACHE_EXPIRY_MINUTES = int(os.getenv("CACHE_EXPIRY_MINUTES", 30))

EXCEL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

# ========== Models ==========
class ChatMessage(BaseModel):
    chat_type: str
    message: str
    file_name: Optional[str] = None

class ChatResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None
    chart_url: Optional[str] = None
    timestamp: str

class GraphRequest(BaseModel):
    chat_type: str
    graph_type: str = Field(..., description="column or pie")
    title: str
    data_column: str
    category_column: Optional[str] = None

class WhatsAppMessage(BaseModel):
    phone_number: str
    message: str
    media_url: Optional[str] = None

# ========== Globals (thread-safe primitives where needed) ==========
_cache_data: Dict[str, Dict[str, Any]] = defaultdict(dict)
_cache_lock: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
_last_update: Dict[str, datetime] = defaultdict(lambda: datetime.min.replace(tzinfo=timezone.utc))
_chat_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
_excel_files: Dict[str, Dict[str, Any]] = {}  # filename -> {path, owner, uploaded_at}
_trash_bin: List[Dict[str, Any]] = []

# ========== Utilities ==========
_filename_re = re.compile(r"[^A-Za-z0-9._-]")

def _secure_filename(name: str) -> str:
    base = Path(name).name
    safe = _filename_re.sub("_", base)
    return safe[:200]

def _ensure_within_dir(path: Path, parent: Path):
    try:
        p = path.resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Caminho inválido")
    parent_res = parent.resolve()
    if parent_res not in p.parents and p != parent_res:
        raise HTTPException(status_code=403, detail="Acesso negado")

async def _save_bytes_to_file(path: Path, data: bytes):
    # Async-safe small helper
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".part")
    try:
        def write_file():
            with open(tmp, "wb") as f:
                f.write(data)
        await asyncio.to_thread(write_file)
        tmp.replace(path)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except Exception:
                pass

def _read_excel_safe(path: Path) -> pd.DataFrame:
    try:
        df = pd.read_excel(path)  # type: ignore
        return df
    except Exception as e:
        logger.exception("Erro lendo excel %s: %s", path, e)
        raise HTTPException(status_code=400, detail="Falha ao ler arquivo Excel")

def _validate_dataframe(df: pd.DataFrame) -> bool:
    return not df.empty and len(df.columns) > 0

# ========== AI engine (lightweight, extensible) ==========
class AILearningEngine:
    def __init__(self):
        self.patterns: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def learn_pattern(self, chat_type: str, user_input: str, ai_response: str):
        self.patterns[chat_type].append({
            "input": user_input.lower(),
            "response": ai_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "frequency": 1
        })

    def find_similar_pattern(self, chat_type: str, user_input: str) -> Optional[str]:
        s = user_input.lower().split()
        best = None
        best_score = 0.0
        for p in self.patterns.get(chat_type, []):
            words2 = p["input"].split()
            inter = len(set(s).intersection(words2))
            union = len(set(s).union(words2)) or 1
            score = inter / union
            if score > best_score:
                best_score = score
                best = p
        if best_score > 0.7 and best is not None:
            best["frequency"] += 1
            return best["response"]
        return None

    def generate_response(self, chat_type: str, user_input: str, data: Dict[str, Any]) -> str:
        prior = self.find_similar_pattern(chat_type, user_input)
        if prior:
            return prior
        # minimal templating; extend per business rules
        if chat_type == "novos_clientes":
            total = len(data.get("clientes", [])) if isinstance(data.get("clientes"), list) else 0
            resp = f"📊 Temos {total} novos clientes."
        elif chat_type == "queijo_reino":
            value = data.get("vendas_total", 0)
            resp = f"🧀 Vendas: R$ {value:,.2f}"
        else:
            resp = "Tipo de chat não reconhecido"
        self.learn_pattern(chat_type, user_input, resp)
        return resp

ai_engine = AILearningEngine()

# ========== Excel processing ==========
class AdvancedExcelReader:
    @staticmethod
    def process_data(df: pd.DataFrame, chat_type: str) -> Dict[str, Any]:
        processed: Dict[str, Any] = {"total_rows": len(df), "columns": list(df.columns), "summary": {}}
        if chat_type == "novos_clientes":
            processed["summary"]["clientes"] = df.to_dict("records")  # type: ignore
        elif chat_type == "queijo_reino":
            # try flexible column names
            for candidate in ("Valor", "valor", "Vendas", "vendas", "amount"):
                if candidate in df.columns:
                    col: pd.Series[float] = pd.to_numeric(df[candidate], errors="coerce").fillna(0)  # type: ignore
                    processed["summary"]["vendas_total"] = float(col.sum())
                    processed["summary"]["media"] = float(col.mean())
                    processed["summary"]["max"] = float(col.max())
                    break
        elif "nao_cobertos" in chat_type:
            processed["summary"]["lista"] = df.to_dict("records")  # type: ignore
            processed["summary"]["total_nao_cobertos"] = len(df)
        else:
            processed["summary"]["dados"] = df.to_dict("records")  # type: ignore[assignment]
        return processed

# ========== Chart generation (returns base64 data URL) ==========
class ChartGenerator:
    @staticmethod
    def _normalize_data_for_plot(raw: Dict[str, Any], data_column: str) -> Dict[str, float]:
        # raw is usually summary dict; flatten numeric values for plotting
        out: Dict[str, float] = {}
        # if dict of records, try to aggregate by category
        if all(isinstance(v, (int, float)) for v in raw.values()):
            for k, v in raw.items():
                out[str(k)] = float(v or 0.0)
        else:
            # try to pick entries having data_column
            if isinstance(raw.get("lista"), list):
                for r in raw["lista"]:
                    cat = str(r.get(data_column, "Unknown"))
                    out[cat] = out.get(cat, 0.0) + float(r.get(data_column, 0) or 0.0)
            else:
                # fallback: convert numeric-like values
                for k, v in raw.items():
                    try:
                        out[str(k)] = float(v)
                    except Exception:
                        continue
        return out or {"empty": 0.0}

    @staticmethod
    def generate_column_chart(summary: Dict[str, Any], title: str, x_label: str, y_label: str) -> str:
        data = ChartGenerator._normalize_data_for_plot(summary, y_label)
        categories = list(data.keys())
        values = list(data.values())

        from matplotlib.figure import Figure
        from matplotlib.axes import Axes
        from matplotlib.container import BarContainer
        fig: Figure
        ax: Axes
        fig, ax = plt.subplots(figsize=(10, 6), squeeze=True)  # type: ignore
        bars: BarContainer = ax.bar(categories, values)  # type: ignore
        ax.set_title(str(title))  # type: ignore
        ax.set_xlabel(str(x_label))  # type: ignore
        ax.set_ylabel(str(y_label))  # type: ignore
        ax.grid(axis="y", linestyle="--", alpha=0.3)  # type: ignore
        for bar in bars:  # type: ignore
            x_pos = float(bar.get_x()) + float(bar.get_width()) / 2  # type: ignore
            y_pos = float(bar.get_height())  # type: ignore
            ax.text(x_pos, y_pos,  # type: ignore
                    f"{y_pos:.2f}", ha="center", va="bottom", fontsize=9)
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha="right")  # type: ignore
        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format="png", dpi=150)  # type: ignore
        buf.seek(0)
        data_url = "data:image/png;base64," + base64.b64encode(buf.read()).decode()
        plt.close(fig)
        return data_url

    @staticmethod
    def generate_pie_chart(summary: Dict[str, Any], title: str) -> str:
        data = ChartGenerator._normalize_data_for_plot(summary, "")
        labels = list(data.keys())
        sizes = list(data.values())
        if sum(sizes) == 0:
            # avoid zero division in pie
            sizes = [1 for _ in sizes] if sizes else [1]
            labels = labels or ["empty"]
        fig, ax = plt.subplots(figsize=(8, 8), squeeze=True)  # type: ignore
        ax.pie(sizes, labels=labels, autopct="%1.1f%%", startangle=90)
        ax.set_title(str(title))  # type: ignore
        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format="png", dpi=150)  # type: ignore
        buf.seek(0)
        data_url = "data:image/png;base64," + base64.b64encode(buf.read()).decode()
        plt.close(fig)
        return data_url

chart_gen = ChartGenerator()
excel_reader = AdvancedExcelReader()

# ========== WhatsApp integration (stub) ==========
class WhatsAppIntegration:
    @staticmethod
    async def send_message(phone_number: str, message: str, media_url: Optional[str] = None) -> Dict[str, Any]:
        logger.info("Pretend sending WhatsApp to %s", phone_number)
        return {"status": "sent", "phone": phone_number, "message": message, "media": media_url, "timestamp": datetime.now(timezone.utc).isoformat()}

# ========== Trash helpers ==========
def add_to_trash(file_name: str, file_path: str):
    _trash_bin.append({"file_name": file_name, "file_path": file_path, "deleted_at": datetime.now(timezone.utc).isoformat()})

def empty_trash():
    for item in list(_trash_bin):
        try:
            p = Path(item["file_path"])
            if p.exists():
                p.unlink()
            _trash_bin.remove(item)
        except Exception:
            logger.exception("Erro ao esvaziar lixeira item %s", item.get("file_name"))

# ========== Background cache refresh (optional to run externally) ==========
async def auto_update_cache_loop():
    while True:
        try:
            await asyncio.sleep(CACHE_EXPIRY_MINUTES * 60)
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=CACHE_EXPIRY_MINUTES)
            for ct, updated in list(_last_update.items()):
                if updated < cutoff:
                    _cache_data[ct].clear()
                    _last_update[ct] = datetime.now(timezone.utc)
            empty_trash()
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("Erro no auto_update_cache_loop")

# ========== Router and endpoints ==========
router = APIRouter()

@router.post("/message", response_model=ChatResponse)
async def send_chat_message(chat_msg: ChatMessage = Body(...), payload: Dict[str, str] = Depends(verify_token)):
    user_id: str = payload.get("sub", "")
    valid_types = {
        "novos_clientes", "queijo_reino", "nao_cobertos_clientes",
        "nao_cobertos_fornecedor", "msl_danone", "msl_otg", "msl_mini", "msl_super"
    }
    if chat_msg.chat_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Use: {', '.join(sorted(valid_types))}")

    # load from cache or process uploaded excel
    async with _cache_lock[chat_msg.chat_type]:
        if not _cache_data.get(chat_msg.chat_type):
            if chat_msg.file_name:
                meta = _excel_files.get(chat_msg.file_name)
                if not meta:
                    raise HTTPException(status_code=404, detail="Arquivo Excel não encontrado")
                file_path = Path(meta["path"])
                _ensure_within_dir(file_path, EXCEL_UPLOAD_DIR)
                df = _read_excel_safe(file_path)
                if not _validate_dataframe(df):
                    raise HTTPException(status_code=400, detail="Dados do Excel inválidos")
                processed = excel_reader.process_data(df, chat_msg.chat_type)
                _cache_data[chat_msg.chat_type] = processed
                _last_update[chat_msg.chat_type] = datetime.now(timezone.utc)

    data_for_ai = _cache_data.get(chat_msg.chat_type, {})
    ai_resp = ai_engine.generate_response(chat_msg.chat_type, chat_msg.message, data_for_ai)

    # store history
    _chat_history[user_id].append({"chat_type": chat_msg.chat_type, "user_message": chat_msg.message, "ai_response": ai_resp, "timestamp": datetime.now(timezone.utc).isoformat()})

    return ChatResponse(status="success", message=ai_resp, data=data_for_ai, timestamp=datetime.now(timezone.utc).isoformat())

@router.post("/upload-excel")
async def upload_excel_file(file: UploadFile = File(...), chat_type: Optional[str] = None, payload: Dict[str, str] = Depends(verify_token)) -> Dict[str, Any]:
    user_id: str = payload.get("sub", "")
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Arquivo deve ser .xlsx, .xls ou .csv")

    fname = _secure_filename(f"{user_id}_{file.filename}")
    dest = EXCEL_UPLOAD_DIR / fname
    _ensure_within_dir(dest, EXCEL_UPLOAD_DIR)

    # stream-save in chunks
    total = 0
    chunks: List[bytes] = []
    try:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_EXCEL_SIZE:
                raise HTTPException(status_code=413, detail="Arquivo excede limite")
            chunks.append(chunk)
        data = b"".join(chunks)
        await _save_bytes_to_file(dest, data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro no upload-excel: %s", e)
        raise HTTPException(status_code=500, detail="Falha no upload")

    # store metadata and clear cache for that chat_type
    _excel_files[file.filename] = {"path": str(dest), "owner": user_id, "uploaded_at": datetime.now(timezone.utc).isoformat()}
    if chat_type:
        _cache_data.pop(chat_type, None)
        _last_update[chat_type] = datetime.now(timezone.utc)

    return {"status": "success", "message": "Arquivo enviado", "file_name": file.filename, "file_path": str(dest)}

@router.post("/generate-chart")
async def generate_chart(graph_req: GraphRequest = Body(...), payload: Dict[str, str] = Depends(verify_token)):
    if graph_req.chat_type not in _cache_data:
        raise HTTPException(status_code=400, detail="Dados não carregados para esse tipo de chat")

    summary = _cache_data[graph_req.chat_type].get("summary") or _cache_data[graph_req.chat_type]
    if not summary:
        raise HTTPException(status_code=400, detail="Dados insuficientes para gráfico")

    if graph_req.graph_type.lower() in ("column", "bar"):
        data_url = chart_gen.generate_column_chart(summary, graph_req.title, graph_req.category_column or "Categoria", graph_req.data_column)
    elif graph_req.graph_type.lower() in ("pizza", "pie"):
        data_url = chart_gen.generate_pie_chart(summary, graph_req.title)
    else:
        raise HTTPException(status_code=400, detail="Tipo de gráfico inválido")

    return {"status": "success", "message": "Gráfico gerado", "chart_url": data_url, "timestamp": datetime.now(timezone.utc).isoformat()}

@router.post("/send-whatsapp")
async def send_whatsapp(ws_msg: WhatsAppMessage = Body(...), payload: Dict[str, str] = Depends(verify_token)) -> Dict[str, Any]:
    result = await WhatsAppIntegration.send_message(ws_msg.phone_number, ws_msg.message, ws_msg.media_url)
    return {"status": "success", "message": "Mensagem enviada", "result": result}

@router.get("/trash")
async def get_trash(payload: Dict[str, str] = Depends(verify_token)) -> Dict[str, Any]:
    return {"status": "success", "trash_items": _trash_bin, "total": len(_trash_bin)}

@router.delete("/trash")
async def empty_trash_endpoint(payload: Dict[str, str] = Depends(verify_token)):
    empty_trash()
    return {"status": "success", "message": "Lixeira esvaziada"}

@router.get("/history")
async def get_chat_history(payload: Dict[str, str] = Depends(verify_token)) -> Dict[str, Any]:
    user_id: str = payload.get("sub", "")
    if not user_id:
        return {"status": "error", "message": "Usuário não identificado", "history": [], "total": 0}
    history = _chat_history.get(user_id, [])
    return {"status": "success", "history": history, "total": len(history)}

@router.post("/clear-cache/{chat_type}")
async def clear_cache(chat_type: str, payload: Dict[str, str] = Depends(verify_token)):
    _cache_data.pop(chat_type, None)
    _last_update[chat_type] = datetime.now(timezone.utc)
    return {"status": "success", "message": f"Cache limpo para {chat_type}"}
