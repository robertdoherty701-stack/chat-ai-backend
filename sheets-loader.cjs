const axios = require('axios');

// =================================================================================
// 1. CONFIGURAÇÃO DOS LINKS E RELATÓRIOS
// =================================================================================
const REPORTS_CONFIG = [
    {
        id: 'leads',
        label: 'Novos Clientes',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=0&single=true&output=csv',
    },
    {
        id: 'queijo',
        label: 'Queijo do Reino',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=1824827366&single=true&output=csv',
    },
    {
        id: 'nao_cobertos_cli',
        label: 'Não Cobertos (Cliente)',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=953923858&single=true&output=csv',
    },
    {
        id: 'nao_cobertos_forn',
        label: 'Não Cobertos (Fornecedor)',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=1981950621&single=true&output=csv',
    },
    {
        id: 'msl_danone',
        label: 'MSL DANONE',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=402511992&single=true&output=csv',
    },
    {
        id: 'msl_otg',
        label: 'MSL OTG',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=1571578249&single=true&output=csv',
    },
    {
        id: 'msl_mini',
        label: 'MSL MINI',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=544996255&single=true&output=csv',
    },
    {
        id: 'msl_super',
        label: 'MSL SUPER',
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9lG9sbtgRqV0PLkyjT8R9znpC9ECGurgfelIhn_q5BwgThg6SpdfE2R30obAAaawk0FIGLlBowjt_/pub?gid=2086321744&single=true&output=csv',
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
// CARGA PRINCIPAL
// =================================================================================
async function carregarDadosDoSheets() {
    console.log('🚀 Iniciando carga das planilhas...');

    for (const report of REPORTS_CONFIG) {
        try {
            const csvText = await fetchWithRetry(report.url);
            reportDataCache[report.id] = parseCSV(csvText);
            console.log(`✅ ${report.label}: ${reportDataCache[report.id].length} linhas`);
        } catch (err) {
            console.error(`❌ Erro em ${report.label}: ${err.message}`);
            reportDataCache[report.id] = [];
        }
    }

    console.log('✔️ Carga finalizada');
    return reportDataCache;
}

// EXPORTA PARA USAR EM API / IA / CRON
module.exports = {
    carregarDadosDoSheets,
    reportDataCache,
    REPORTS_CONFIG
};
