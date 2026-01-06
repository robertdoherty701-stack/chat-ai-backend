// Teste do sheets-loader-v2.cjs
const {
    carregarDadosDoSheets,
    cache,
    meta,
    getReport,
    getReportMeta,
    getReportsByCategory,
    getCategories,
    getCacheStats,
    REPORTS_CONFIG
} = require('./sheets-loader-v2.cjs');

console.log('🧪 Teste do Sheets Loader V2\n');
console.log('='.repeat(70));

async function runTests() {
    // Teste 1: Carregar todos os dados
    console.log('\n📥 Teste 1: Carregando dados do Google Sheets...\n');
    await carregarDadosDoSheets();
    
    // Teste 2: Estatísticas gerais
    console.log('\n' + '='.repeat(70));
    console.log('📊 Teste 2: Estatísticas Gerais\n');
    const stats = getCacheStats();
    console.log(`Total de relatórios: ${stats.totalReports}`);
    console.log(`Relatórios carregados: ${stats.loadedReports}`);
    console.log(`Total de linhas: ${stats.totalRows.toLocaleString()}`);
    console.log(`Schemas válidos: ${stats.validSchemas}/${stats.totalReports}`);
    console.log(`Categorias: ${stats.categories}`);
    console.log(`Última atualização: ${stats.lastUpdate}`);
    
    // Teste 3: Listar categorias
    console.log('\n' + '='.repeat(70));
    console.log('📂 Teste 3: Categorias Disponíveis\n');
    const categories = getCategories();
    categories.forEach(cat => {
        const reports = getReportsByCategory(cat);
        console.log(`${cat}: ${reports.length} relatórios`);
        reports.forEach(r => {
            const reportMeta = getReportMeta(r.id);
            const status = reportMeta?.schemaOk ? '✅' : '❌';
            console.log(`  ${status} ${r.label} (${reportMeta?.rows || 0} linhas)`);
        });
    });
    
    // Teste 4: Detalhes de metadados
    console.log('\n' + '='.repeat(70));
    console.log('🔍 Teste 4: Detalhes de Metadados\n');
    
    const testReports = ['leads', 'queijo', 'msl_danone'];
    testReports.forEach(reportId => {
        const reportMeta = getReportMeta(reportId);
        if (reportMeta) {
            console.log(`\n📄 ${reportMeta.label} (${reportId})`);
            console.log(`   Categoria: ${reportMeta.category}`);
            console.log(`   Linhas: ${reportMeta.rows.toLocaleString()}`);
            console.log(`   Headers: ${reportMeta.headers.length} colunas`);
            console.log(`   Schema OK: ${reportMeta.schemaOk ? '✅' : '❌'}`);
            
            if (reportMeta.missingColumns && reportMeta.missingColumns.length > 0) {
                console.log(`   ⚠️ Faltando: ${reportMeta.missingColumns.join(', ')}`);
            }
            
            if (reportMeta.extraColumns && reportMeta.extraColumns.length > 0) {
                const extras = reportMeta.extraColumns.slice(0, 5);
                console.log(`   ℹ️ Extras: ${extras.join(', ')}${reportMeta.extraColumns.length > 5 ? '...' : ''}`);
            }
        }
    });
    
    // Teste 5: Acessar dados reais
    console.log('\n' + '='.repeat(70));
    console.log('💾 Teste 5: Acesso aos Dados\n');
    
    const leadsData = getReport('leads');
    if (leadsData && leadsData.length > 0) {
        console.log(`✅ Dados de 'leads' acessíveis`);
        console.log(`   Total: ${leadsData.length} registros`);
        console.log(`   Primeira linha (amostra):`);
        const firstRow = leadsData[0];
        const sampleKeys = Object.keys(firstRow).slice(0, 4);
        sampleKeys.forEach(key => {
            const value = firstRow[key].substring(0, 30);
            console.log(`     ${key}: ${value}${firstRow[key].length > 30 ? '...' : ''}`);
        });
    }
    
    // Teste 6: Validação de schemas
    console.log('\n' + '='.repeat(70));
    console.log('✔️ Teste 6: Resumo de Validação de Schemas\n');
    
    let validCount = 0;
    let invalidCount = 0;
    let totalMissing = 0;
    
    Object.values(meta).forEach(m => {
        if (m.schemaOk) {
            validCount++;
        } else if (m.error) {
            // Erro de carregamento, não conta
        } else {
            invalidCount++;
            totalMissing += m.missingColumns?.length || 0;
        }
    });
    
    console.log(`✅ Válidos: ${validCount}`);
    console.log(`❌ Inválidos: ${invalidCount}`);
    console.log(`⚠️ Total de colunas faltando: ${totalMissing}`);
    
    if (invalidCount > 0) {
        console.log('\nRelatórios com problemas:');
        Object.values(meta).forEach(m => {
            if (!m.schemaOk && !m.error) {
                console.log(`  ❌ ${m.label}: faltando ${m.missingColumns.join(', ')}`);
            }
        });
    }
    
    // Teste 7: Performance
    console.log('\n' + '='.repeat(70));
    console.log('⚡ Teste 7: Performance\n');
    
    const loadTimes = Object.values(meta)
        .filter(m => m.loadTimeMs)
        .map(m => m.loadTimeMs);
    
    if (loadTimes.length > 0) {
        const maxTime = Math.max(...loadTimes);
        const avgTime = (loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length).toFixed(0);
        console.log(`Tempo máximo de carga: ${maxTime}ms`);
        console.log(`Tempo médio de carga: ${avgTime}ms`);
    }
    
    // Teste 8: Integridade dos dados
    console.log('\n' + '='.repeat(70));
    console.log('🔐 Teste 8: Integridade dos Dados\n');
    
    let totalDataPoints = 0;
    let emptyFields = 0;
    
    Object.keys(cache).slice(0, 3).forEach(reportId => {
        const data = cache[reportId];
        if (data && data.length > 0) {
            data.forEach(row => {
                Object.values(row).forEach(value => {
                    totalDataPoints++;
                    if (!value || value.trim() === '') {
                        emptyFields++;
                    }
                });
            });
        }
    });
    
    const fillRate = ((totalDataPoints - emptyFields) / totalDataPoints * 100).toFixed(2);
    console.log(`Total de campos analisados: ${totalDataPoints.toLocaleString()}`);
    console.log(`Campos vazios: ${emptyFields.toLocaleString()}`);
    console.log(`Taxa de preenchimento: ${fillRate}%`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Todos os testes concluídos!\n');
}

// Executar testes
runTests().catch(err => {
    console.error('❌ Erro durante os testes:', err);
    process.exit(1);
});
