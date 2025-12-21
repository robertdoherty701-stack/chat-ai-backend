/**
 * Exemplo de integração do cache SQLite com carregamento de dados
 * Demonstra como salvar dados automaticamente após carregar do Google Sheets
 */

const { saveReportCache, getReportCache, listCachedReports } = require('./database.cjs');
const axios = require('axios');

// Configuração dos relatórios
const REPORTS_CONFIG = [
  {
    id: 'leads',
    label: 'Novos Clientes',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPfXhtVUCvwgP9l6iE7fz-N_pDgpHMDKBGXA31Qq6EZQXzhDNLOv15BQYi_zXfOVDr_ZmkdSXTe_5a/pub?gid=851531344&single=true&output=csv'
  },
  {
    id: 'queijo',
    label: 'Queijo do Reino',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPfXhtVUCvwgP9l6iE7fz-N_pDgpHMDKBGXA31Qq6EZQXzhDNLOv15BQYi_zXfOVDr_ZmkdSXTe_5a/pub?gid=1537716094&single=true&output=csv'
  }
];

/**
 * Carrega dados de um relatório e salva no cache
 */
async function loadAndCacheReport(config) {
  try {
    console.log(`📥 Carregando ${config.label}...`);
    
    // Buscar dados do Google Sheets
    const response = await axios.get(config.url, { timeout: 10000 });
    const csvText = response.data;
    
    // Parsear CSV para array de objetos
    const lines = csvText.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });
      data.push(row);
    }
    
    console.log(`✅ ${config.label}: ${data.length} linhas carregadas`);
    
    // Salvar no cache usando database.cjs
    await saveReportCache(
      config.id,
      config.label,
      data,
      { ok: true, version: 1 } // validation status
    );
    
    console.log(`💾 Cache salvo para ${config.label}\n`);
    
    return { success: true, rows: data.length };
    
  } catch (error) {
    console.error(`❌ Erro ao carregar ${config.label}:`, error.message);
    
    // Tentar buscar do cache como fallback
    const cached = await getReportCache(config.id);
    if (cached) {
      console.log(`📦 Usando versão em cache (${cached.row_count} linhas)\n`);
      return { success: true, rows: cached.row_count, fromCache: true };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Carrega todos os relatórios e salva no cache
 */
async function loadAllReports() {
  console.log('🚀 Iniciando carregamento de relatórios...\n');
  
  const results = {};
  
  for (const config of REPORTS_CONFIG) {
    const result = await loadAndCacheReport(config);
    results[config.id] = result;
  }
  
  console.log('📊 Resumo:');
  for (const [id, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    const source = result.fromCache ? ' (cache)' : '';
    console.log(`${status} ${id}: ${result.rows || 0} linhas${source}`);
  }
  
  // Listar todos os caches
  console.log('\n📋 Relatórios em cache:');
  const cached = await listCachedReports();
  cached.forEach(r => {
    const statusIcon = r.validation_status?.ok ? '✅' : '⚠️';
    console.log(`${statusIcon} ${r.label} (${r.row_count} linhas) - ${r.last_update}`);
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  loadAllReports()
    .then(() => {
      console.log('\n🎉 Processo concluído!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { loadAndCacheReport, loadAllReports };
