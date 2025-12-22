const axios = require('axios');
const { REPORT_SCHEMAS, validateReportSchema, formatValidationResult } = require('./report-schemas.cjs');

// =================================================================================
// CONFIGURAÇÃO DOS RELATÓRIOS
// =================================================================================
const REPORTS_CONFIG = [
    // Clientes
    { 
        id: 'leads', 
        label: 'Novos Clientes',
        category: 'clientes',
        description: 'Lista de novos clientes potenciais',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv' 
    },
    
    // Produtos
    { 
        id: 'queijo', 
        label: 'Queijo do Reino',
        category: 'produtos',
        description: 'Vendas de Queijo do Reino por cliente',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=1824827366&single=true&output=csv' 
    },
    { 
        id: 'mix_produtos', 
        label: 'Mix de Produtos',
        category: 'produtos',
        description: 'Análise de mix de produtos por cliente',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv'
    },
    
    // Cobertura
    { 
        id: 'nao_cobertos_cli', 
        label: 'Não Cobertos (Cliente)',
        category: 'cobertura',
        description: 'Clientes sem cobertura de vendas',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=953923858&single=true&output=csv' 
    },
    { 
        id: 'nao_cobertos_forn', 
        label: 'Não Cobertos (Fornecedor)',
        category: 'cobertura',
        description: 'Fornecedores sem cobertura de vendas',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=1981950621&single=true&output=csv' 
    },
    
    // MSL
    { 
        id: 'msl_danone', 
        label: 'MSL DANONE',
        category: 'msl',
        description: 'MSL DANONE completo',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=402511992&single=true&output=csv' 
    },
    { 
        id: 'msl_otg', 
        label: 'MSL OTG',
        category: 'msl',
        description: 'MSL OTG - On The Go',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=1571578249&single=true&output=csv' 
    },
    { 
        id: 'msl_mini', 
        label: 'MSL MINI',
        category: 'msl',
        description: 'MSL MINI mercados',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=544996255&single=true&output=csv' 
    },
    { 
        id: 'msl_super', 
        label: 'MSL SUPER',
        category: 'msl',
        description: 'MSL SUPER mercados',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=2086321744&single=true&output=csv' 
    },
    { 
        id: 'msl_consolidado', 
        label: 'MSL Consolidado',
        category: 'msl',
        description: 'Consolidação de todos os MSL',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv'
    },
    
    // Vendas
    { 
        id: 'vendas_por_vendedor', 
        label: 'Vendas por Vendedor',
        category: 'vendas',
        description: 'Performance de vendas por vendedor',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv'
    },
    
    // Financeiro
    { 
        id: 'inadimplentes', 
        label: 'Clientes Inadimplentes',
        category: 'financeiro',
        description: 'Lista de clientes com pendências financeiras',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv'
    }
];

// Caches globais
const cache = {};
const meta = {};

// =================================================================================
// FUNÇÕES DE PARSING
// =================================================================================

/**
 * Parse robusto de CSV
 * @param {string} csv - String CSV
 * @returns {Object} { headers: [], data: [] }
 */
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
        return { headers: [], data: [] };
    }

    const headers = lines[0].split(',').map(h => h.trim());

    const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        return obj;
    });

    return { headers, data };
}

/**
 * Valida schema com report-schemas.cjs
 * @param {string} id - ID do relatório
 * @param {Array} headers - Headers do CSV
 * @returns {Object} Resultado da validação
 */
function validateSchema(id, headers) {
    const expectedSchema = REPORT_SCHEMAS[id];
    
    if (!expectedSchema) {
        return { 
            ok: false, 
            error: `Schema não definido para: ${id}`,
            missing: [],
            extra: headers
        };
    }

    const missing = expectedSchema.filter(col => !headers.includes(col));
    const extra = headers.filter(col => !expectedSchema.includes(col));

    return {
        ok: missing.length === 0,
        missing,
        extra,
        expected: expectedSchema,
        actual: headers
    };
}

/**
 * Fetch com retry automático
 * @param {string} url - URL do Google Sheets
 * @param {number} retries - Número de tentativas
 * @param {number} delay - Delay entre tentativas (ms)
 * @returns {Promise<string>} CSV text
 */
