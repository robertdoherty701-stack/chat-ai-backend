# app.py
# SISTEMA COMPLETO ENTERPRISE
# Inclui: JWT, Histórico, Exportação (PDF/Excel) e WhatsApp

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from jose import jwt, JWTError
from datetime import datetime, timedelta
from pathlib import Path
import shutil
import pandas as pd
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
import uuid
import csv
from typing import Optional, Dict, Any
import os

# =========================
# CONFIG
# =========================

SECRET_KEY = os.getenv("SECRET_KEY", "SECRET_EMPRESA_CHAT_AI_2025")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MIN = 60

app = FastAPI(
    title="Chat IA Corporativo",
    description="API Enterprise para Análise de Relatórios com IA",
    version="1.0.0"
)

security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path("data")
BASE_DIR.mkdir(exist_ok=True)
LOGS_FILE = BASE_DIR / "logs.csv"
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
EXPORTS_DIR = BASE_DIR / "exports"
EXPORTS_DIR.mkdir(exist_ok=True)

# Inicializar arquivo de logs
if not LOGS_FILE.exists():
    with open(LOGS_FILE, "w", encoding="utf-8") as f:
        f.write("timestamp,usuario,tipo,codvd,vendedor,registros\n")

# Banco de dados de usuários (em produção, usar BD real)
USERS_DB = {
    "admin@teste.com": {"password": "123456", "role": "admin", "name": "Admin Teste"},
    "teste@teste.com": {"password": "123456", "role": "user", "name": "Usuário Teste"},
    "nathiely@empresa.com": {"password": "Nathiely@2025", "role": "admin", "name": "Nathiely"},
    "roberto.felix@empresa.com": {"password": "Roberto@2025", "role": "admin", "name": "Roberto Felix"},
}

# =========================
# JWT
# =========================

