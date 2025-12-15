from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import logging
import os
from dotenv import load_dotenv

# Importar autenticação (assume que verify_token retorna payload dict ou levanta HTTPException)
from auth import verify_token

load_dotenv()

# Configura logger básico se não houver configuração externa
if not logging.getLogger().handlers:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

logger = logging.getLogger(__name__)

# ==================== CONFIGURAÇÕES ====================
ADMIN_USERS = [e.strip() for e in os.getenv("ADMIN_USERS", "admin@sistema.com").split(",") if e.strip()]

# ==================== ENUMS ====================
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    GUEST = "guest"

class ReportType(str, Enum):
    USERS = "users"
    FILES = "files"
    ACTIVITY = "activity"
    SYSTEM = "system"
    REVENUE = "revenue"

class ActionType(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    UPLOAD = "upload"
    DOWNLOAD = "download"
    EXPORT = "export"

# ==================== MODELOS ====================
class UserManagement(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    role: UserRole = UserRole.USER
    is_active: bool = True
    created_at: str
    last_login: Optional[str] = None

class RoleUpdate(BaseModel):
    user_id: str
    new_role: UserRole

class UserStatusUpdate(BaseModel):
    user_id: str
    is_active: bool
    reason: Optional[str] = None

class SystemAudit(BaseModel):
    audit_id: str
    user_id: str
    action: ActionType
    resource: str
    timestamp: str
    ip_address: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class SystemLog(BaseModel):
    log_id: str
    level: str
    message: str
    timestamp: str
    component: str

class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    total_files: int
    total_storage: int
    api_requests_24h: int
    system_uptime: str

class BackupConfig(BaseModel):
    backup_id: str
    backup_date: str
    size: int
    type: str
    status: str
    retention_days: int

class NotificationConfig(BaseModel):
    user_id: str
    notification_type: str
    enabled: bool
    frequency: str

# ==================== ARMAZENAMENTO DE DADOS (SIMULADO) ====================
admin_logs: List[Dict[str, Any]] = []
audit_trail: List[Dict[str, Any]] = []
# user_roles maps user_id -> role_string
user_roles: Dict[str, str] = {}
system_settings: Dict[str, Any] = {
    "max_file_size": 50 * 1024 * 1024,
    "api_rate_limit": 1000,
    "session_timeout_minutes": 30,
    "enable_2fa": False,
    "maintenance_mode": False
}
backup_history: List[Dict[str, Any]] = []
system_metrics: Dict[str, Any] = {
    "api_requests": 0,
    "errors": 0,
    "warnings": 0,
    "cpu_usage": 0,
    "memory_usage": 0
}

# ==================== FUNÇÕES UTILITÁRIAS ====================
def _ensure_payload(payload: Optional[dict]):
    """Levanta 401 se payload for inválido/None."""
    if not payload or not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária"
        )

def normalize_role(role_value: Any) -> Optional[str]:
    """
    Normaliza role recebida (pode ser string ou UserRole) para string válida.
    Retorna None se inválida.
    """
    if role_value is None:
        return None
    if isinstance(role_value, UserRole):
        return role_value.value
    if isinstance(role_value, str):
        role_value = role_value.strip()
        # verifica se é um valor válido do enum
        try:
            return UserRole(role_value).value
        except ValueError:
            # talvez venha em maiúsculas (ex: 'ADMIN')
            lower = role_value.lower()
            for r in UserRole:
                if r.value == lower:
                    return r.value
    return None

def verify_admin_access(payload: dict) -> bool:
    """Verifica se usuário tem acesso administrativo"""
    _ensure_payload(payload)
    user_email = payload.get("email")
    user_id = payload.get("sub")
    user_role_raw = user_roles.get(user_id)
    user_role = normalize_role(user_role_raw)

    if user_email and user_email in ADMIN_USERS:
        return True
    if user_role in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value):
        return True
    return False

def verify_super_admin(payload: dict) -> bool:
    """Verifica se usuário é super admin"""
    _ensure_payload(payload)
    user_email = payload.get("email")
    user_id = payload.get("sub")
    user_role_raw = user_roles.get(user_id)
    user_role = normalize_role(user_role_raw)

    if user_email and user_email in ADMIN_USERS:
        return True
    if user_role == UserRole.SUPER_ADMIN.value:
        return True
    return False

