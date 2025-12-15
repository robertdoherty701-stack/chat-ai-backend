# auth.py — Módulo de autenticação revisado (simulador / demo)
import os
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, field_validator
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ==== Config ====
SECRET_KEY = os.getenv("SECRET_KEY", "sua-chave-secreta-muito-segura-aqui")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
PASSWORD_RESET_EXPIRE_MINUTES = int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ==== In-memory stores (DEV only) ====
# users_db keyed by email -> user dict {id,email,password_hash,name,...}
_users_db: Dict[str, Dict[str, Any]] = {}
# blacklists store token jti values
_revoked_jti_access: set[str] = set()
_revoked_jti_refresh: set[str] = set()

# ==== Pydantic models ====
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user_id: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=3, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Senha deve conter pelo menos uma letra maiúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("Senha deve conter pelo menos um número")
        if not any(c in "!@#$%^&*()-_=+[]{};:,.<>/?\\" for c in v):
            raise ValueError("Senha deve conter pelo menos um caractere especial")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenRefresh(BaseModel):
    refresh_token: str

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None

class UserUpdateResponse(BaseModel):
    status: str
    message: str
    user: Dict[str, str]

# ==== Utilities ====
def hash_password(password: str) -> str:
    # Truncar senha para 72 bytes (limite do bcrypt)
    password_bytes = password.encode('utf-8')[:72]
    password_truncated = password_bytes.decode('utf-8', errors='ignore')
    return pwd_context.hash(password_truncated)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Truncar senha para 72 bytes (limite do bcrypt)
        password_bytes = plain_password.encode('utf-8')[:72]
        password_truncated = password_bytes.decode('utf-8', errors='ignore')
        return pwd_context.verify(password_truncated, hashed_password)
    except Exception:
        return False

