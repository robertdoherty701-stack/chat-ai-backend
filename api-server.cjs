const express = require('express');
const cors = require('cors');
const {
    carregarDadosDoSheets,
    cache,
    meta,
    getReport,
    getReportMeta,
    getReportsByCategory,
    getCategories,
    getReportConfig,
    getCacheStats
} = require('./sheets-loader-v2.cjs');

const app = express();

// =================================================================================
// MIDDLEWARE
// =================================================================================
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// =================================================================================
// ESTADO GLOBAL
// =================================================================================
let isLoading = false;
let lastLoadTime = null;
let loadCount = 0;

// =================================================================================
// FUNÇÕES AUXILIARES
// =================================================================================

/**
 * Carrega dados com controle de estado
 */
async function loadDataWithStatus() {
    if (isLoading) {
        console.log('⏳ Carga já em andamento, ignorando...');
        return;
    }

    isLoading = true;
    loadCount++;
    console.log(`\n🔄 Iniciando carga #${loadCount}...`);
    
    try {
        await carregarDadosDoSheets();
        lastLoadTime = new Date().toISOString();
        console.log(`✅ Carga #${loadCount} concluída\n`);
    } catch (error) {
        console.error(`❌ Erro na carga #${loadCount}:`, error.message);
    } finally {
        isLoading = false;
    }
}

// =================================================================================
// ENDPOINTS - HEALTH & STATUS
// =================================================================================

/**
 * Health check completo - CRÍTICO PARA IA
 */
app.get('/health', (req, res) => {
    const status = {};
    let ok = true;
    let totalRows = 0;
    let validSchemas = 0;
    let errors = 0;

    for (const id in meta) {
        status[id] = meta[id];
        
        if (meta[id].error) {
            ok = false;
            errors++;
        }
        
        if (meta[id].schemaOk === false) {
            ok = false;
        } else if (meta[id].schemaOk === true) {
            validSchemas++;
        }
        
        totalRows += meta[id].rows || 0;
    }

    res.json({
        ok,
        status: ok ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        lastLoadTime,
        loadCount,
        isLoading,
        stats: {
            totalReports: Object.keys(meta).length,
            validSchemas,
            errors,
            totalRows
        },
        reports: status
    });
});

/**
 * Status simplificado
 */
app.get('/status', (req, res) => {
    res.json({
        ok: !isLoading,
        loading: isLoading,
        lastLoadTime,
        loadCount,
        totalReports: Object.keys(cache).length
    });
});

/**
 * Estatísticas do cache
 */
app.get('/stats', (req, res) => {
    res.json(getCacheStats());
});

// =================================================================================
// ENDPOINTS - RELATÓRIOS
// =================================================================================

/**
 * Lista todos os relatórios (com filtro opcional de categoria)
 */
app.get('/reports', (req, res) => {
    const { category } = req.query;
    
    let reports;
    if (category) {
        reports = getReportsByCategory(category);
    } else {
        reports = Object.keys(meta).map(id => ({
            id,
            ...meta[id]
        }));
    }
    
    const summary = reports.map(r => ({
        id: r.id,
        label: r.label || meta[r.id]?.label,
        category: r.category || meta[r.id]?.category,
        rows: meta[r.id]?.rows || 0,
        schemaOk: meta[r.id]?.schemaOk,
        lastUpdate: meta[r.id]?.lastUpdate
    }));
    
    res.json({
        total: summary.length,
        category: category || 'all',
        reports: summary
    });
});

/**
 * Dados de um relatório específico
 */
app.get('/reports/:id', (req, res) => {
    const { id } = req.params;
    const data = getReport(id);
    
    if (!data) {
        return res.status(404).json({ 
            error: 'Relatório não encontrado',
            availableReports: Object.keys(cache)
        });
    }
    
    const reportMeta = getReportMeta(id);
    
    res.json({
        id,
        meta: reportMeta,
        count: data.length,
        data
    });
});

/**
 * Apenas dados (sem metadados)
 */
app.get('/reports/:id/data', (req, res) => {
    const { id } = req.params;
    const data = getReport(id);
    
    if (!data) {
        return res.status(404).json({ error: 'Relatório não encontrado' });
    }
    
    res.json(data);
});

/**
 * Apenas metadados
 */
app.get('/reports/:id/meta', (req, res) => {
    const { id } = req.params;
    const reportMeta = getReportMeta(id);
    
    if (!reportMeta) {
        return res.status(404).json({ error: 'Relatório não encontrado' });
    }
    
    res.json(reportMeta);
});

/**
 * Busca em um relatório específico
 */
app.get('/reports/:id/search', (req, res) => {
    const { id } = req.params;
    const { q, field, limit = 100 } = req.query;
    
    const data = getReport(id);
    if (!data) {
        return res.status(404).json({ error: 'Relatório não encontrado' });
    }
    
    if (!q) {
        return res.status(400).json({ error: 'Parâmetro "q" (query) é obrigatório' });
    }
    
    const searchLower = q.toLowerCase();
    
    let results;
    if (field) {
        // Busca em campo específico
        results = data.filter(row => {
            const value = row[field];
            return value && value.toString().toLowerCase().includes(searchLower);
        });
    } else {
        // Busca em todos os campos
        results = data.filter(row => {
            return Object.values(row).some(value => 
                value && value.toString().toLowerCase().includes(searchLower)
            );
        });
    }
    
    const limitedResults = results.slice(0, parseInt(limit));
    
    res.json({
        query: q,
        field: field || 'all',
        totalMatches: results.length,
        returned: limitedResults.length,
        limit: parseInt(limit),
        results: limitedResults
    });
});

