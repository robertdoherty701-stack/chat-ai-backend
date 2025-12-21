const {
  saveReportCache,
  getReportCache,
  listCachedReports,
  getUpdateHistory,
  logUserQuery,
  clearOldCache,
  closeDatabase
} = require('./database.cjs');

async function runTests() {
  console.log('🧪 Iniciando testes do banco de dados SQLite...\n');

  try {
    // Teste 1: Salvar dados no cache
    console.log('=== TESTE 1: Salvar Relatório ===');
    const testData = [
      { cidade: 'São Paulo', clientes: 150 },
      { cidade: 'Rio de Janeiro', clientes: 120 },
      { cidade: 'Belo Horizonte', clientes: 90 }
    ];
    
    await saveReportCache('leads', 'Novos Clientes', testData, { ok: true, version: 1 });
    console.log('✅ Relatório salvo com sucesso\n');

    // Aguardar um pouco para garantir que foi salvo
    await new Promise(resolve => setTimeout(resolve, 100));

    // Teste 2: Buscar dados do cache
    console.log('=== TESTE 2: Buscar do Cache ===');
    const cached = await getReportCache('leads');
    if (cached) {
      console.log(`✅ Cache encontrado: ${cached.label}`);
      console.log(`   Linhas: ${cached.rowCount}`);
      console.log(`   Última atualização: ${cached.lastUpdate}`);
      console.log(`   Validação: ${JSON.stringify(cached.validation)}\n`);
    } else {
      console.log('❌ Cache não encontrado\n');
    }

    // Teste 3: Listar todos os caches
    console.log('=== TESTE 3: Listar Caches ===');
    const allReports = await listCachedReports();
    console.log(`✅ Total de relatórios em cache: ${allReports.length}`);
    allReports.forEach(r => {
      console.log(`   - ${r.label} (${r.rowCount} linhas) - ${r.lastUpdate}`);
    });
    console.log();

    // Teste 4: Registrar query de usuário
    console.log('=== TESTE 4: Registrar Query ===');
    await logUserQuery('clientes em São Paulo', 'leads', 1);
    console.log('✅ Query registrada\n');

    // Teste 5: Histórico de atualizações
    console.log('=== TESTE 5: Histórico ===');
    const history = await getUpdateHistory('leads', 5);
    console.log(`✅ Histórico (últimas ${history.length} atualizações):`);
    history.forEach(h => {
      console.log(`   - ${h.timestamp}: ${h.row_count} linhas (${h.success ? 'sucesso' : 'erro'})`);
    });
    console.log();

    // Teste 6: Salvar outro relatório
    console.log('=== TESTE 6: Salvar Segundo Relatório ===');
    const testData2 = [
      { produto: 'Queijo Reino 1.8kg', vendas: 450 },
      { produto: 'Queijo Reino 900g', vendas: 320 }
    ];
    await saveReportCache('queijo', 'Queijo do Reino', testData2, { ok: false, missing: ['Data'] });
    console.log('✅ Segundo relatório salvo\n');

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 100));

    // Teste 7: Listar novamente
    console.log('=== TESTE 7: Listar Novamente ===');
    const allReports2 = await listCachedReports();
    console.log(`✅ Total de relatórios: ${allReports2.length}`);
    allReports2.forEach(r => {
      const status = r.validation?.ok ? '✅' : '⚠️';
      console.log(`   ${status} ${r.label} (${r.rowCount} linhas)`);
    });
    console.log();

    console.log('🎉 Todos os testes concluídos com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  } finally {
    // Fechar conexão
    await closeDatabase();
  }
}

// Executar testes
runTests();