async function fetchWithRetry(url, retries = 3, delay = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                timeout: 15000,
                responseType: 'text',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                }
            });

            if (!response.data || response.data.split('\n').length < 2) {
                throw new Error('CSV vazio ou ainda não propagado');
            }

            return response.data;
        } catch (err) {
            console.warn(`⚠️ Tentativa ${attempt}/${retries} falhou: ${err.message}`);
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

// =================================================================================
// CARGA PRINCIPAL
// =================================================================================

/**
 * Carrega todos os relatórios do Google Sheets
 * @returns {Promise<Object>} { cache, meta }
 */
async function carregarDadosDoSheets() {
    console.log('🚀 Iniciando carga das planilhas...\n');
    const startTime = Date.now();
    
    let successCount = 0;
    let errorCount = 0;
    let totalRows = 0;

    for (const report of REPORTS_CONFIG) {
        try {
            const csvText = await fetchWithRetry(report.url);
            const { headers, data } = parseCSV(csvText);
            const schemaCheck = validateSchema(report.id, headers);

            // Armazena dados no cache
            cache[report.id] = data;
            
            // Armazena metadados
            meta[report.id] = {
                id: report.id,
                label: report.label,
                category: report.category,
                description: report.description,
                rows: data.length,
                headers,
                schemaOk: schemaCheck.ok,
                missingColumns: schemaCheck.missing || [],
                extraColumns: schemaCheck.extra || [],
                lastUpdate: new Date().toISOString(),
                loadTimeMs: Date.now() - startTime
            };

            const validationMsg = formatValidationResult(schemaCheck);
            console.log(`✅ ${report.label}: ${data.length} linhas | ${validationMsg}`);
            
            if (!schemaCheck.ok) {
                console.warn(`   ⚠️ Colunas faltando: ${schemaCheck.missing.join(', ')}`);
            }
            if (schemaCheck.extra && schemaCheck.extra.length > 0 && schemaCheck.extra.length <= 5) {
                console.log(`   ℹ️ Colunas extras: ${schemaCheck.extra.slice(0, 3).join(', ')}...`);
            }

            successCount++;
            totalRows += data.length;

        } catch (err) {
            console.error(`❌ Erro em ${report.label}: ${err.message}`);
            
            meta[report.id] = {
                id: report.id,
                label: report.label,
                category: report.category,
                description: report.description,
                error: err.message,
                rows: 0,
                schemaOk: false,
                lastUpdate: new Date().toISOString()
            };
            
            cache[report.id] = [];
            errorCount++;
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✔️ Carga finalizada');
    console.log(`📊 Resumo: ${successCount}/${REPORTS_CONFIG.length} relatórios carregados`);
    console.log(`📈 Total: ${totalRows.toLocaleString()} linhas`);
    console.log(`⏱️ Tempo: ${totalTime}s`);
    
    if (errorCount > 0) {
        console.log(`⚠️ Erros: ${errorCount} relatórios falharam`);
    }

    return { cache, meta };
}

/**
 * Retorna dados de um relatório específico
 * @param {string} reportId - ID do relatório
 * @returns {Array|null} Dados do relatório ou null
 */
function getReport(reportId) {
    return cache[reportId] || null;
}

/**
 * Retorna metadados de um relatório
 * @param {string} reportId - ID do relatório
 * @returns {Object|null} Metadados ou null
 */
function getReportMeta(reportId) {
    return meta[reportId] || null;
}

/**
 * Retorna todos os relatórios de uma categoria
 * @param {string} category - Nome da categoria
 * @returns {Array} Array de relatórios
 */
function getReportsByCategory(category) {
    return REPORTS_CONFIG.filter(r => r.category === category);
}

/**
 * Retorna todas as categorias disponíveis
 * @returns {Array} Array de categorias únicas
 */
function getCategories() {
    return [...new Set(REPORTS_CONFIG.map(r => r.category))];
}

/**
 * Retorna configuração de um relatório
 * @param {string} reportId - ID do relatório
 * @returns {Object|null} Configuração ou null
 */
function getReportConfig(reportId) {
    return REPORTS_CONFIG.find(r => r.id === reportId) || null;
}

/**
 * Retorna estatísticas gerais do cache
 * @returns {Object} Estatísticas
 */
function getCacheStats() {
    const totalReports = REPORTS_CONFIG.length;
    const loadedReports = Object.keys(cache).filter(id => cache[id].length > 0).length;
    const totalRows = Object.values(cache).reduce((sum, data) => sum + data.length, 0);
    const validSchemas = Object.values(meta).filter(m => m.schemaOk).length;
    
    return {
        totalReports,
        loadedReports,
        totalRows,
        validSchemas,
        categories: getCategories().length,
        lastUpdate: meta[Object.keys(meta)[0]]?.lastUpdate || null
    };
}

// =================================================================================
// EXPORTS
// =================================================================================

module.exports = {
    // Função principal
    carregarDadosDoSheets,
    
    // Dados
    cache,
    meta,
    REPORTS_CONFIG,
    
    // Getters
    getReport,
    getReportMeta,
    getReportsByCategory,
    getCategories,
    getReportConfig,
    getCacheStats,
    
    // Utilities
    parseCSV,
    validateSchema,
    fetchWithRetry
};
