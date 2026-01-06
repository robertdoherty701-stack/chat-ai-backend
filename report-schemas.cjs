// Schemas de validação para relatórios do Google Sheets
// Define as colunas esperadas para cada tipo de relatório

const REPORT_SCHEMAS = {
    // Relatórios de Clientes
    leads: ['CNPJ CLIENTE', 'NOME CLIENTE', 'CIDADE', 'POTENCIAL'],
    
    // Relatórios de Produtos
    queijo: ['VENDEDOR', 'CODCLI', 'CLIENTE'], // + colunas dinâmicas de produtos
    mix_produtos: ['CNPJ CLIENTE', 'NOME CLIENTE', 'CIDADE', 'POTENCIAL'], // Mesma estrutura de leads
    
    // Relatórios de Cobertura
    nao_cobertos_cli: ['SUPERVISOR', 'CODVD', 'VENDEDOR', 'CPF / CNPJ', 'CODCLI'],
    nao_cobertos_forn: ['SUPERVISOR', 'CODVD', 'VENDEDOR', 'FORNECEDOR', 'CPF / CNPJ'],
    
    // Relatórios MSL
    msl_danone: ['CÓD_SV', 'CÓD_VD', 'VENDEDOR', 'CNPJ', 'CODCLI'],
    msl_otg: ['SV', 'CODVD', 'VENDEDOR', 'CNPJ', 'CODCLI'],
    msl_mini: ['SV', 'CÓD_VD', 'VENDEDOR', 'CNPJ', 'CODCLI'],
    msl_super: ['SV', 'CODVD', 'VENDEDOR', 'CNPJ', 'CODCLI'],
    msl_consolidado: ['CNPJ CLIENTE', 'NOME CLIENTE', 'CIDADE', 'POTENCIAL'], // Mesma estrutura de leads
    
    // Relatórios de Vendas
    vendas_por_vendedor: ['CNPJ CLIENTE', 'NOME CLIENTE', 'CIDADE', 'POTENCIAL'], // Mesma estrutura de leads
    
    // Relatórios Financeiros
    inadimplentes: ['CNPJ CLIENTE', 'NOME CLIENTE', 'CIDADE', 'POTENCIAL'] // Mesma estrutura de leads
};

/**
 * Valida se os dados de um relatório possuem as colunas esperadas
 * @param {string} reportId - ID do relatório
 * @param {Array} data - Array de objetos com os dados
 * @returns {Object} { valid: boolean, missing: [], extra: [] }
 */
function validateReportSchema(reportId, data) {
    const schema = REPORT_SCHEMAS[reportId];
    
    if (!schema) {
        return {
            valid: false,
            error: `Schema não encontrado para relatório: ${reportId}`,
            missing: [],
            extra: []
        };
    }
    
    if (!data || data.length === 0) {
        return {
            valid: false,
            error: 'Dados vazios ou inválidos',
            missing: schema,
            extra: []
        };
    }
    
    // Pega as colunas do primeiro item (assumindo que todos têm as mesmas colunas)
    const actualColumns = Object.keys(data[0]);
    
    // Verifica colunas faltantes
    const missing = schema.filter(col => !actualColumns.includes(col));
    
    // Verifica colunas extras (não definidas no schema)
    const extra = actualColumns.filter(col => !schema.includes(col));
    
    const valid = missing.length === 0;
    
    return {
        valid,
        missing,
        extra,
        expected: schema,
        actual: actualColumns
    };
}

/**
 * Valida todos os relatórios de uma vez
 * @param {Object} allReports - Objeto com todos os relatórios carregados
 * @returns {Object} Resultado da validação por relatório
 */
function validateAllReports(allReports) {
    const results = {};
    
    for (const [reportId, data] of Object.entries(allReports)) {
        if (REPORT_SCHEMAS[reportId]) {
            results[reportId] = validateReportSchema(reportId, data);
        }
    }
    
    return results;
}

/**
 * Retorna o schema de um relatório específico
 * @param {string} reportId - ID do relatório
 * @returns {Array|null} Array com as colunas esperadas ou null
 */
function getReportSchema(reportId) {
    return REPORT_SCHEMAS[reportId] || null;
}

/**
 * Lista todos os relatórios com schemas definidos
 * @returns {Array} Array com os IDs dos relatórios
 */
function listAvailableSchemas() {
    return Object.keys(REPORT_SCHEMAS);
}

/**
 * Verifica se um relatório tem schema definido
 * @param {string} reportId - ID do relatório
 * @returns {boolean}
 */
function hasSchema(reportId) {
    return REPORT_SCHEMAS.hasOwnProperty(reportId);
}

/**
 * Adiciona ou atualiza um schema
 * @param {string} reportId - ID do relatório
 * @param {Array} columns - Array com as colunas
 */
function setSchema(reportId, columns) {
    if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error('Colunas devem ser um array não vazio');
    }
    REPORT_SCHEMAS[reportId] = columns;
}

/**
 * Formata resultado de validação para exibição
 * @param {Object} validation - Resultado da validação
 * @returns {string} String formatada
 */
function formatValidationResult(validation) {
    if (validation.error) {
        return `❌ ${validation.error}`;
    }
    
    if (validation.valid) {
        let result = '✅ Schema válido';
        if (validation.extra.length > 0) {
            result += ` (colunas extras: ${validation.extra.join(', ')})`;
        }
        return result;
    }
    
    return `❌ Colunas faltando: ${validation.missing.join(', ')}`;
}

module.exports = {
    REPORT_SCHEMAS,
    validateReportSchema,
    validateAllReports,
    getReportSchema,
    listAvailableSchemas,
    hasSchema,
    setSchema,
    formatValidationResult
};
