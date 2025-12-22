const axios = require('axios');
const { validateReportSchema, formatValidationResult } = require('./report-schemas.cjs');

// =================================================================================
// 1. CONFIGURAÇÃO DOS LINKS E RELATÓRIOS
// =================================================================================
const REPORTS_CONFIG = [
    // ===== RELATÓRIOS DE CLIENTES =====
    {
        id: 'leads',
        label: 'Novos Clientes',
        category: 'clientes',
        description: 'Lista de novos clientes potenciais',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv',
    },
    {
        id: 'queijo',
        label: 'Queijo do Reino',
        category: 'produtos',
        description: 'Vendas de Queijo do Reino por cliente',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=1824827366&single=true&output=csv',
    },
    
    // ===== RELATÓRIOS DE COBERTURA =====
    {
        id: 'nao_cobertos_cli',
        label: 'Não Cobertos (Cliente)',
        category: 'cobertura',
        description: 'Clientes sem cobertura de vendas',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=953923858&single=true&output=csv',
    },
    {
        id: 'nao_cobertos_forn',
        label: 'Não Cobertos (Fornecedor)',
        category: 'cobertura',
        description: 'Fornecedores sem cobertura por vendedor',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=1981950621&single=true&output=csv',
    },
    
    // ===== RELATÓRIOS MSL (Market Share List) =====
    {
        id: 'msl_danone',
        label: 'MSL DANONE',
        category: 'msl',
        description: 'Market Share DANONE por região',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=402511992&single=true&output=csv',
    },
    {
        id: 'msl_otg',
        label: 'MSL OTG',
        category: 'msl',
        description: 'Market Share OTG (On-The-Go)',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=1571578249&single=true&output=csv',
    },
    {
        id: 'msl_mini',
        label: 'MSL MINI',
        category: 'msl',
        description: 'Market Share Mini Mercados',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=544996255&single=true&output=csv',
    },
    {
        id: 'msl_super',
        label: 'MSL SUPER',
        category: 'msl',
        description: 'Market Share Supermercados',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=2086321744&single=true&output=csv',
    },
    
    // ===== NOVOS RELATÓRIOS ADICIONADOS =====
    {
        id: 'msl_consolidado',
        label: 'MSL Consolidado',
        category: 'msl',
        description: 'Consolidado de todos os MSL',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv',
    },
    {
        id: 'vendas_por_vendedor',
        label: 'Vendas por Vendedor',
        category: 'vendas',
        description: 'Performance de vendas por vendedor',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv',
    },
    {
        id: 'mix_produtos',
        label: 'Mix de Produtos',
        category: 'produtos',
        description: 'Análise de mix de produtos por cliente',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv',
    },
    {
        id: 'inadimplentes',
        label: 'Clientes Inadimplentes',
        category: 'financeiro',
        description: 'Lista de clientes com pendências financeiras',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv',
    }
];

// =================================================================================
// CACHE EM MEMÓRIA
// =================================================================================
const reportDataCache = {};

// =================================================================================
// CSV PARSER SIMPLES (ROBUSTO PRA BACKEND)
// =================================================================================
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i]?.trim() || '';
        });
        return obj;
    });
}

// =================================================================================
// FETCH COM RETRY + DELAY (ANTI BUG GOOGLE SHEETS)
// =================================================================================
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
            console.warn(`⚠️ Tentativa ${attempt} falhou: ${err.message}`);
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

// =================================================================================
// CARGA PRINCIPAL COM VALIDAÇÃO
// =================================================================================
async function carregarDadosDoSheets() {
    console.log('🚀 Iniciando carga das planilhas...');
    const validationResults = {};

    for (const report of REPORTS_CONFIG) {
        try {
            const csvText = await fetchWithRetry(report.url);
            reportDataCache[report.id] = parseCSV(csvText);
            
            // Valida schema
            const validation = validateReportSchema(report.id, reportDataCache[report.id]);
            validationResults[report.id] = validation;
            
            const validationMsg = formatValidationResult(validation);
            console.log(`✅ ${report.label}: ${reportDataCache[report.id].length} linhas | ${validationMsg}`);
            
            if (!validation.valid) {
                console.warn(`⚠️  Atenção: ${report.label} tem problemas no schema!`);
            }
        } catch (err) {
            console.error(`❌ Erro em ${report.label}: ${err.message}`);
            reportDataCache[report.id] = [];
            validationResults[report.id] = { valid: false, error: err.message };
        }
    }

    console.log('✔️ Carga finalizada');
    
    // Resumo de validação
    const totalReports = Object.keys(validationResults).length;
    const validReports = Object.values(validationResults).filter(v => v.valid).length;
    console.log(`📊 Validação: ${validReports}/${totalReports} relatórios com schema válido`);
    
    return { cache: reportDataCache, validation: validationResults };
}

// EXPORTA PARA USAR EM API / IA / CRON
module.exports = {
    carregarDadosDoSheets,
    reportDataCache,
    REPORTS_CONFIG,
    // Helper functions
    getReportsByCategory: (category) => REPORTS_CONFIG.filter(r => r.category === category),
    getCategories: () => [...new Set(REPORTS_CONFIG.map(r => r.category))],
    getReportById: (id) => REPORTS_CONFIG.find(r => r.id === id),
    // Validation
    validateReportSchema
};