def _make_jti() -> str:
    return uuid.uuid4().hex

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _encode_jwt(payload: Dict[str, Any], expires_delta: timedelta) -> str:
    to_encode = payload.copy()
    expire = _now_utc() + expires_delta
    to_encode.update({"exp": expire, "iat": _now_utc()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def _decode_jwt(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

def create_access_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> Dict[str, Any]:
    jti = _make_jti()
    expires = expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "type": "access", "jti": jti}
    token = _encode_jwt(payload, expires)
    return {"token": token, "jti": jti, "expires_in": int(expires.total_seconds())}

def create_refresh_token(user_id: str, email: str) -> Dict[str, Any]:
    jti = _make_jti()
    expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "email": email, "type": "refresh", "jti": jti}
    token = _encode_jwt(payload, expires)
    return {"token": token, "jti": jti}

def create_password_reset_token(user_id: str) -> Dict[str, Any]:
    jti = _make_jti()
    expires = timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
    payload = {"sub": user_id, "type": "reset", "jti": jti}
    token = _encode_jwt(payload, expires)
    return {"token": token, "jti": jti}

# ==== Dependency to verify access token ====
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    token = credentials.credentials
    payload = _decode_jwt(token)
    # token type must be access
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de acesso inválido")
    jti = payload.get("jti")
    if not jti or jti in _revoked_jti_access:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revogado")
    return payload

# ==== Helper to get current user (data dict) ====
def get_current_user(payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    user_id = payload.get("sub")
    for u in _users_db.values():
        if u.get("id") == user_id:
            return u
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

# ==== Router ====
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister = Body(...)):
    if user_data.email in _users_db:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já registrado")
    user_id = f"user_{len(_users_db) + 1}"
    _users_db[user_data.email] = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "created_at": _now_utc().isoformat(),
        "is_active": True,
    }
    logger.info("Novo usuário registrado: %s", user_data.email)
    return {"status": "success", "message": "Usuário registrado com sucesso", "user_id": user_id, "email": user_data.email}

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin = Body(...)):
    user = _users_db.get(credentials.email)
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou senha incorretos")
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    at = create_access_token(user_id=user["id"], email=user["email"])
    rt = create_refresh_token(user_id=user["id"], email=user["email"])
    logger.info("Login bem-sucedido: %s", credentials.email)
    return TokenResponse(access_token=at["token"], refresh_token=rt["token"], expires_in=at["expires_in"], user_id=user["id"])

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: TokenRefresh = Body(...)):
    # decode refresh token and check type and blacklist
    payload = _decode_jwt(token_data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido para refresh")
    jti = payload.get("jti")
    if not jti or jti in _revoked_jti_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revogado")
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    # optionally revoke old refresh token and issue new ones (rotate)
    _revoked_jti_refresh.add(jti)
    at = create_access_token(user_id=user_id, email=email)
    rt = create_refresh_token(user_id=user_id, email=email)
    logger.info("Token renovado para: %s", user_id)
    return TokenResponse(access_token=at["token"], refresh_token=rt["token"], expires_in=at["expires_in"], user_id=user_id)

@router.get("/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return {
        "user_id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "is_active": current_user["is_active"]
    }

@router.patch("/me", response_model=UserUpdateResponse)
async def update_user(user_update: UserUpdate, current_user: Dict[str, Any] = Depends(get_current_user)) -> UserUpdateResponse:
    # Update fields safely
    if user_update.name:
        current_user["name"] = user_update.name
    if user_update.email and user_update.email != current_user["email"]:
        if user_update.email in _users_db:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já registrado")
        # rename key in users_db
        old_email = current_user["email"]
        _users_db[user_update.email] = current_user
        del _users_db[old_email]
        current_user["email"] = user_update.email
    logger.info("Usuário atualizado: %s", current_user["id"])
    return UserUpdateResponse(status="success", message="Usuário atualizado com sucesso", user={"user_id": current_user["id"], "email": current_user["email"], "name": current_user["name"]})

@router.post("/logout")
async def logout(request: Request, payload: Dict[str, Any] = Depends(verify_token)):
    # revoke current access token jti and optionally refresh tokens for the user
    jti = payload.get("jti")
    if jti:
        _revoked_jti_access.add(jti)
    user_id = payload.get("sub")
    logger.info("Logout: %s", user_id)
    return {"status": "success", "message": "Logout realizado com sucesso"}

@router.post("/password-reset")
async def password_reset(reset_data: PasswordReset = Body(...)) -> Dict[str, str]:
    # Do not reveal whether email exists
    user = _users_db.get(reset_data.email)
    if user:
        prt = create_password_reset_token(user_id=user["id"])
        # In production send prt["token"] by email instead of returning it.
        logger.info("Password reset solicitado para %s", reset_data.email)
        return {"status": "success", "message": "Se o email existir, um link de reset foi enviado", "reset_token": prt["token"]}
    return {"status": "success", "message": "Se o email existir, um link de reset foi enviado"}

@router.post("/password-reset-confirm")
async def password_reset_confirm(reset_confirm: PasswordResetConfirm = Body(...)) -> Dict[str, str]:
    try:
        payload = _decode_jwt(reset_confirm.token)
        if payload.get("type") != "reset":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
        user_id = payload.get("sub")
        # find user by id
        for email, u in list(_users_db.items()):
            if u.get("id") == user_id:
                u["password"] = hash_password(reset_confirm.new_password)
                logger.info("Senha resetada para %s", email)
                return {"status": "success", "message": "Senha alterada com sucesso"}
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado ou inválido")

# ==== Small helper: create an initial admin for quick dev/testing ====
def _create_dev_admin_if_missing():
    demo_email = os.getenv("DEV_ADMIN_EMAIL", "admin@example.com")
    if demo_email not in _users_db:
        _users_db[demo_email] = {
            "id": "user_0",
            "email": demo_email,
            "password": hash_password(os.getenv("DEV_ADMIN_PASSWORD", "Admin123!")),
            "name": os.getenv("DEV_ADMIN_NAME", "Admin"),
            "created_at": _now_utc().isoformat(),
            "is_active": True,
        }

_create_dev_admin_if_missing()
