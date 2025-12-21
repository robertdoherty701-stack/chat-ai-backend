/**
 * Sistema de Log de Falhas
 * Registra todas as tentativas de carregamento que falharam para análise
 */

const fs = require('fs');
const path = require('path');

// Diretório de logs
const LOG_DIR = path.join(__dirname, 'data', 'logs');
const FAILURE_LOG = path.join(LOG_DIR, 'failures.json');
const ACCESS_LOG = path.join(LOG_DIR, 'access.json');

// Criar diretório se não existir
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Registra uma falha de carregamento
 */
function logFailure(reportId, reason, metadata = {}) {
  const entry = {
    reportId,
    reason,
    metadata,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('pt-BR'),
    time: new Date().toLocaleTimeString('pt-BR')
  };

  let data = [];
  if (fs.existsSync(FAILURE_LOG)) {
    try {
      data = JSON.parse(fs.readFileSync(FAILURE_LOG, 'utf8'));
    } catch (error) {
      console.error('⚠️ Erro ao ler log de falhas, criando novo:', error.message);
      data = [];
    }
  }

  data.push(entry);
  
  // Manter apenas últimas 1000 entradas
  if (data.length > 1000) {
    data = data.slice(-1000);
  }

  fs.writeFileSync(FAILURE_LOG, JSON.stringify(data, null, 2));
  console.log(`📝 Falha registrada: ${reportId} - ${reason}`);
}

/**
 * Registra um acesso bem-sucedido
 */
function logAccess(reportId, source, latency = 0) {
  const entry = {
    reportId,
    source, // 'cache', 'node', 'python', 'sheets'
    latency,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('pt-BR'),
    time: new Date().toLocaleTimeString('pt-BR')
  };

  let data = [];
  if (fs.existsSync(ACCESS_LOG)) {
    try {
      data = JSON.parse(fs.readFileSync(ACCESS_LOG, 'utf8'));
    } catch (error) {
      console.error('⚠️ Erro ao ler log de acesso, criando novo:', error.message);
      data = [];
    }
  }

  data.push(entry);
  
  // Manter apenas últimas 5000 entradas
  if (data.length > 5000) {
    data = data.slice(-5000);
  }

  fs.writeFileSync(ACCESS_LOG, JSON.stringify(data, null, 2));
}

/**
 * Busca falhas de um relatório específico
 */
function getFailures(reportId = null, limit = 50) {
  if (!fs.existsSync(FAILURE_LOG)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(FAILURE_LOG, 'utf8'));
    
    if (reportId) {
      return data
        .filter(entry => entry.reportId === reportId)
        .slice(-limit)
        .reverse();
    }
    
    return data.slice(-limit).reverse();
  } catch (error) {
    console.error('❌ Erro ao ler falhas:', error);
    return [];
  }
}

/**
 * Busca acessos de um relatório específico
 */
function getAccesses(reportId = null, limit = 100) {
  if (!fs.existsSync(ACCESS_LOG)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(ACCESS_LOG, 'utf8'));
    
    if (reportId) {
      return data
        .filter(entry => entry.reportId === reportId)
        .slice(-limit)
        .reverse();
    }
    
    return data.slice(-limit).reverse();
  } catch (error) {
    console.error('❌ Erro ao ler acessos:', error);
    return [];
  }
}

/**
 * Estatísticas de falhas
 */
function getFailureStats() {
  const failures = getFailures(null, 1000);
  
  if (failures.length === 0) {
    return {
      total: 0,
      byReport: {},
      byReason: {},
      last24h: 0,
      lastFailure: null
    };
  }

  const byReport = {};
  const byReason = {};
  const now = new Date();
  const last24h = now.getTime() - (24 * 60 * 60 * 1000);
  let last24hCount = 0;

  failures.forEach(f => {
    // Por relatório
    byReport[f.reportId] = (byReport[f.reportId] || 0) + 1;
    
    // Por motivo
    byReason[f.reason] = (byReason[f.reason] || 0) + 1;
    
    // Últimas 24h
    if (new Date(f.timestamp).getTime() > last24h) {
      last24hCount++;
    }
  });

  return {
    total: failures.length,
    byReport,
    byReason,
    last24h: last24hCount,
    lastFailure: failures[0]
  };
}

/**
 * Estatísticas de acesso
 */
function getAccessStats() {
  const accesses = getAccesses(null, 5000);
  
  if (accesses.length === 0) {
    return {
      total: 0,
      bySource: {},
      byReport: {},
      avgLatency: 0,
      last24h: 0
    };
  }

  const bySource = {};
  const byReport = {};
  let totalLatency = 0;
  const now = new Date();
  const last24h = now.getTime() - (24 * 60 * 60 * 1000);
  let last24hCount = 0;

  accesses.forEach(a => {
    // Por fonte
    bySource[a.source] = (bySource[a.source] || 0) + 1;
    
    // Por relatório
    byReport[a.reportId] = (byReport[a.reportId] || 0) + 1;
    
    // Latência
    totalLatency += a.latency || 0;
    
    // Últimas 24h
    if (new Date(a.timestamp).getTime() > last24h) {
      last24hCount++;
    }
  });

  return {
    total: accesses.length,
    bySource,
    byReport,
    avgLatency: (totalLatency / accesses.length).toFixed(2),
    last24h: last24hCount
  };
}

/**
 * Limpa logs antigos
 */
function clearOldLogs(daysOld = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  
  let removedFailures = 0;
  let removedAccesses = 0;

  // Limpar falhas
  if (fs.existsSync(FAILURE_LOG)) {
    const failures = JSON.parse(fs.readFileSync(FAILURE_LOG, 'utf8'));
    const filtered = failures.filter(f => new Date(f.timestamp) > cutoff);
    removedFailures = failures.length - filtered.length;
    fs.writeFileSync(FAILURE_LOG, JSON.stringify(filtered, null, 2));
  }

  // Limpar acessos
  if (fs.existsSync(ACCESS_LOG)) {
    const accesses = JSON.parse(fs.readFileSync(ACCESS_LOG, 'utf8'));
    const filtered = accesses.filter(a => new Date(a.timestamp) > cutoff);
    removedAccesses = accesses.length - filtered.length;
    fs.writeFileSync(ACCESS_LOG, JSON.stringify(filtered, null, 2));
  }

  console.log(`🗑️ Logs limpos: ${removedFailures} falhas, ${removedAccesses} acessos (>${daysOld} dias)`);
  return { removedFailures, removedAccesses };
}

module.exports = {
  logFailure,
  logAccess,
  getFailures,
  getAccesses,
  getFailureStats,
  getAccessStats,
  clearOldLogs
};