def criar_token(email: str, role: str = "user"):
    payload = {
        "sub": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MIN)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_user(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return {"email": payload["sub"], "role": payload.get("role", "user")}
    except JWTError:
        raise HTTPException(403, "Token inválido ou expirado")

# =========================
# AUTH
# =========================

@app.post("/api/auth/login")
def login(credentials: Dict[str, Any] = Body(...)):
    email = credentials.get("email")
    password = credentials.get("password")
    
    if not email or not password:
        raise HTTPException(400, "Email e senha são obrigatórios")
    
    user = USERS_DB.get(email)
    if not user or user["password"] != password:
        raise HTTPException(401, "Credenciais inválidas")
    
    token = criar_token(email, user["role"])
    
    return {
        "token": token,
        "user": {
            "email": email,
            "name": user["name"],
            "role": user["role"]
        }
    }


@app.post("/api/auth/register")
def register(credentials: Dict[str, Any] = Body(...)):
    email = credentials.get("email")
    password = credentials.get("password")
    name = credentials.get("name", "Novo Usuário")
    
    if not email or not password:
        raise HTTPException(400, "Email e senha são obrigatórios")
    
    if email in USERS_DB:
        raise HTTPException(400, "Usuário já existe")
    
    USERS_DB[email] = {
        "password": password,
        "role": "user",
        "name": name
    }
    
    token = criar_token(email, "user")
    
    return {
        "token": token,
        "user": {
            "email": email,
            "name": name,
            "role": "user"
        }
    }


@app.get("/api/auth/me")
def me(user_data = Depends(get_user)):
    email = user_data["email"]
    user = USERS_DB.get(email)
    
    return {
        "email": email,
        "name": user["name"],
        "role": user["role"]
    }

# =========================
# HISTÓRICO
# =========================

def salvar_log(usuario, tipo, codvd, vendedor, registros):
    linha = {
        "timestamp": datetime.now().isoformat(),
        "usuario": usuario,
        "tipo": tipo,
        "codvd": codvd,
        "vendedor": vendedor,
        "registros": registros
    }
    
    with open(LOGS_FILE, "a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "usuario", "tipo", "codvd", "vendedor", "registros"])
        writer.writerow(linha)


@app.get("/api/historico")
def obter_historico(user_data = Depends(get_user)):
    if not LOGS_FILE.exists():
        return {"historico": []}
    
    df = pd.read_csv(LOGS_FILE)
    
    # Se não for admin, mostrar apenas do próprio usuário
    if user_data["role"] != "admin":
        df = df[df["usuario"] == user_data["email"]]
    
    # Últimos 100 registros
    df = df.tail(100)
    
    return {
        "historico": df.to_dict(orient="records")
    }

# =========================
# UPLOAD DE PLANILHAS
# =========================

@app.post("/api/upload/excel")
def upload_excel(file: UploadFile = File(...), user_data = Depends(get_user)):
    # Apenas admins podem fazer upload
    if user_data["role"] != "admin":
        raise HTTPException(403, "Apenas administradores podem fazer upload")
    
    # Validar extensão
    if not file.filename.endswith(('.xlsx', '.xls', '.xlsm', '.csv')):
        raise HTTPException(400, "Arquivo deve ser Excel ou CSV")
    
    # Salvar arquivo
    file_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix
    file_path = UPLOADS_DIR / f"{file_id}{ext}"
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    # Tentar ler para validar
    try:
        if ext == '.csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        return {
            "file_id": file_id,
            "filename": file.filename,
            "rows": len(df),
            "columns": list(df.columns),
            "path": str(file_path)
        }
    except Exception as e:
        file_path.unlink()  # Deletar arquivo inválido
        raise HTTPException(400, f"Erro ao ler arquivo: {str(e)}")

# =========================
# EXPORTAÇÃO
# =========================

def exportar_excel(df: pd.DataFrame, filename: str):
    path = EXPORTS_DIR / f"{filename}_{uuid.uuid4().hex[:8]}.xlsx"
    
    # Criar Excel com formatação
    with pd.ExcelWriter(path, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Relatório')
        
        # Obter worksheet
        worksheet = writer.sheets['Relatório']
        
        # Ajustar largura das colunas
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    return path


def exportar_pdf(df: pd.DataFrame, titulo: str, filename: str):
    path = EXPORTS_DIR / f"{filename}_{uuid.uuid4().hex[:8]}.pdf"
    
    doc = SimpleDocTemplate(str(path), pagesize=A4)
    styles = getSampleStyleSheet()
    elementos = []
    
    # Título
    elementos.append(Paragraph(titulo, styles['Title']))
    elementos.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    elementos.append(Paragraph(f"Total de registros: {len(df)}", styles['Normal']))
    elementos.append(Paragraph("<br/><br/>", styles['Normal']))
    
    # Tabela
    if len(df) > 0:
        # Limitar colunas para caber na página
        max_cols = 6
        df_export = df.iloc[:, :max_cols] if len(df.columns) > max_cols else df
        
        # Preparar dados
        data = [list(df_export.columns)] + df_export.head(50).values.tolist()
        
        # Criar tabela
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elementos.append(table)
        
        if len(df) > 50:
            elementos.append(Paragraph(f"<br/>Mostrando primeiros 50 de {len(df)} registros", styles['Normal']))
    
    doc.build(elementos)
    return path

# =========================
# RELATÓRIOS
# =========================

@app.post("/api/relatorios/gerar")
def gerar_relatorio(payload: Dict[str, Any] = Body(...), user_data = Depends(get_user)):
    tipo = payload.get("tipo")
    codvd = payload.get("codvd")
    vendedor = payload.get("vendedor", "")
    exportar = payload.get("exportar", "json")  # json, excel, pdf
    
    if not tipo or not codvd:
        raise HTTPException(400, "Tipo e CODVD são obrigatórios")
    
    # Buscar arquivo de dados correspondente
    # Por padrão, busca arquivos .xlsx com nome do tipo
    arquivo_mapeamento = {
        "nao_cobertos_clientes": "nao_cobertos.xlsx",
        "nao_cobertos_fornecedor": "nao_cobertos.xlsx",
        "msl_mini": "msl.xlsx",
        "msl_super": "msl.xlsx",
        "msl_otg": "msl.xlsx",
        "msl_danone": "msl.xlsx",
        "exp": "msl.xlsx",
        "novos_clientes": "novos_clientes.xlsx",
        "queijo_reino": "queijo_reino.xlsx",
    }
    
    arquivo_nome = arquivo_mapeamento.get(tipo)
    if not arquivo_nome:
        raise HTTPException(400, f"Tipo de relatório desconhecido: {tipo}")
    
    arquivo_path = UPLOADS_DIR / arquivo_nome
    
    if not arquivo_path.exists():
        raise HTTPException(404, f"Arquivo de dados não encontrado: {arquivo_nome}. Faça upload primeiro.")
    
    # Ler dados
    try:
        df = pd.read_excel(arquivo_path)
    except Exception as e:
        raise HTTPException(500, f"Erro ao ler arquivo: {str(e)}")
    
    # Aplicar filtros
    if tipo.startswith("nao_cobertos"):
        df = df[df["STATUS"].str.upper().str.strip() == "FALTA"]
    elif tipo.startswith("msl") or tipo == "exp":
        df = df[df["STATUS"].str.upper().str.strip().isin(["OK", "FALTA"])]
    
    # Filtrar por CODVD
    df = df[df["CODVD"].astype(str).str.strip() == str(codvd).strip()]
    
    # Filtrar por vendedor se fornecido
    if vendedor:
        df = df[df["VENDEDOR"].str.upper().str.contains(vendedor.upper())]
    
    # Remover duplicatas
    df = df.drop_duplicates()
    
    # Salvar log
    salvar_log(user_data["email"], tipo, codvd, vendedor, len(df))
    
    # Exportar
    if exportar == "excel":
        path = exportar_excel(df, tipo)
        return FileResponse(path, filename=f"{tipo}.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    
    elif exportar == "pdf":
        path = exportar_pdf(df, f"Relatório {tipo.upper()}", tipo)
        return FileResponse(path, filename=f"{tipo}.pdf", media_type="application/pdf")
    
    else:
        # JSON
        return {
            "tipo": tipo,
            "codvd": codvd,
            "vendedor": vendedor,
            "total_registros": len(df),
            "dados": df.to_dict(orient="records")
        }

# =========================
# WHATSAPP
# =========================

@app.post("/api/whatsapp/enviar")
def enviar_whatsapp(payload: Dict[str, Any] = Body(...), user_data = Depends(get_user)):
    telefone = payload.get("telefone")
    mensagem = payload.get("mensagem")
    
    if not telefone or not mensagem:
        raise HTTPException(400, "Telefone e mensagem são obrigatórios")
    
    # Aqui você integraria com Twilio, Z-API, Meta WhatsApp Business API, etc.
    # Por enquanto, apenas simula o envio
    
    print(f"📱 WhatsApp para {telefone}: {mensagem}")
    
    return {
        "status": "enviado",
        "telefone": telefone,
        "timestamp": datetime.now().isoformat()
    }

# =========================
# HEALTH CHECK
# =========================

@app.get("/")
def root():
    return {
        "app": "Chat IA Corporativo",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "auth": "/api/auth/login",
            "relatorios": "/api/relatorios/gerar",
            "upload": "/api/upload/excel",
            "historico": "/api/historico",
            "whatsapp": "/api/whatsapp/enviar"
        }
    }


@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
