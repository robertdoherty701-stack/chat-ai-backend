/**
 * Servidor de Teste - Sheets Loader
 * Teste isolado do carregador de Google Sheets
 * Porta: 3001 (para não conflitar com proxy na 3000)
 */

const express = require('express');
const cors = require('cors');
const { carregarDadosDoSheets, reportDataCache, REPORTS_CONFIG } = require('./sheets-loader.cjs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let isLoading = false;
let lastLoadTime = null;
let loadStats = {
    totalLoads: 0,
    successfulLoads: 0,
    failedLoads: 0,
    lastError: null,
    loadDuration: 0
};

// =================================================================================
// ENDPOINTS DE TESTE
// =================================================================================

/**
 * GET /test/load - Carrega dados do Google Sheets
 */
app.get('/test/load', async (req, res) => {
    if (isLoading) {
        return res.json({
            status: 'already_loading',
            message: 'Carregamento já em andamento...'
        });
    }

    isLoading = true;
    const startTime = Date.now();
    loadStats.totalLoads++;

    try {
        console.log('🔄 Iniciando carregamento de teste...');
        await carregarDadosDoSheets();
        
        const duration = Date.now() - startTime;
        loadStats.successfulLoads++;
        loadStats.loadDuration = duration;
        lastLoadTime = new Date().toISOString();

        const totalRows = Object.values(reportDataCache).reduce((sum, data) => sum + (data?.length || 0), 0);

        res.json({
            status: 'success',
            message: 'Dados carregados com sucesso',
            stats: {
                reports: REPORTS_CONFIG.length,
                totalRows,
                duration: `${(duration / 1000).toFixed(2)}s`,
                timestamp: lastLoadTime
            },
            data: REPORTS_CONFIG.map(r => ({
                id: r.id,
                label: r.label,
                rows: reportDataCache[r.id]?.length || 0,
                hasData: !!reportDataCache[r.id]
            }))
        });

    } catch (error) {
        loadStats.failedLoads++;
        loadStats.lastError = error.message;
        console.error('❌ Erro no carregamento:', error);

        res.status(500).json({
            status: 'error',
            message: error.message,
            stats: loadStats
        });
    } finally {
        isLoading = false;
    }
});

/**
 * GET /test/report/:reportId - Busca dados de um relatório específico
 */
app.get('/test/report/:reportId', (req, res) => {
    const { reportId } = req.params;
    const { limit = 10 } = req.query;

    const data = reportDataCache[reportId];

    if (!data) {
        return res.status(404).json({
            status: 'not_found',
            message: `Relatório '${reportId}' não encontrado ou não carregado`,
            availableReports: REPORTS_CONFIG.map(r => r.id)
        });
    }

    const report = REPORTS_CONFIG.find(r => r.id === reportId);

    res.json({
        status: 'success',
        report: {
            id: reportId,
            label: report?.label || reportId,
            totalRows: data.length,
            columns: data.length > 0 ? Object.keys(data[0]) : [],
            sample: data.slice(0, parseInt(limit))
        },
        meta: {
            lastLoad: lastLoadTime,
            cacheSize: data.length
        }
    });
});

/**
 * GET /test/stats - Estatísticas gerais
 */
app.get('/test/stats', (req, res) => {
    const totalRows = Object.values(reportDataCache).reduce((sum, data) => sum + (data?.length || 0), 0);
    const loadedReports = REPORTS_CONFIG.filter(r => reportDataCache[r.id]?.length > 0);

    res.json({
        status: 'ok',
        cache: {
            totalReports: REPORTS_CONFIG.length,
            loadedReports: loadedReports.length,
            totalRows,
            lastLoad: lastLoadTime,
            isLoading
        },
        reports: REPORTS_CONFIG.map(r => ({
            id: r.id,
            label: r.label,
            rows: reportDataCache[r.id]?.length || 0,
            loaded: !!reportDataCache[r.id]
        })),
        loadStats,
        memory: {
            heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
        }
    });
});

/**
 * GET /test/search - Busca em todos os relatórios
 */
app.get('/test/search', (req, res) => {
    const { q, reportId, limit = 50 } = req.query;

    if (!q) {
        return res.status(400).json({
            status: 'error',
            message: 'Query parameter "q" é obrigatório'
        });
    }

    const searchTerm = q.toLowerCase();
    const results = [];

    // Define quais relatórios buscar
    const reportsToSearch = reportId 
        ? [REPORTS_CONFIG.find(r => r.id === reportId)].filter(Boolean)
        : REPORTS_CONFIG;

    for (const report of reportsToSearch) {
        const data = reportDataCache[report.id];
        if (!data) continue;

        const matches = data.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });

        if (matches.length > 0) {
            results.push({
                reportId: report.id,
                reportLabel: report.label,
                matches: matches.slice(0, parseInt(limit)),
                totalMatches: matches.length
            });
        }
    }

    res.json({
        status: 'success',
        query: q,
        totalResults: results.reduce((sum, r) => sum + r.totalMatches, 0),
        results
    });
});

/**
 * GET /test/compare - Compara dados com cache SQLite
 */
