/**
 * Exemplo simplificado de uso do cache SQLite
 * Mostra como integrar saveReportCache em qualquer código
 */

const { saveReportCache, getReportCache } = require('./database.cjs');

// Exemplo 1: Salvar dados após carregar de uma API
async function exemplo1_salvarDadosAPI() {
  console.log('=== EXEMPLO 1: Salvar dados de API ===\n');
  
  // Simula dados carregados de uma API
  const dadosAPI = [
    { id: 1, cliente: 'Empresa A', valor: 5000, status: 'ativo' },
    { id: 2, cliente: 'Empresa B', valor: 3000, status: 'pendente' },
    { id: 3, cliente: 'Empresa C', valor: 7500, status: 'ativo' }
  ];
  
  // Salvar no cache
  await saveReportCache(
    'clientes',           // ID do relatório
    'Lista de Clientes',  // Nome amigável
    dadosAPI,             // Os dados
    { ok: true, version: 1 } // Status de validação
  );
  
  console.log('✅ Dados salvos no cache!\n');
}

// Exemplo 2: Carregar do cache antes de buscar da API
async function exemplo2_usarCache() {
  console.log('=== EXEMPLO 2: Usar cache como fallback ===\n');
  
  // Tenta buscar do cache primeiro
  const cached = await getReportCache('clientes');
  
  if (cached) {
    console.log('📦 Dados encontrados no cache:');
    console.log(`   Relatório: ${cached.label}`);
    console.log(`   Linhas: ${cached.row_count}`);
    console.log(`   Última atualização: ${cached.last_update}`);
    console.log(`   Validação: ${cached.validation_status?.ok ? '✅' : '⚠️'}`);
    console.log(`   Primeiros registros:`, cached.data.slice(0, 2));
  } else {
    console.log('❌ Nenhum dado em cache, precisa carregar da API');
  }
  
  console.log();
}

// Exemplo 3: Padrão completo com try/catch
async function exemplo3_padraoCompleto(reportId, reportLabel, apiUrl) {
  console.log(`=== EXEMPLO 3: Padrão completo para ${reportLabel} ===\n`);
  
  try {
    // Tenta carregar da API
    console.log(`📥 Carregando dados de ${apiUrl}...`);
    
    // Aqui você faria: const response = await axios.get(apiUrl);
    // Para este exemplo, vamos simular um erro
    throw new Error('API temporariamente indisponível');
    
  } catch (error) {
    console.log(`⚠️ Erro ao carregar: ${error.message}`);
    console.log('📦 Tentando usar cache...\n');
    
    // Fallback para o cache
    const cached = await getReportCache(reportId);
    
    if (cached) {
      console.log(`✅ Usando dados do cache (${cached.row_count} linhas)`);
      return cached.data;
    } else {
      console.log('❌ Cache não disponível');
      return [];
    }
  }
}

// Executar exemplos
async function executarExemplos() {
  await exemplo1_salvarDadosAPI();
  await exemplo2_usarCache();
  await exemplo3_padraoCompleto('clientes', 'Clientes', 'https://api.exemplo.com/clientes');
  
  console.log('🎉 Exemplos concluídos!');
}

executarExemplos();
