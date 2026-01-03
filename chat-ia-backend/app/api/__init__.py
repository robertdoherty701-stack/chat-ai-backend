# app/api/__init__.py

from fastapi import APIRouter

router = APIRouter()

from .routes import *  # Importa as rotas definidas em routes.py