app.get('/test/compare', async (req, res) => {
    try {
        const { listCachedReports } = require('./meu-servidor/servidor/database.cjs');
        const sqliteCache = await listCachedReports();

        const comparison = REPORTS_CONFIG.map(report => {
            const memoryData = reportDataCache[report.id];
            const sqliteData = sqliteCache.find(c => c.report_id === report.id);

            return {
                id: report.id,
                label: report.label,
                memory: {
                    rows: memoryData?.length || 0,
                    loaded: !!memoryData
                },
                sqlite: sqliteData ? {
                    rows: sqliteData.data?.length || 0,
                    lastUpdate: sqliteData.last_update,
                    ageHours: ((Date.now() - new Date(sqliteData.last_update)) / (1000 * 60 * 60)).toFixed(1)
                } : null
            };
        });

        res.json({
            status: 'success',
            comparison,
            summary: {
                memoryTotal: Object.values(reportDataCache).reduce((sum, d) => sum + (d?.length || 0), 0),
                sqliteTotal: sqliteCache.reduce((sum, c) => sum + (c.data?.length || 0), 0)
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Erro ao comparar com SQLite: ' + error.message
        });
    }
});

/**
 * GET /test/health - Health check
 */
app.get('/test/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'sheets-loader-test',
        version: '1.0.0',
        uptime: process.uptime(),
        lastLoad: lastLoadTime,
        isLoading,
        cache: {
            reports: REPORTS_CONFIG.length,
            loaded: REPORTS_CONFIG.filter(r => reportDataCache[r.id]).length
        }
    });
});

// =================================================================================
// PÁGINA WEB DE TESTE
// =================================================================================

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Sheets Loader - Teste</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #333; }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
        }
        button:hover { background: #45a049; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .endpoint {
            background: #f0f0f0;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: monospace;
            margin: 5px 0;
        }
        pre {
            background: #263238;
            color: #aed581;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .loading { color: #ff9800; }
        .success { color: #4CAF50; }
        .error { color: #f44336; }
    </style>
</head>
<body>
    <h1>🧪 Sheets Loader - Servidor de Teste</h1>
    
    <div class="card">
        <h2>📊 Controles de Teste</h2>
        <button onclick="loadData()">🔄 Carregar Dados</button>
        <button onclick="getStats()">📈 Ver Estatísticas</button>
        <button onclick="testSearch()">🔍 Testar Busca</button>
        <button onclick="compareCache()">⚖️ Comparar Caches</button>
        <div id="status" style="margin-top: 15px;"></div>
    </div>

    <div class="card">
        <h2>📋 Endpoints Disponíveis</h2>
        <div class="endpoint">GET /test/load - Carrega dados do Google Sheets</div>
        <div class="endpoint">GET /test/stats - Estatísticas do cache</div>
        <div class="endpoint">GET /test/report/:reportId - Busca relatório específico</div>
        <div class="endpoint">GET /test/search?q=termo - Busca em todos os relatórios</div>
        <div class="endpoint">GET /test/compare - Compara memory cache vs SQLite</div>
        <div class="endpoint">GET /test/health - Health check</div>
    </div>

    <div class="card">
        <h2>📦 Resultados</h2>
        <pre id="results">Clique em um botão acima para testar...</pre>
    </div>

    <script>
        const API = 'http://localhost:3001';

        async function loadData() {
            const status = document.getElementById('status');
            const results = document.getElementById('results');
            
            status.innerHTML = '<span class="loading">⏳ Carregando dados do Google Sheets...</span>';
            results.textContent = 'Aguarde...';
            
            try {
                const res = await fetch(API + '/test/load');
                const data = await res.json();
                
                if (data.status === 'success') {
                    status.innerHTML = '<span class="success">✅ Dados carregados com sucesso!</span>';
                } else {
                    status.innerHTML = '<span class="error">❌ Erro no carregamento</span>';
                }
                
                results.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                status.innerHTML = '<span class="error">❌ Erro: ' + error.message + '</span>';
                results.textContent = error.stack;
            }
        }

        async function getStats() {
            const results = document.getElementById('results');
            results.textContent = 'Carregando estatísticas...';
            
            try {
                const res = await fetch(API + '/test/stats');
                const data = await res.json();
                results.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                results.textContent = 'Erro: ' + error.message;
            }
        }

        async function testSearch() {
            const term = prompt('Digite um termo para buscar:', 'DANONE');
            if (!term) return;
            
            const results = document.getElementById('results');
            results.textContent = 'Buscando "' + term + '"...';
            
            try {
                const res = await fetch(API + '/test/search?q=' + encodeURIComponent(term) + '&limit=5');
                const data = await res.json();
                results.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                results.textContent = 'Erro: ' + error.message;
            }
        }

        async function compareCache() {
            const results = document.getElementById('results');
            results.textContent = 'Comparando caches...';
            
            try {
                const res = await fetch(API + '/test/compare');
                const data = await res.json();
                results.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                results.textContent = 'Erro: ' + error.message;
            }
        }

        // Auto-load stats na inicialização
        window.addEventListener('load', getStats);
    </script>
</body>
</html>
    `);
});

// =================================================================================
// SERVIDOR
// =================================================================================

app.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║        🧪 SHEETS LOADER - SERVIDOR DE TESTE             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📊 Relatórios configurados: ${REPORTS_CONFIG.length}`);
    console.log('');
    console.log('📋 Endpoints disponíveis:');
    console.log('   GET  /                      - Interface web de teste');
    console.log('   GET  /test/load             - Carregar dados');
    console.log('   GET  /test/stats            - Estatísticas');
    console.log('   GET  /test/report/:id       - Buscar relatório');
    console.log('   GET  /test/search?q=termo   - Buscar termo');
    console.log('   GET  /test/compare          - Comparar caches');
    console.log('   GET  /test/health           - Health check');
    console.log('');
    console.log('💡 Dica: Abra http://localhost:3001 no navegador!');
    console.log('');
});

module.exports = app;