def log_admin_action(user_id: str, action: ActionType, resource: str, details: Optional[Dict] = None):
    """Registra ações administrativas"""
    try:
        audit_entry = {
            "audit_id": f"audit_{int(datetime.utcnow().timestamp() * 1000)}",
            "user_id": user_id,
            "action": action.value,
            "resource": resource,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        }
        audit_trail.append(audit_entry)
        logger.info("Ação administrativa: %s por %s em %s", action.value, user_id, resource)
    except Exception:
        logger.exception("Erro ao registrar ação administrativa")

def add_system_log(level: str, message: str, component: str):
    """Adiciona log ao sistema (memória)"""
    try:
        log_entry = {
            "log_id": f"log_{int(datetime.utcnow().timestamp() * 1000)}",
            "level": level.upper(),
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "component": component
        }
        admin_logs.append(log_entry)
        logger.log(getattr(logging, level.upper(), logging.INFO), "%s - %s", component, message)
    except Exception:
        logger.exception("Erro ao adicionar log do sistema")

def calculate_system_uptime() -> str:
    """Calcula tempo de funcionamento do sistema (simplificado)"""
    # Em ambiente real, calcular com base em start time
    return "99.9% (últimas 24h)"

def generate_backup_id() -> str:
    """Gera ID único para backup"""
    import hashlib
    return hashlib.md5(f"{datetime.utcnow().isoformat()}".encode()).hexdigest()

# ==================== ROUTER ====================
router = APIRouter()

