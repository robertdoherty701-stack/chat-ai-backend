/**
 * Serviço Node.js intermediário com cache SQLite
 * Proxy inteligente entre frontend e backend Python
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { saveReportCache, getReportCache, listCachedReports } = require('./database.cjs');
const { 
  getFailures, 
  getAccesses, 
  getFailureStats, 
  getAccessStats,
  logFailure,
  logAccess 
} = require('../../failure-log.cjs');
const { carregarDadosDoSheets, reportDataCache, REPORTS_CONFIG } = require('../../sheets-loader.cjs');

const app = express();
const PORT = process.env.NODE_PORT || 3000;
const PYTHON_BACKEND = process.env.PYTHON_BACKEND || 'http://localhost:8000';

let dataLoaded = false;
let lastLoadTime = null;

app.use(cors());
app.use(express.json());

/**
 * Carrega dados diretamente do Google Sheets (Node.js)
 * Endpoint direto sem passar pelo Python
 */
app.get('/api/sheets-direct/:reportId', async (req, res) => {
  const { reportId } = req.params;
  const startTime = Date.now();

  try {
    // Carrega dados se ainda não carregou
    if (!dataLoaded || !reportDataCache[reportId]) {
      console.log(`🔄 Carregando dados do Google Sheets...`);
      const loadStart = Date.now();
      await carregarDadosDoSheets();
      dataLoaded = true;
      lastLoadTime = new Date().toISOString();
      const loadDuration = Date.now() - loadStart;
      console.log(`✅ Dados carregados em ${(loadDuration / 1000).toFixed(2)}s`);
    }

    const data = reportDataCache[reportId];
    
    if (!data) {
      logFailure(reportId, 'Relatório não encontrado no sheets-loader', {
        availableReports: REPORTS_CONFIG.map(r => r.id)
      });
      return res.status(404).json({
        error: 'Relatório não encontrado',
        reportId,
        available: REPORTS_CONFIG.map(r => r.id)
      });
    }

    // Salva no cache SQLite para backup
    const report = REPORTS_CONFIG.find(r => r.id === reportId);
    await saveReportCache(reportId, report?.label || reportId, data, { ok: true });

    const latency = Date.now() - startTime;
    logAccess(reportId, 'sheets_direct', latency);

    res.json({
      source: 'sheets_direct',
      id: reportId,
      label: report?.label || reportId,
      data: data,
      count: data.length,
      lastLoad: lastLoadTime,
      latency: `${latency}ms`
    });

  } catch (error) {
    const latency = Date.now() - startTime;
    logFailure(reportId, `Erro ao carregar do Google Sheets: ${error.message}`, {
      stack: error.stack,
      latency
    });

    // Fallback para cache SQLite
    const cached = await getReportCache(reportId);
    if (cached) {
      console.log(`📦 Fallback para cache SQLite`);
      logAccess(reportId, 'sqlite_fallback', latency);
      return res.json({
        source: 'sqlite_fallback',
        warning: 'Erro ao carregar do Google Sheets, usando cache',
        ...cached,
        latency: `${latency}ms`
      });
    }

    res.status(500).json({
      error: error.message,
      reportId
    });
  }
});

/**
 * Proxy com cache para Google Sheets (Python Backend)
 */
app.get('/api/sheets/:reportId', async (req, res) => {
  const { reportId } = req.params;
  const { force } = req.query; // ?force=true ignora cache  const startTime = Date.now();
  try {
    // Se não forçar, tenta buscar do cache Node.js
    if (!force) {
      const cached = await getReportCache(reportId);
      if (cached) {
        const age = Date.now() - new Date(cached.last_update).getTime();
        const ageHours = age / (1000 * 60 * 60);
        
        // Cache válido por 1 hora no Node.js (mais agressivo que Python)
        if (ageHours < 1) {
          console.log(`📦 Cache Node.js: ${reportId} (${ageHours.toFixed(1)}h)`);
          return res.json({
            source: 'node_cache',
            age_hours: ageHours.toFixed(1),
            ...cached
          });
        }
      }
    }

    // Busca do backend Python
    console.log(`🔄 Proxy para Python: ${reportId}`);
    const pythonStart = Date.now();
    const response = await axios.get(
      `${PYTHON_BACKEND}/api/sheets/${reportId}`,
      { timeout: 30000 }
    );

    const pythonLatency = Date.now() - pythonStart;
    logAccess(reportId, 'python_backend', pythonLatency);

    // Salva no cache Node.js
    if (response.data.data) {
      await saveReportCache(
        reportId,
        response.data.id || reportId,
        response.data.data,
        response.data.validation || { ok: true }
      );
    }

    res.json({
      source: 'python_backend',
      latency: `${pythonLatency}ms`,
      ...response.data
    });

  } catch (error) {
    console.error(`❌ Erro no proxy: ${error.message}`);
    logFailure(reportId, `Erro no proxy Python: ${error.message}`, {
      pythonBackend: PYTHON_BACKEND,
      stack: error.stack
    });
    
    // Fallback para cache antigo
    const cached = await getReportCache(reportId);
    if (cached) {
      console.log(`📦 Fallback para cache antigo`);
      const fallbackLatency = Date.now() - startTime;
      logAccess(reportId, 'node_fallback', fallbackLatency);
      return res.json({
        source: 'node_cache_fallback',
        warning: 'Backend indisponível, usando cache',
        latency: `${fallbackLatency}ms`,
        ...cached
      });
    }

    res.status(500).json({
      error: 'Backend indisponível e sem cache',
      message: error.message
    });
  }
});

