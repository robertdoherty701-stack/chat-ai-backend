const schemaVersions = require('./schemas');

/**
 * Valida se os headers de um relatório correspondem ao schema esperado
 * @param {string} id - ID do relatório (leads, queijo, etc)
 * @param {Array<string>} headers - Headers recebidos do CSV
 * @returns {Object} Resultado da validação { ok, version, missing }
 */
function validateSchemaVersion(id, headers) {
  const s = schemaVersions[id];
  if (!s) return { ok: true, warning: 'Schema não encontrado' };

  const missing = s.columns.filter(c => !headers.includes(c));
  return {
    ok: missing.length === 0,
    version: s.version,
    missing,
    expected: s.columns
  };
}

/**
 * Valida múltiplos relatórios de uma vez
 * @param {Object} reports - Objeto com { id: headers[] }
 * @returns {Object} Resultados de validação para cada relatório
 */
function validateMultipleReports(reports) {
  const results = {};
  
  for (const [id, headers] of Object.entries(reports)) {
    results[id] = validateSchemaVersion(id, headers);
  }
  
  return results;
}

/**
 * Gera relatório de validação formatado
 * @param {string} id - ID do relatório
 * @param {Array<string>} headers - Headers recebidos
 * @returns {string} Relatório formatado
 */
function getValidationReport(id, headers) {
  const result = validateSchemaVersion(id, headers);
  
  if (result.ok) {
    return `✅ ${id} - v${result.version} - Validação OK`;
  } else {
    return `❌ ${id} - v${result.version} - Colunas faltando: ${result.missing.join(', ')}`;
  }
}

module.exports = {
  validateSchemaVersion,
  validateMultipleReports,
  getValidationReport
};
