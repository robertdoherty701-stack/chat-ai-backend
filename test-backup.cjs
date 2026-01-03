const { saveBackup, getBackup, listBackups, closeDatabase } = require('./backup-service.cjs');

async function testBackup() {
  console.log('🧪 Testando sistema de backup...\n');

  try {
    // Teste 1: Salvar backup
    console.log('=== TESTE 1: Salvar Backup ===');
    const testData = [
      { id: 1, nome: 'Cliente A', valor: 1000 },
      { id: 2, nome: 'Cliente B', valor: 2000 }
    ];
    await saveBackup('test-report', testData);
    console.log('✅ Backup salvo com sucesso\n');

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 100));

    // Teste 2: Recuperar backup
    console.log('=== TESTE 2: Recuperar Backup ===');
    const backup = await getBackup('test-report');
    if (backup) {
      console.log(`✅ Backup encontrado (${backup.data.length} registros)`);
      console.log(`   Criado em: ${backup.created_at}\n`);
    } else {
      console.log('❌ Backup não encontrado\n');
    }

    // Teste 3: Salvar segundo backup
    console.log('=== TESTE 3: Salvar Segundo Backup ===');
    await saveBackup('leads', [
      { nome: 'Lead 1', status: 'ativo' },
      { nome: 'Lead 2', status: 'pendente' }
    ]);
    console.log('✅ Segundo backup salvo\n');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Teste 4: Listar todos os backups
    console.log('=== TESTE 4: Listar Backups ===');
    const allBackups = await listBackups();
    console.log(`✅ Total de backups: ${allBackups.length}`);
    allBackups.forEach(b => {
      console.log(`   - ${b.id} (${b.created_at})`);
    });

    console.log('\n🎉 Todos os testes concluídos com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  } finally {
    closeDatabase();
  }
}

testBackup();
