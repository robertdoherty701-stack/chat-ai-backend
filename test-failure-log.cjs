/**
 * Teste do Sistema de Log de Falhas
 */

const {
  logFailure,
  logAccess,
  getFailures,
  getAccesses,
  getFailureStats,
  getAccessStats,
  clearOldLogs
} = require('./failure-log.cjs');

async function testarLogs() {
  console.log('🧪 Testando Sistema de Logs\n');

  // Teste 1: Registrar falhas
  console.log('=== TESTE 1: Registrar Falhas ===');
  logFailure('leads', 'Timeout ao acessar Google Sheets', { url: 'https://docs.google.com/...', timeout: 10000 });
  logFailure('queijo', 'Erro 404 - Planilha não encontrada');
  logFailure('leads', 'Formato CSV inválido', { lineNumber: 145 });
  console.log('✅ 3 falhas registradas\n');

  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 100));

  // Teste 2: Registrar acessos
  console.log('=== TESTE 2: Registrar Acessos ===');
  logAccess('leads', 'cache', 1);
  logAccess('queijo', 'python', 150);
  logAccess('leads', 'node', 45);
  logAccess('nao_cobertos', 'sheets', 3200);
  console.log('✅ 4 acessos registrados\n');

  await new Promise(resolve => setTimeout(resolve, 100));

  // Teste 3: Buscar falhas
  console.log('=== TESTE 3: Buscar Falhas ===');
  const allFailures = getFailures();
  console.log(`✅ Total de falhas: ${allFailures.length}`);
  
  const leadsFailures = getFailures('leads');
  console.log(`✅ Falhas de 'leads': ${leadsFailures.length}`);
  if (leadsFailures.length > 0) {
    console.log(`   Última: ${leadsFailures[0].reason}`);
  }
  console.log();

  // Teste 4: Buscar acessos
  console.log('=== TESTE 4: Buscar Acessos ===');
  const allAccesses = getAccesses();
  console.log(`✅ Total de acessos: ${allAccesses.length}`);
  
  const leadsAccesses = getAccesses('leads');
  console.log(`✅ Acessos de 'leads': ${leadsAccesses.length}`);
  console.log();

  // Teste 5: Estatísticas de falhas
  console.log('=== TESTE 5: Estatísticas de Falhas ===');
  const failureStats = getFailureStats();
  console.log(`✅ Total: ${failureStats.total}`);
  console.log(`   Por relatório:`, failureStats.byReport);
  console.log(`   Por motivo:`, failureStats.byReason);
  console.log(`   Últimas 24h: ${failureStats.last24h}`);
  console.log();

  // Teste 6: Estatísticas de acesso
  console.log('=== TESTE 6: Estatísticas de Acesso ===');
  const accessStats = getAccessStats();
  console.log(`✅ Total: ${accessStats.total}`);
  console.log(`   Por fonte:`, accessStats.bySource);
  console.log(`   Por relatório:`, accessStats.byReport);
  console.log(`   Latência média: ${accessStats.avgLatency}ms`);
  console.log(`   Últimas 24h: ${accessStats.last24h}`);
  console.log();

  // Teste 7: Visualização dos logs
  console.log('=== TESTE 7: Últimas Falhas ===');
  const recentFailures = getFailures(null, 3);
  recentFailures.forEach((f, i) => {
    console.log(`${i + 1}. ${f.reportId} - ${f.reason}`);
    console.log(`   Data: ${f.date} ${f.time}`);
  });
  console.log();

  console.log('=== TESTE 8: Últimos Acessos ===');
  const recentAccesses = getAccesses(null, 4);
  recentAccesses.forEach((a, i) => {
    console.log(`${i + 1}. ${a.reportId} via ${a.source} (${a.latency}ms)`);
    console.log(`   Data: ${a.date} ${a.time}`);
  });
  console.log();

  console.log('🎉 Todos os testes concluídos!');
  console.log('\n📂 Logs salvos em:');
  console.log('   - data/logs/failures.json');
  console.log('   - data/logs/access.json');
}

testarLogs();
