"""
Serviço de cache SQLite para relatórios do Google Sheets
Armazena dados localmente para acesso offline e melhor performance
"""
import sqlite3
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any
import logging

logger = logging.getLogger(__name__)

# Caminho do banco de dados
DB_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DB_DIR / "cache.db"

class CacheService:
    def __init__(self):
        """Inicializa o serviço de cache e cria o banco se necessário"""
        DB_DIR.mkdir(parents=True, exist_ok=True)
        self.db_path = str(DB_PATH)
        self._init_database()
    
    def _get_connection(self):
        """Cria uma nova conexão com o banco"""
        return sqlite3.connect(self.db_path)
    
    def _init_database(self):
        """Cria as tabelas se não existirem"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # Tabela de cache de relatórios
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS report_cache (
                    id TEXT PRIMARY KEY,
                    label TEXT NOT NULL,
                    data TEXT NOT NULL,
                    row_count INTEGER NOT NULL,
                    last_update TEXT NOT NULL,
                    validation_status TEXT
                )
            """)
            
            # Tabela de histórico de atualizações
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS update_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    row_count INTEGER NOT NULL,
                    success INTEGER NOT NULL,
                    error_message TEXT
                )
            """)
            
            # Tabela de log de queries de usuários
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_queries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query TEXT NOT NULL,
                    report_id TEXT,
                    timestamp TEXT NOT NULL,
                    result_count INTEGER
                )
            """)
            
            conn.commit()
            logger.info(f"✅ Banco de dados inicializado: {self.db_path}")
        except Exception as e:
            logger.error(f"❌ Erro ao inicializar banco: {e}")
            raise
        finally:
            conn.close()
    
    def save_report_cache(
        self, 
        report_id: str, 
        label: str, 
        data: List[Dict], 
        validation_status: Optional[Dict] = None
    ) -> bool:
        """
        Salva ou atualiza cache de um relatório
        
        Args:
            report_id: ID único do relatório
            label: Nome amigável do relatório
            data: Lista de dicionários com os dados
            validation_status: Status de validação do schema
            
        Returns:
            True se salvou com sucesso
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            data_json = json.dumps(data, ensure_ascii=False)
            validation_json = json.dumps(validation_status) if validation_status else None
            timestamp = datetime.now().isoformat()
            row_count = len(data)
            
            cursor.execute("""
                INSERT OR REPLACE INTO report_cache 
                (id, label, data, row_count, last_update, validation_status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (report_id, label, data_json, row_count, timestamp, validation_json))
            
            # Registra no histórico
            cursor.execute("""
                INSERT INTO update_history 
                (report_id, timestamp, row_count, success, error_message)
                VALUES (?, ?, ?, 1, NULL)
            """, (report_id, timestamp, row_count))
            
            conn.commit()
            logger.info(f"💾 Cache salvo: {label} ({row_count} linhas)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao salvar cache: {e}")
            return False
        finally:
            conn.close()
    
    def get_report_cache(self, report_id: str) -> Optional[Dict[str, Any]]:
        """
        Busca relatório do cache
        
        Args:
            report_id: ID do relatório
            
        Returns:
            Dict com {data, row_count, last_update, validation_status} ou None
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT data, row_count, last_update, validation_status, label
                FROM report_cache
                WHERE id = ?
            """, (report_id,))
            
            row = cursor.fetchone()
            if not row:
                return None
            
            data_json, row_count, last_update, validation_json, label = row
            
            return {
                "data": json.loads(data_json),
                "row_count": row_count,
                "last_update": last_update,
                "validation_status": json.loads(validation_json) if validation_json else None,
                "label": label
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar cache: {e}")
            return None
        finally:
            conn.close()
    
    def is_cache_fresh(self, report_id: str, max_age_hours: int = 24) -> bool:
        """
        Verifica se o cache está atualizado
        
        Args:
            report_id: ID do relatório
            max_age_hours: Idade máxima em horas (padrão 24h)
            
        Returns:
            True se o cache existe e está dentro do prazo
        """
        cached = self.get_report_cache(report_id)
        if not cached:
            return False
        
        last_update = datetime.fromisoformat(cached["last_update"])
        age = datetime.now() - last_update
        
        return age < timedelta(hours=max_age_hours)
    
    def list_cached_reports(self) -> List[Dict[str, Any]]:
        """
        Lista todos os relatórios em cache
        
        Returns:
            Lista de dicts com informações dos relatórios
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, label, row_count, last_update, validation_status
                FROM report_cache
                ORDER BY last_update DESC
            """)
            
            reports = []
            for row in cursor.fetchall():
                report_id, label, row_count, last_update, validation_json = row
                validation = json.loads(validation_json) if validation_json else None
                
                reports.append({
                    "id": report_id,
                    "label": label,
                    "row_count": row_count,
                    "last_update": last_update,
                    "validation_status": validation
                })
            
            return reports
            
        except Exception as e:
            logger.error(f"❌ Erro ao listar caches: {e}")
            return []
        finally:
            conn.close()
    
    def get_update_history(self, report_id: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """
        Busca histórico de atualizações
        
        Args:
            report_id: Se fornecido, filtra por relatório específico
            limit: Número máximo de registros
            
        Returns:
            Lista de dicts com histórico
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            if report_id:
                cursor.execute("""
                    SELECT report_id, timestamp, row_count, success, error_message
                    FROM update_history
                    WHERE report_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (report_id, limit))
            else:
                cursor.execute("""
                    SELECT report_id, timestamp, row_count, success, error_message
                    FROM update_history
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (limit,))
            
            history = []
            for row in cursor.fetchall():
                history.append({
                    "report_id": row[0],
                    "timestamp": row[1],
                    "row_count": row[2],
                    "success": bool(row[3]),
                    "error_message": row[4]
                })
            
            return history
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar histórico: {e}")
            return []
        finally:
            conn.close()
    
    def log_user_query(self, query: str, report_id: Optional[str] = None, result_count: Optional[int] = None):
        """
        Registra uma query de usuário para análise
        
        Args:
            query: Texto da query
            report_id: ID do relatório consultado
            result_count: Número de resultados retornados
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            timestamp = datetime.now().isoformat()
            
            cursor.execute("""
                INSERT INTO user_queries (query, report_id, timestamp, result_count)
                VALUES (?, ?, ?, ?)
            """, (query, report_id, timestamp, result_count))
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"❌ Erro ao registrar query: {e}")
        finally:
            conn.close()
    
    def clear_old_cache(self, days_old: int = 30):
        """
        Remove caches mais antigos que X dias
        
        Args:
            days_old: Idade em dias para considerar cache obsoleto
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cutoff = (datetime.now() - timedelta(days=days_old)).isoformat()
            
            cursor.execute("""
                DELETE FROM report_cache
                WHERE last_update < ?
            """, (cutoff,))
            
            deleted = cursor.rowcount
            conn.commit()
            
            if deleted > 0:
                logger.info(f"🗑️ Removidos {deleted} caches antigos (>{days_old} dias)")
            
        except Exception as e:
            logger.error(f"❌ Erro ao limpar cache: {e}")
        finally:
            conn.close()


# Instância global do serviço
cache_service = CacheService()