// =================================================================================
// ENDPOINTS - CATEGORIAS
// =================================================================================

/**
 * Lista todas as categorias
 */
app.get('/categories', (req, res) => {
    const categories = getCategories();
    
    const categoriesWithReports = categories.map(cat => {
        const reports = getReportsByCategory(cat);
        const totalRows = reports.reduce((sum, r) => {
            return sum + (meta[r.id]?.rows || 0);
        }, 0);
        
        return {
            name: cat,
            reportCount: reports.length,
            totalRows,
            reports: reports.map(r => ({
                id: r.id,
                label: r.label,
                rows: meta[r.id]?.rows || 0
            }))
        };
    });
    
    res.json({
        total: categories.length,
        categories: categoriesWithReports
    });
});

/**
 * Relatórios de uma categoria específica
 */
app.get('/categories/:category', (req, res) => {
    const { category } = req.params;
    const reports = getReportsByCategory(category);
    
    if (reports.length === 0) {
        return res.status(404).json({ 
            error: 'Categoria não encontrada',
            availableCategories: getCategories()
        });
    }
    
    const reportsWithData = reports.map(r => ({
        id: r.id,
        label: r.label,
        description: r.description,
        rows: meta[r.id]?.rows || 0,
        schemaOk: meta[r.id]?.schemaOk,
        lastUpdate: meta[r.id]?.lastUpdate
    }));
    
    res.json({
        category,
        reportCount: reports.length,
        reports: reportsWithData
    });
});

// =================================================================================
// ENDPOINTS - BUSCA GLOBAL
// =================================================================================

/**
 * Busca em todos os relatórios
 */
app.get('/search', (req, res) => {
    const { q, limit = 50 } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'Parâmetro "q" (query) é obrigatório' });
    }
    
    const searchLower = q.toLowerCase();
    const results = [];
    
    for (const id in cache) {
        const data = cache[id];
        const matches = data.filter(row => {
            return Object.values(row).some(value =>
                value && value.toString().toLowerCase().includes(searchLower)
            );
        });
        
        if (matches.length > 0) {
            results.push({
                reportId: id,
                reportLabel: meta[id]?.label,
                matches: matches.length,
                sample: matches.slice(0, 5)
            });
        }
    }
    
    res.json({
        query: q,
        totalReports: results.length,
        totalMatches: results.reduce((sum, r) => sum + r.matches, 0),
        results
    });
});

// =================================================================================
// ENDPOINTS - ADMINISTRAÇÃO
// =================================================================================

/**
 * Força recarga dos dados
 */
app.post('/reload', async (req, res) => {
    if (isLoading) {
        return res.status(409).json({ 
            error: 'Carga já em andamento',
            isLoading: true
        });
    }
    
    res.json({ 
        message: 'Recarga iniciada',
        loadCount: loadCount + 1
    });
    
    // Carrega em background
    loadDataWithStatus();
});

/**
 * Limpa cache de um relatório específico
 */
app.delete('/reports/:id/cache', (req, res) => {
    const { id } = req.params;
    
    if (cache[id]) {
        cache[id] = [];
        delete meta[id];
        res.json({ message: `Cache de ${id} limpo` });
    } else {
        res.status(404).json({ error: 'Relatório não encontrado' });
    }
});

// =================================================================================
// ENDPOINT RAIZ
// =================================================================================

app.get('/', (req, res) => {
    res.json({
        name: 'Sheets Loader API',
        version: '2.0.0',
        description: 'API para carregar e consultar dados do Google Sheets',
        endpoints: {
            health: 'GET /health - Health check completo',
            status: 'GET /status - Status simplificado',
            stats: 'GET /stats - Estatísticas do cache',
            reports: 'GET /reports - Lista todos os relatórios',
            reportData: 'GET /reports/:id - Dados de um relatório',
            reportMeta: 'GET /reports/:id/meta - Metadados de um relatório',
            search: 'GET /reports/:id/search?q=termo - Busca em relatório',
            categories: 'GET /categories - Lista todas as categorias',
            categoryReports: 'GET /categories/:category - Relatórios de uma categoria',
            globalSearch: 'GET /search?q=termo - Busca em todos os relatórios',
            reload: 'POST /reload - Força recarga dos dados'
        },
        stats: getCacheStats()
    });
});

// =================================================================================
// ERROR HANDLER
// =================================================================================

app.use((err, req, res, next) => {
    console.error('❌ Erro:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
});

// =================================================================================
// INICIALIZAÇÃO
// =================================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log('='.repeat(70));
    console.log('🚀 Sheets Loader API V2');
    console.log('='.repeat(70));
    console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 Documentação: http://localhost:${PORT}/`);
    console.log('='.repeat(70));
    
    // Carrega dados na inicialização
    await loadDataWithStatus();
    
    // Configura recarga automática a cada 20 minutos
    setInterval(loadDataWithStatus, 20 * 60 * 1000);
    console.log('⏰ Recarga automática configurada (20 minutos)');
    console.log('='.repeat(70));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 SIGTERM recebido, encerrando...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 SIGINT recebido, encerrando...');
    process.exit(0);
});
