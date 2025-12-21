const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Cria diretório se não existir
const dbDir = path.join(__dirname, 'data');
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'backup.db');
const db = new sqlite3.Database(dbPath);

console.log(`📦 Banco de backup: ${dbPath}`);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT,
      data TEXT,
      created_at TEXT
    )
  `);
  console.log('✅ Tabela backups criada/verificada');
});

function saveBackup(reportId, data) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO backups VALUES (?, ?, ?)`,
      [reportId, JSON.stringify(data), new Date().toISOString()],
      (err) => {
        if (err) {
          console.error(`❌ Erro ao salvar backup: ${err.message}`);
          reject(err);
        } else {
          console.log(`💾 Backup salvo: ${reportId}`);
          resolve();
        }
      }
    );
  });
}

function getBackup(reportId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM backups WHERE id = ? ORDER BY created_at DESC LIMIT 1`,
      [reportId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? { ...row, data: JSON.parse(row.data) } : null);
        }
      }
    );
  });
}

function listBackups() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, created_at FROM backups ORDER BY created_at DESC`,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error(`❌ Erro ao fechar banco: ${err.message}`);
    } else {
      console.log('✅ Banco de backup fechado');
    }
  });
}

module.exports = { saveBackup, getBackup, listBackups, closeDatabase };