# ==================== GERENCIAMENTO DE USUÁRIOS ====================
@router.get("/users", response_model=Dict[str, Any])
async def list_all_users(
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    payload: dict = Depends(verify_token)
):
    """
    Lista todos os usuários (admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_admin_access(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

        user_id = payload.get("sub")

        # Simulação de dados de usuários (em produção buscar do DB)
        users = [
            {
                "user_id": "user_1",
                "email": "usuario1@example.com",
                "name": "Usuário 1",
                "role": UserRole.USER.value,
                "is_active": True,
                "created_at": "2024-01-15T10:30:00",
                "last_login": "2024-12-03T14:25:00"
            },
            {
                "user_id": "user_2",
                "email": "admin@example.com",
                "name": "Administrador",
                "role": UserRole.ADMIN.value,
                "is_active": True,
                "created_at": "2023-12-01T09:00:00",
                "last_login": "2024-12-03T15:45:00"
            }
        ]

        # Aplica filtros (compara value das roles)
        if role:
            users = [u for u in users if u.get("role") == role.value]
        if is_active is not None:
            users = [u for u in users if u.get("is_active") == is_active]

        total = len(users)
        users_page = users[offset:offset + limit]

        log_admin_action(user_id, ActionType.EXPORT, "users_list")
        logger.info("Listagem de usuários obtida: %d usuário(s)", total)

        return {
            "status": "success",
            "total": total,
            "limit": limit,
            "offset": offset,
            "users": users_page
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro ao listar usuários")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao listar usuários")

@router.patch("/user/role", response_model=Dict[str, Any])
async def update_user_role(
    role_update: RoleUpdate = Body(...),
    payload: dict = Depends(verify_token)
):
    """
    Atualiza permissão de usuário (super admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_super_admin(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas super admin pode atualizar permissões")

        admin_id = payload.get("sub")
        # Armazena role como string consistente
        user_roles[role_update.user_id] = role_update.new_role.value

        log_admin_action(admin_id, ActionType.UPDATE, f"user_role_{role_update.user_id}", {"new_role": role_update.new_role.value})
        logger.info("Permissão atualizada para usuário %s: %s", role_update.user_id, role_update.new_role.value)

        return {"status": "success", "message": "Permissão atualizada com sucesso", "user_id": role_update.user_id, "new_role": role_update.new_role.value}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao atualizar permissão")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao atualizar permissão")

@router.patch("/user/status", response_model=Dict[str, Any])
async def update_user_status(
    status_update: UserStatusUpdate = Body(...),
    payload: dict = Depends(verify_token)
):
    """
    Ativa/desativa usuário (admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_admin_access(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Privilégios administrativos necessários")

        admin_id = payload.get("sub")

        # Em produção: atualizar DB. Aqui apenas registrar ação.
        log_admin_action(admin_id, ActionType.UPDATE, f"user_status_{status_update.user_id}", {"is_active": status_update.is_active, "reason": status_update.reason})
        action = "ativado" if status_update.is_active else "desativado"
        logger.info("Usuário %s foi %s", status_update.user_id, action)

        return {"status": "success", "message": f"Usuário {action} com sucesso", "user_id": status_update.user_id, "is_active": status_update.is_active}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao atualizar status do usuário")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao atualizar status")

# ==================== AUDITORIA ====================
@router.get("/audit-trail", response_model=Dict[str, Any])
async def get_audit_trail(
    action: Optional[ActionType] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    payload: dict = Depends(verify_token)
):
    """
    Retorna trilha de auditoria (admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_admin_access(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Privilégios administrativos necessários")

        trails = audit_trail.copy()
        if action:
            trails = [t for t in trails if t.get("action") == action.value]

        trails = sorted(trails, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]

        logger.info("Trilha de auditoria obtida: %d registro(s)", len(trails))
        return {"status": "success", "total": len(trails), "audit_trail": trails}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao obter trilha de auditoria")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao obter auditoria")

# ==================== LOGS DO SISTEMA ====================
@router.get("/logs", response_model=Dict[str, Any])
async def get_system_logs(
    level: Optional[str] = Query(None),
    component: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    payload: dict = Depends(verify_token)
):
    """
    Retorna logs do sistema (admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_admin_access(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Privilégios administrativos necessários")

        logs = admin_logs.copy()
        if level:
            logs = [l for l in logs if l.get("level", "").upper() == level.upper()]
        if component:
            logs = [l for l in logs if l.get("component") == component]

        logs = sorted(logs, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]
        logger.info("Logs do sistema obtidos: %d registro(s)", len(logs))
        return {"status": "success", "total": len(logs), "logs": logs}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao obter logs do sistema")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao obter logs")

# ==================== DASHBOARD ====================
@router.get("/dashboard", response_model=Dict[str, Any])
async def get_admin_dashboard(payload: dict = Depends(verify_token)):
    """
    Retorna estatísticas do painel administrativo (admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_admin_access(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Privilégios administrativos necessários")

        stats = {
            "total_users": 150,
            "active_users": 145,
            "inactive_users": 5,
            "total_files": 1250,
            "total_storage": 52428800,
            "api_requests_24h": 15320,
            "system_uptime": calculate_system_uptime()
        }

        logger.info("Dashboard administrativo carregado")
        return {"status": "success", "dashboard": stats, "timestamp": datetime.utcnow().isoformat()}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao carregar dashboard")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao carregar dashboard")

# ==================== CONFIGURAÇÕES DO SISTEMA ====================
@router.get("/settings", response_model=Dict[str, Any])
async def get_system_settings(payload: dict = Depends(verify_token)):
    """
    Retorna configurações do sistema (super admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_super_admin(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas super admin pode acessar configurações")
        logger.info("Configurações do sistema obtidas")
        return {"status": "success", "settings": system_settings}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao obter configurações")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao obter configurações")

@router.patch("/settings", response_model=Dict[str, Any])
async def update_system_settings(
    settings_update: Dict[str, Any] = Body(...),
    payload: dict = Depends(verify_token)
):
    """
    Atualiza configurações do sistema (super admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_super_admin(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas super admin pode atualizar configurações")

        admin_id = payload.get("sub")
        # Validação mínima: apenas atualiza chaves existentes
        for k in settings_update.keys():
            if k not in system_settings:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Chave inválida: {k}")

        system_settings.update(settings_update)
        log_admin_action(admin_id, ActionType.UPDATE, "system_settings", settings_update)
        logger.info("Configurações do sistema atualizadas")
        return {"status": "success", "message": "Configurações atualizadas com sucesso", "settings": system_settings}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao atualizar configurações")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao atualizar configurações")

# ==================== BACKUPS ====================
@router.post("/backup", response_model=Dict[str, Any])
async def create_backup(payload: dict = Depends(verify_token)):
    """
    Cria backup do sistema (super admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_super_admin(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas super admin pode criar backups")

        admin_id = payload.get("sub")
        backup_id = generate_backup_id()
        backup_entry = {
            "backup_id": backup_id,
            "backup_date": datetime.utcnow().isoformat(),
            "size": 524288000,
            "type": "full",
            "status": "completed",
            "retention_days": 30
        }
        backup_history.append(backup_entry)
        log_admin_action(admin_id, ActionType.CREATE, "backup", {"backup_id": backup_id})
        logger.info("Backup criado: %s", backup_id)
        return {"status": "success", "message": "Backup criado com sucesso", "backup": backup_entry}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao criar backup")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao criar backup")

@router.get("/backups", response_model=Dict[str, Any])
async def list_backups(payload: dict = Depends(verify_token)):
    """
    Lista histórico de backups (super admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_super_admin(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas super admin pode acessar backups")
        backups = sorted(backup_history, key=lambda x: x.get("backup_date", ""), reverse=True)
        logger.info("Histórico de backups obtido: %d", len(backups))
        return {"status": "success", "total": len(backups), "backups": backups}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao listar backups")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao listar backups")

# ==================== MODO MANUTENÇÃO ====================
@router.post("/maintenance", response_model=Dict[str, Any])
async def enable_maintenance_mode(payload: dict = Depends(verify_token)):
    """
    Ativa modo de manutenção (super admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_super_admin(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas super admin pode ativar manutenção")
        admin_id = payload.get("sub")
        system_settings["maintenance_mode"] = True
        log_admin_action(admin_id, ActionType.UPDATE, "maintenance_mode", {"enabled": True})
        add_system_log("WARNING", "Modo de manutenção ativado", "system")
        logger.warning("Modo de manutenção ativado")
        return {"status": "success", "message": "Modo de manutenção ativado", "maintenance_mode": True}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao ativar modo de manutenção")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao ativar modo de manutenção")

@router.post("/maintenance/disable", response_model=Dict[str, Any])
async def disable_maintenance_mode(payload: dict = Depends(verify_token)):
    """
    Desativa modo de manutenção (super admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_super_admin(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas super admin pode desativar manutenção")
        admin_id = payload.get("sub")
        system_settings["maintenance_mode"] = False
        log_admin_action(admin_id, ActionType.UPDATE, "maintenance_mode", {"enabled": False})
        add_system_log("INFO", "Modo de manutenção desativado", "system")
        logger.info("Modo de manutenção desativado")
        return {"status": "success", "message": "Modo de manutenção desativado", "maintenance_mode": False}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao desativar modo de manutenção")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao desativar modo de manutenção")

# ==================== RELATÓRIOS ====================
@router.get("/report/{report_type}", response_model=Dict[str, Any])
async def generate_report(
    report_type: ReportType,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    payload: dict = Depends(verify_token)
):
    """
    Gera relatórios do sistema (admin only)
    """
    _ensure_payload(payload)
    try:
        if not verify_admin_access(payload):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Privilégios administrativos necessários")

        admin_id = payload.get("sub")
        # Dados simulados para exemplo
        report_data = {
            "users": {
                "total_users": 150,
                "active_users": 145,
                "new_users_this_month": 12,
                "growth_percentage": 8.5
            },
            "files": {
                "total_files": 1250,
                "total_storage": 52.4,
                "average_file_size": 0.042,
                "most_used_type": "documents"
            },
            "activity": {
                "api_requests_24h": 15320,
                "errors_24h": 23,
                "average_response_time": 245
            },
            "system": {
                "uptime": 99.9,
                "cpu_usage": 35.2,
                "memory_usage": 62.1
            },
            "revenue": {
                "total_revenue": 15420.50,
                "premium_users": 45,
                "subscriptions_active": 42
            }
        }

        log_admin_action(admin_id, ActionType.EXPORT, f"report_{report_type.value}")
        logger.info("Relatório gerado: %s", report_type.value)
        return {"status": "success", "report_type": report_type.value, "generated_at": datetime.utcnow().isoformat(), "data": report_data.get(report_type.value, {}), "start_date": start_date, "end_date": end_date}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao gerar relatório")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao gerar relatório")

