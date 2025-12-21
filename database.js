const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco de dados
const DB_PATH = path.join(__dirname, 'data', 'cache.db');

// Criar diretório se não existir
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inicializar banco de dados
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
  }
});

// Criar tabelas
db.serialize(() => {
  // Tabela de cache de relatórios
  db.run(`
    CREATE TABLE IF NOT EXISTS report_cache (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      data TEXT NOT NULL,
      row_count INTEGER,
      last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
      validation_status TEXT
    )
  `);

  // Tabela de histórico de atualizações
  db.run(`
    CREATE TABLE IF NOT EXISTS update_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      row_count INTEGER,
      success INTEGER,
      error_message TEXT
    )
  `);

  // Tabela de queries de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS user_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      report_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      result_count INTEGER
    )
  `);

  console.log('✅ Tabelas criadas/verificadas');
});

/**
 * Salvar dados de relatório no cache
 */
function saveReportCache(reportId, label, data, validationStatus = null) {
  return new Promise((resolve, reject) => {
    const dataJson = JSON.stringify(data);
    const rowCount = data.length;
    const validationJson = validationStatus ? JSON.stringify(validationStatus) : null;

    db.run(
      `INSERT OR REPLACE INTO report_cache (id, label, data, row_count, last_update, validation_status) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [reportId, label, dataJson, rowCount, validationJson],
      function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`💾 Cache salvo: ${label} (${rowCount} linhas)`);
          
          // Registrar no histórico
          db.run(
            `INSERT INTO update_history (report_id, row_count, success) VALUES (?, ?, 1)`,
            [reportId, rowCount]
          );
          
          resolve({ reportId, rowCount });
        }
      }
    );
  });
}

/**
 * Buscar dados do cache
 */
function getReportCache(reportId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM report_cache WHERE id = ?`,
      [reportId],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            id: row.id,
            label: row.label,
            data: JSON.parse(row.data),
            rowCount: row.row_count,
            lastUpdate: row.last_update,
            validation: row.validation_status ? JSON.parse(row.validation_status) : null
          });
        } else {
          resolve(null);
        }
      }
    );
  });
}

/**
 * Listar todos os relatórios em cache
 */
function listCachedReports() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, label, row_count, last_update, validation_status FROM report_cache`,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const reports = rows.map(row => ({
            id: row.id,
            label: row.label,
            rowCount: row.row_count,
            lastUpdate: row.last_update,
            validation: row.validation_status ? JSON.parse(row.validation_status) : null
          }));
          resolve(reports);
        }
      }
    );
  });
}

/**
 * Buscar histórico de atualizações
 */
function getUpdateHistory(reportId = null, limit = 20) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * FROM update_history`;
    let params = [];
    
    if (reportId) {
      query += ` WHERE report_id = ?`;
      params.push(reportId);
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Registrar query de usuário
 */
function logUserQuery(query, reportId, resultCount) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_queries (query, report_id, result_count) VALUES (?, ?, ?)`,
      [query, reportId, resultCount],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      }
    );
  });
}

/**
 * Limpar cache antigo (mais de X dias)
 */
function clearOldCache(daysOld = 7) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM report_cache WHERE last_update < datetime('now', '-' || ? || ' days')`,
      [daysOld],
      function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`🗑️ ${this.changes} registros antigos removidos`);
          resolve({ deleted: this.changes });
        }
      }
    );
  });
}

/**
 * Fechar conexão com banco
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Conexão com banco fechada');
        resolve();
      }
    });
  });
}

module.exports = {
  db,
  saveReportCache,
  getReportCache,
  listCachedReports,
  getUpdateHistory,
  logUserQuery,
  clearOldCache,
  closeDatabase
};
