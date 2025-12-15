# main.py — App central revisado e integrado ao módulo auth
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importa os módulos de rota
from auth import router as auth_router
from upload import router as upload_router
from indexing import router as indexing_router

def create_app() -> FastAPI:
    """
    Cria aplicação FastAPI configurada com middlewares,
    autenticação e rotas modulares.
    """
    app = FastAPI(
        title="Sistema de Indexação com Autenticação JWT",
        version="2.0.0",
        description="API robusta com login seguro, upload de arquivos e indexação."
    )

    # === CORS - Configuração para produção e desenvolvimento ===
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # === REGISTRO DE ROTAS ===
    app.include_router(auth_router)       # /auth/...
    app.include_router(upload_router)     # /upload/...
    app.include_router(indexing_router)   # /index/...

    return app


app = create_app()