/**
 * Lista relatórios em cache Node.js
 */
app.get('/api/cache/reports', async (req, res) => {
  try {
    const reports = await listCachedReports();
    res.json({
      source: 'node_cache',
      total: reports.length,
      reports
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Lista todos os relatórios disponíveis com informações
 */
app.get('/api/reports', (req, res) => {
  const { category } = req.query;
  const { getReportsByCategory, getCategories } = require('../../sheets-loader.cjs');
  
  try {
    let reports = REPORTS_CONFIG;
    
    if (category) {
      reports = getReportsByCategory(category);
    }
    
    const reportInfo = reports.map(r => ({
      id: r.id,
      label: r.label,
      category: r.category,
      description: r.description,
      cached: !!reportDataCache[r.id],
      rows: reportDataCache[r.id]?.length || 0
    }));
    
    res.json({
      total: reports.length,
      categories: getCategories(),
      reports: reportInfo,
      lastLoad: lastLoadTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Lista relatórios por categoria
 */
app.get('/api/reports/categories', (req, res) => {
  const { getCategories, getReportsByCategory } = require('../../sheets-loader.cjs');
  
  try {
    const categories = getCategories();
    const categoriesWithReports = categories.map(cat => ({
      name: cat,
      reports: getReportsByCategory(cat).map(r => ({
        id: r.id,
        label: r.label,
        description: r.description,
        cached: !!reportDataCache[r.id],
        rows: reportDataCache[r.id]?.length || 0
      }))
    }));
    
    res.json({
      total: categories.length,
      categories: categoriesWithReports
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check
 */
app.get('/health', async (req, res) => {
  try {
    // Testa conexão com Python backend
    const pythonHealth = await axios.get(`${PYTHON_BACKEND}/health`, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    const cacheReports = await listCachedReports();

    res.json({
      status: 'healthy',
      node_version: process.version,
      python_backend: pythonHealth ? 'connected' : 'disconnected',
      cache_reports: cacheReports.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * Endpoints de Monitoramento de Logs
 */

// Estatísticas de falhas
app.get('/api/logs/failures/stats', async (req, res) => {
  try {
    const stats = getFailureStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas de acessos
app.get('/api/logs/accesses/stats', async (req, res) => {
  try {
    const stats = getAccessStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Últimas falhas
app.get('/api/logs/failures', async (req, res) => {
  try {
    const { reportId, limit } = req.query;
    const failures = getFailures(reportId, limit ? parseInt(limit) : 50);
    res.json({ failures, total: failures.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Últimos acessos
app.get('/api/logs/accesses', async (req, res) => {
  try {
    const { reportId, limit } = req.query;
    const accesses = getAccesses(reportId, limit ? parseInt(limit) : 100);
    res.json({ accesses, total: accesses.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard completo
app.get('/api/logs/dashboard', async (req, res) => {
  try {
    const failureStats = getFailureStats();
    const accessStats = getAccessStats();
    const recentFailures = getFailures(null, 10);
    const recentAccesses = getAccesses(null, 20);
    const cacheReports = await listCachedReports();

    res.json({
      failures: failureStats,
      accesses: accessStats,
      recentFailures,
      recentAccesses,
      cache: {
        reports: cacheReports.length,
        list: cacheReports
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inicia servidor
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Node.js Proxy rodando na porta ${PORT}`);
    console.log(`🔗 Python Backend: ${PYTHON_BACKEND}`);
    console.log(`📦 Cache SQLite ativo`);
  });
}

module.exports = app;
