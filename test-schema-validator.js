const { validateSchemaVersion, validateMultipleReports, getValidationReport } = require('./schema-validator');

// Teste 1: Validação com todos os campos corretos
console.log('=== TESTE 1: Schema Completo ===');
const leadsHeaders = ['Cidade', 'Novos Clientes', 'Data'];
const result1 = validateSchemaVersion('leads', leadsHeaders);
console.log(result1);
console.log(getValidationReport('leads', leadsHeaders));

// Teste 2: Validação com campos faltando
console.log('\n=== TESTE 2: Schema Incompleto ===');
const vendasHeaders = ['Data', 'Produto']; // Faltando 'Valor' e 'Vendedor'
const result2 = validateSchemaVersion('vendas', vendasHeaders);
console.log(result2);
console.log(getValidationReport('vendas', vendasHeaders));

// Teste 3: Validação múltipla
console.log('\n=== TESTE 3: Validação Múltipla ===');
const multipleReports = {
  leads: ['Cidade', 'Novos Clientes', 'Data'],
  queijo: ['Código Cliente', 'Nome', 'Detalhes'],
  estoque: ['SKU', 'Quantidade'] // Faltando 'Local'
};
const result3 = validateMultipleReports(multipleReports);
console.log(result3);

// Teste 4: Schema não existente
console.log('\n=== TESTE 4: Schema Inexistente ===');
const result4 = validateSchemaVersion('relatorio_desconhecido', ['Col1', 'Col2']);
console.log(result4);
console.log(getValidationReport('relatorio_desconhecido', ['Col1', 'Col2']));

console.log('\n✅ Todos os testes concluídos!');
