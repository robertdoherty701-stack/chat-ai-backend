// Teste do sistema de validação de schemas
const {
    validateReportSchema,
    validateAllReports,
    getReportSchema,
    listAvailableSchemas,
    hasSchema,
    formatValidationResult,
    REPORT_SCHEMAS
} = require('./report-schemas.cjs');

console.log('🧪 Teste do Sistema de Validação de Schemas\n');
console.log('='.repeat(60));

// 1. Listar schemas disponíveis
console.log('\n📋 Schemas Disponíveis:');
const schemas = listAvailableSchemas();
console.log(`Total: ${schemas.length} relatórios`);
schemas.forEach(id => {
    const schema = getReportSchema(id);
    console.log(`  - ${id}: [${schema.join(', ')}]`);
});

// 2. Testar validação com dados corretos
console.log('\n✅ Teste 1: Dados Válidos');
const validData = [
    { Cidade: 'São Paulo', Cliente: 'Cliente A', Data: '2025-12-21' },
    { Cidade: 'Rio de Janeiro', Cliente: 'Cliente B', Data: '2025-12-20' }
];
const validation1 = validateReportSchema('leads', validData);
console.log(formatValidationResult(validation1));
console.log('Detalhes:', validation1);

// 3. Testar com colunas faltando
console.log('\n❌ Teste 2: Colunas Faltando');
const incompleteData = [
    { Cidade: 'São Paulo', Cliente: 'Cliente A' } // Falta 'Data'
];
const validation2 = validateReportSchema('leads', incompleteData);
console.log(formatValidationResult(validation2));
console.log('Detalhes:', validation2);

// 4. Testar com colunas extras
console.log('\n⚠️ Teste 3: Colunas Extras');
const extraData = [
    { Cidade: 'São Paulo', Cliente: 'Cliente A', Data: '2025-12-21', Email: 'email@test.com' }
];
const validation3 = validateReportSchema('leads', extraData);
console.log(formatValidationResult(validation3));
console.log('Detalhes:', validation3);

// 5. Testar relatório inexistente
console.log('\n❌ Teste 4: Relatório Inexistente');
const validation4 = validateReportSchema('relatorio_invalido', validData);
console.log(formatValidationResult(validation4));

// 6. Testar hasSchema
console.log('\n🔍 Teste 5: Verificar Existência de Schema');
console.log(`leads tem schema? ${hasSchema('leads')}`);
console.log(`invalido tem schema? ${hasSchema('invalido')}`);

// 7. Testar validação de múltiplos relatórios
console.log('\n📊 Teste 6: Validar Múltiplos Relatórios');
const mockReports = {
    leads: [
        { Cidade: 'SP', Cliente: 'A', Data: '2025-12-21' }
    ],
    queijo: [
        { Codigo: '001', Cliente: 'B', Produto: 'Queijo Minas' }
    ],
    nao_cobertos_cli: [
        { Cliente: 'C' } // Falta 'Motivo'
    ]
};

const allValidations = validateAllReports(mockReports);
Object.entries(allValidations).forEach(([reportId, result]) => {
    console.log(`\n${reportId}:`);
    console.log(`  ${formatValidationResult(result)}`);
});

// 8. Testar schemas de todos os relatórios
console.log('\n📑 Teste 7: Schemas Completos por Categoria');
const categories = {
    'Clientes': ['leads'],
    'Produtos': ['queijo', 'mix_produtos'],
    'Cobertura': ['nao_cobertos_cli', 'nao_cobertos_forn'],
    'MSL': ['msl_danone', 'msl_otg', 'msl_mini', 'msl_super', 'msl_consolidado'],
    'Vendas': ['vendas_por_vendedor'],
    'Financeiro': ['inadimplentes']
};

Object.entries(categories).forEach(([category, reports]) => {
    console.log(`\n${category}:`);
    reports.forEach(reportId => {
        const schema = getReportSchema(reportId);
        if (schema) {
            console.log(`  ✓ ${reportId}: ${schema.length} colunas`);
        } else {
            console.log(`  ✗ ${reportId}: SEM SCHEMA`);
        }
    });
});

// 9. Estatísticas
console.log('\n📈 Estatísticas:');
const totalSchemas = schemas.length;
const totalColumns = schemas.reduce((sum, id) => {
    return sum + getReportSchema(id).length;
}, 0);
const avgColumns = (totalColumns / totalSchemas).toFixed(1);

console.log(`  - Total de schemas: ${totalSchemas}`);
console.log(`  - Total de colunas: ${totalColumns}`);
console.log(`  - Média de colunas por relatório: ${avgColumns}`);

// 10. Distribuição de colunas
console.log('\n📊 Distribuição de Colunas:');
const columnCounts = {};
schemas.forEach(id => {
    const count = getReportSchema(id).length;
    columnCounts[count] = (columnCounts[count] || 0) + 1;
});
Object.entries(columnCounts).sort((a, b) => a[0] - b[0]).forEach(([count, qty]) => {
    const bar = '█'.repeat(qty);
    console.log(`  ${count} colunas: ${bar} (${qty} relatórios)`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Teste concluído!');
