/**
 * Teste do carregador de Google Sheets
 * Valida carregamento de todos os 8 relatórios
 */

const { carregarDadosDoSheets, reportDataCache, REPORTS_CONFIG } = require('./sheets-loader.cjs');

async function testarCarregamento() {
    console.log('🧪 Testando Carregador de Google Sheets\n');
    console.log(`📋 Total de relatórios configurados: ${REPORTS_CONFIG.length}\n`);

    try {
        // Carrega todos os dados
        const startTime = Date.now();
        await carregarDadosDoSheets();
        const loadTime = Date.now() - startTime;

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📊 RESUMO DO CARREGAMENTO');
        console.log('═══════════════════════════════════════════════════════\n');

        let totalRows = 0;
        let successfulReports = 0;
        let failedReports = 0;

        REPORTS_CONFIG.forEach(report => {
            const data = reportDataCache[report.id];
            const rows = data ? data.length : 0;
            totalRows += rows;

            if (rows > 0) {
                successfulReports++;
                console.log(`✅ ${report.label}`);
                console.log(`   ID: ${report.id}`);
                console.log(`   Linhas: ${rows}`);
                
                // Mostra as primeiras colunas se houver dados
                if (data.length > 0) {
                    const columns = Object.keys(data[0]);
                    console.log(`   Colunas: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);
                }
                console.log('');
            } else {
                failedReports++;
                console.log(`❌ ${report.label}`);
                console.log(`   ID: ${report.id}`);
                console.log(`   Status: Falha no carregamento`);
                console.log('');
            }
        });

        console.log('═══════════════════════════════════════════════════════');
        console.log('📈 ESTATÍSTICAS');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`⏱️  Tempo total: ${(loadTime / 1000).toFixed(2)}s`);
        console.log(`✅ Relatórios com sucesso: ${successfulReports}/${REPORTS_CONFIG.length}`);
        console.log(`❌ Relatórios com falha: ${failedReports}/${REPORTS_CONFIG.length}`);
        console.log(`📊 Total de linhas carregadas: ${totalRows}`);
        console.log(`⚡ Taxa de sucesso: ${((successfulReports / REPORTS_CONFIG.length) * 100).toFixed(1)}%`);
        console.log('═══════════════════════════════════════════════════════\n');

        // Teste de acesso aos dados
        console.log('🔍 TESTE DE ACESSO AOS DADOS\n');
        
        const leadsData = reportDataCache['leads'];
        if (leadsData && leadsData.length > 0) {
            console.log('✅ Acesso ao cache funcional');
            console.log(`   Exemplo (1ª linha de "leads"):`, JSON.stringify(leadsData[0]).slice(0, 100) + '...');
        } else {
            console.log('⚠️  Cache vazio ou inacessível');
        }

        console.log('\n🎉 Teste concluído!\n');

        if (failedReports > 0) {
            console.log('⚠️  AVISO: Alguns relatórios falharam. Verifique:');
            console.log('   - Conexão com internet');
            console.log('   - URLs do Google Sheets');
            console.log('   - Permissões de acesso público\n');
        }

    } catch (error) {
        console.error('\n❌ ERRO FATAL NO TESTE:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Executa teste
if (require.main === module) {
    testarCarregamento();
}

module.exports = { testarCarregamento };
