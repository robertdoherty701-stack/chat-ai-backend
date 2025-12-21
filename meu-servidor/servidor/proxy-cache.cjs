/**
 * Serviço Node.js intermediário com cache SQLite
 * Proxy inteligente entre frontend e backend Python
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { saveReportCache, getReportCache, listCachedReports } = require('./database.cjs');

const app = express();
const PORT = process.env.NODE_PORT || 3000;
const PYTHON_BACKEND = process.env.PYTHON_BACKEND || 'http://localhost:8000';

app.use(cors());
app.use(express.json());

/**
 * Proxy com cache para Google Sheets
 */
app.get('/api/sheets/:reportId', async (req, res) => {
  const { reportId } = req.params;
  const { force } = req.query; // ?force=true ignora cache

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
    const response = await axios.get(
      `${PYTHON_BACKEND}/api/sheets/${reportId}`,
      { timeout: 30000 }
    );

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
      ...response.data
    });

  } catch (error) {
    console.error(`❌ Erro no proxy: ${error.message}`);
    
    // Fallback para cache antigo
    const cached = await getReportCache(reportId);
    if (cached) {
      console.log(`📦 Fallback para cache antigo`);
      return res.json({
        source: 'node_cache_fallback',
        warning: 'Backend indisponível, usando cache',
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

// Inicia servidor
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Node.js Proxy rodando na porta ${PORT}`);
    console.log(`🔗 Python Backend: ${PYTHON_BACKEND}`);
    console.log(`📦 Cache SQLite ativo`);
  });
}

module.exports = app;
