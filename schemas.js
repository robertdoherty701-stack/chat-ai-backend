module.exports = {
  vendas: {
    version: 2,
    columns: ['Data', 'Produto', 'Valor', 'Vendedor']
  },
  estoque: {
    version: 1,
    columns: ['SKU', 'Quantidade', 'Local']
  },
  leads: {
    version: 1,
    columns: ['Cidade', 'Novos Clientes', 'Data']
  },
  queijo: {
    version: 1,
    columns: ['Código Cliente', 'Nome', 'Detalhes']
  },
  nao_cobertos_fornecedor: {
    version: 1,
    columns: ['Fornecedor', 'Produto', 'Status', 'Observações']
  }
};
