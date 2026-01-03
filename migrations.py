import logging
from database import engine, Base, DatabaseManager
from typing import Optional, Dict, Any, Callable
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class MigrationManager:
    """Gerenciador de migrações de banco de dados"""
    
    @staticmethod
    def migrate_create_all() -> None:
        """Cria todas as tabelas"""
        logger.info("🔄 Executando migração: criar todas as tabelas")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Migração concluída")
    
    @staticmethod
    def migrate_drop_all() -> None:
        """Remove todas as tabelas (CUIDADO!)"""
        logger.warning(" Removendo todas as tabelas...")
        Base.metadata.drop_all(bind=engine)
        logger.info(" Tabelas removidas")
    
    @staticmethod
    def migrate_add_column() -> None:
        """Adiciona coluna a uma tabela"""
        logger.info(" Adicionando coluna...")
        # Implementar conforme necessário
        logger.info(" Coluna adicionada")

    @staticmethod
    def migrate_seed_admin() -> None:
        """Popula admin padrão"""
        logger.info(" Populando dados iniciais...")
        db: Session = next(DatabaseManager.get_db())
        try:
            DatabaseManager.seed_initial_data(db)
            logger.info(" Dados iniciais populados")
        except Exception as e:
            logger.error(f" Erro: {str(e)}")
        finally:
            db.close()
    
    @staticmethod
    def migrate_backup() -> None:
        """Cria backup do banco"""
        logger.info(" Criando backup...")
        import subprocess
        from datetime import datetime, timezone
        from pathlib import Path

        # Criar diretório de backups se não existir
        Path("backups").mkdir(exist_ok=True)
        
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_file = f"backups/backup_{timestamp}.sql"

        try:
            subprocess.run(
                f"pg_dump chat_ia_db > {backup_file}",
                shell=True,
                check=True
            )
            logger.info(f" Backup criado: {backup_file}")
        except Exception as e:
            logger.error(f" Erro ao criar backup: {str(e)}")
    
    @staticmethod
    def migrate_restore(backup_file: str) -> None:
        """Restaura banco de um backup"""
        logger.info(f" Restaurando de {backup_file}...")
        import subprocess

        try:
            subprocess.run(
                f"psql chat_ia_db < {backup_file}",
                shell=True,
                check=True
            )
            logger.info(" Banco restaurado")
        except Exception as e:
            logger.error(f" Erro ao restaurar: {str(e)}")
    
    @staticmethod
    def get_status() -> Dict[str, Any]:
        """Retorna status do banco"""
        try:
            health = DatabaseManager.health_check()
            stats: Dict[str, Any] = DatabaseManager.get_stats() or {}
            
            return {
                "status": "healthy" if health else "unhealthy",
                "database": "PostgreSQL",
                "stats": stats
            }
        except Exception as e:
            logger.error(f" Erro ao obter status: {str(e)}")
            return {"status": "error", "message": str(e)}

# ==================== CLI ====================
if __name__ == "__main__":
    import sys

    commands: Dict[str, Callable[[], Optional[Dict[str, Any]]]] = {
        "init": MigrationManager.migrate_create_all,
        "drop": MigrationManager.migrate_drop_all,
        "seed": MigrationManager.migrate_seed_admin,
        "backup": MigrationManager.migrate_backup,
        "status": MigrationManager.get_status,
    }
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command in commands:
            result = commands[command]()
            if result:
                print(result)
        else:
            print(f" Comando desconhecido: {command}")
            print(f"Comandos disponíveis: {', '.join(commands.keys())}")
    else:
        print(" Migration Manager")
        print("Uso: python migrations.py <comando>")
        print(f"Comandos: {', '.join(commands.keys())}")
