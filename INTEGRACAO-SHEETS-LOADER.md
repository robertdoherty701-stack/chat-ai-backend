# 🔄 Guia de Integração: Sheets Loader + Cache + Logging

## 📋 Visão Geral

Este guia mostra como integrar o **sheets-loader.cjs** com o sistema de cache multi-camadas e logging já existente.

**✨ Atualização:** Sistema expandido para **12 relatórios** organizados em **6 categorias** (94,060 linhas totais).

## 📊 Relatórios Disponíveis

### Distribuição por Categoria

| Categoria | Qtd | Relatórios | Linhas Totais |
|-----------|-----|------------|---------------|
| 👥 **Clientes** | 1 | Novos Clientes | ~1,562 |
| 📦 **Produtos** | 2 | Queijo do Reino, Mix de Produtos | ~3,959 |
| 🗺️ **Cobertura** | 2 | Não Cobertos Cliente/Fornecedor | ~66,661 |
| 📊 **MSL** | 5 | DANONE, OTG, MINI, SUPER, Consolidado | ~18,754 |
| 💰 **Vendas** | 1 | Vendas por Vendedor | ~1,562 |
| 💳 **Financeiro** | 1 | Clientes Inadimplentes | ~1,562 |

**Total: 12 relatórios | 94,060 linhas | Tempo de carga: ~22s**

## 🏗️ Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE SHEETS (12 relatórios)             │
│  👥 Clientes (1) | 📦 Produtos (2) | 🗺️ Cobertura (2)     │
│  📊 MSL (5) | 💰 Vendas (1) | 💳 Financeiro (1)           │
│                     94,060 linhas totais                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   sheets-loader.cjs
              (Retry logic + CSV parser)
          + Helper functions (getReportsByCategory)
          + Metadados (categoria, descrição)
                            ↓
           ┌────────────────────────────────────┐
           │  Cache em Memória (Node.js)        │
           │  reportDataCache                   │
           └────────────────────────────────────┘
                            ↓
              ┌──────────────────────────┐
              │  proxy-cache.cjs         │
              │  (porta 3000)            │
              │  + SQLite cache          │
              │  + failure-log.cjs       │
              │  + Endpoints de categoria│
              │    /api/reports          │
              │    /api/reports/categories│
              └──────────────────────────┘
                            ↓
              ┌──────────────────────────┐
              │  Frontend (porta 8080)   │
              │  + cache-frontend.js     │
              │  + Filtros de categoria  │
              └──────────────────────────┘
```

## 🔧 Opções de Integração

### **Opção 1: Proxy Node.js Completo** (Recomendado)

Substituir o backend Python por proxy Node.js usando sheets-loader.cjs.

**Vantagens:**
- ✅ Tudo em Node.js (menos dependências)
- ✅ Cache em memória + SQLite
- ✅ Logging integrado
- ✅ Mais rápido (sem Python)

**Implementação:**

```javascript
// meu-servidor/servidor/proxy-cache.cjs

const { carregarDadosDoSheets, reportDataCache, REPORTS_CONFIG } = require('../../sheets-loader.cjs');
const { saveReportCache, getReportCache } = require('./database.cjs');
const { logAccess, logFailure } = require('../../failure-log.cjs');

let dataLoaded = false;

// Inicializa dados na startup
async function initializeData() {
  if (dataLoaded) return;
  
  console.log('🔄 Carregando dados do Google Sheets...');
  const startTime = Date.now();
  
  try {
    await carregarDadosDoSheets();
    
    // Salva no cache SQLite
    for (const report of REPORTS_CONFIG) {
      const data = reportDataCache[report.id];
      if (data && data.length > 0) {
        await saveReportCache(report.id, report.label, data, { ok: true });
        logAccess(report.id, 'sheets', Date.now() - startTime);
      }
    }
    
    dataLoaded = true;
    console.log(`✅ Dados carregados em ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  } catch (error) {
    console.error('❌ Erro ao carregar dados:', error);
    logFailure('all_reports', 'Erro ao carregar do Google Sheets', { error: error.message });
    throw error;
  }
}

// Endpoint com cache em memória + SQLite
app.get('/api/sheets/:reportId', async (req, res) => {
  const { reportId } = req.params;
  const startTime = Date.now();
  
  try {
    // 1. Tenta memória primeiro (mais rápido)
    if (reportDataCache[reportId]) {
      logAccess(reportId, 'memory', Date.now() - startTime);
      return res.json({
        source: 'memory',
        data: reportDataCache[reportId],
        count: reportDataCache[reportId].length
      });
    }
    
    // 2. Tenta SQLite cache
    const cached = await getReportCache(reportId);
    if (cached) {
      const age = Date.now() - new Date(cached.last_update).getTime();
      if (age < 3600000) { // 1 hora
        logAccess(reportId, 'sqlite', Date.now() - startTime);
        return res.json({
          source: 'sqlite_cache',
          data: cached.data,
          count: cached.data.length
        });
      }
    }
    
    // 3. Recarrega do Google Sheets
    await initializeData();
    
    if (reportDataCache[reportId]) {
      logAccess(reportId, 'sheets', Date.now() - startTime);
      return res.json({
        source: 'sheets_fresh',
        data: reportDataCache[reportId],
        count: reportDataCache[reportId].length
      });
    }
    
    throw new Error('Relatório não encontrado');
    
  } catch (error) {
    logFailure(reportId, error.message, { stack: error.stack });
    
    // Fallback para cache antigo
    const cached = await getReportCache(reportId);
    if (cached) {
      return res.json({
        source: 'sqlite_fallback',
        warning: 'Usando cache antigo (erro ao recarregar)',
        data: cached.data,
        count: cached.data.length
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Inicializa na startup
initializeData().catch(console.error);
```

---

### **Opção 2: Backend Python + Sheets Loader** (Híbrido)

Manter backend Python para API e usar sheets-loader apenas no proxy Node.js.

**Vantagens:**
- ✅ Mantém código Python existente
- ✅ Node.js apenas como proxy intermediário
- ✅ Gradual migration

**Implementação:**

```javascript
// proxy-cache.cjs adiciona endpoint direto do Sheets

const { carregarDadosDoSheets, reportDataCache } = require('../../sheets-loader.cjs');

// Endpoint direto (bypass Python)
app.get('/api/sheets-direct/:reportId', async (req, res) => {
  const { reportId } = req.params;
  const startTime = Date.now();
  
  try {
    if (!reportDataCache[reportId]) {
      await carregarDadosDoSheets();
    }
    
    logAccess(reportId, 'sheets_direct', Date.now() - startTime);
    
    res.json({
      source: 'sheets_direct',
      data: reportDataCache[reportId],
      count: reportDataCache[reportId].length
    });
  } catch (error) {
    logFailure(reportId, error.message);
    res.status(500).json({ error: error.message });
  }
});
```

---

### **Opção 3: Cron Job Automático** (Background)

Agendar recarregamento automático a cada X horas.

**Implementação:**

```javascript
// cron-sheets-loader.cjs

const { carregarDadosDoSheets } = require('./sheets-loader.cjs');
const { saveReportCache } = require('./database.cjs');
const { REPORTS_CONFIG } = require('./sheets-loader.cjs');

async function cronJob() {
  console.log('⏰ [CRON] Iniciando recarga automática...');
  
  try {
    const cache = await carregarDadosDoSheets();
    
    // Salva no SQLite
    for (const report of REPORTS_CONFIG) {
      if (cache[report.id]) {
        await saveReportCache(report.id, report.label, cache[report.id], { ok: true });
      }
    }
    
    console.log('✅ [CRON] Recarga concluída');
  } catch (error) {
    console.error('❌ [CRON] Erro:', error);
  }
}

// Executa a cada 6 horas
setInterval(cronJob, 6 * 60 * 60 * 1000);

// Executa imediatamente na startup
cronJob();
```

**Comando para rodar:**
```bash
node cron-sheets-loader.cjs
```

---

## 📊 Comparação de Performance

| Fonte          | Latência | Cache TTL | Linhas    | Uso     |
|----------------|----------|-----------|-----------|---------|
| Memory (Node)  | ~1ms     | ∞         | 94,060    | Leitura |
| SQLite (Node)  | ~50ms    | 1h        | 94,060    | Backup  |
| Google Sheets  | ~22s     | -         | 94,060    | Origem  |
| Python Backend | ~200ms   | 24h       | 34,434    | Legacy  |

**Nota:** Performance atualizada após expansão de 8 para 12 relatórios (+6,248 linhas).

## 🆕 Novos Endpoints de Categorias

### GET /api/reports
Lista todos os relatórios com filtro opcional por categoria.

**Parâmetros de query:**
- `category` (opcional): Filtra por categoria específica

**Exemplo:**
```javascript
// Listar todos
fetch('http://localhost:3000/api/reports')

// Filtrar por MSL
fetch('http://localhost:3000/api/reports?category=msl')
```

**Resposta:**
```json
{
  "total": 12,
  "categories": ["clientes", "produtos", "cobertura", "msl", "vendas", "financeiro"],
  "reports": [
    {
      "id": "leads",
      "label": "Novos Clientes",
      "category": "clientes",
      "description": "Relatório de novos clientes",
      "cached": true,
      "rows": 1562
    }
    // ... mais relatórios
  ],
  "lastLoad": "2025-12-21T10:30:00.000Z"
}
```

### GET /api/reports/categories
Retorna relatórios agrupados por categoria.

**Exemplo:**
```javascript
fetch('http://localhost:3000/api/reports/categories')
```

**Resposta:**
```json
{
  "total": 6,
  "categories": [
    {
      "name": "clientes",
      "reports": [
        {
          "id": "leads",
          "label": "Novos Clientes",
          "description": "Relatório de novos clientes",
          "cached": true,
          "rows": 1562
        }
      ]
    },
    {
      "name": "msl",
      "reports": [
        {
          "id": "msl_danone",
          "label": "MSL DANONE",
          "description": "MSL DANONE completo",
          "cached": true,
          "rows": 15668
        }
        // ... mais 4 relatórios MSL
      ]
    }
    // ... mais categorias
  ]
}
```

## 🎯 Recomendação

**✅ IMPLEMENTADO - Opção 2 (Híbrido)** com expansão de categorias

**Use Opção 1** se:
- ✅ Quer abandonar Python backend
- ✅ Precisa de máxima performance
- ✅ Quer tudo em Node.js

**Use Opção 2** se:
- ✅ Quer manter Python para outras APIs ← **ATUAL**
- ✅ Migração gradual
- ✅ Precisa de compatibilidade
- ✅ Quer endpoints de categoria ← **NOVO**

**Use Opção 3** se:
- ✅ Quer recarregamento automático em background
- ✅ Não quer requests bloqueantes
- ✅ Cache sempre fresh

## 🚀 Próximos Passos

1. ~~**Escolher opção de integração**~~ ✅ Opção 2 implementada
2. ~~**Atualizar proxy-cache.cjs**~~ ✅ Endpoints /api/sheets-direct adicionados
3. ~~**Expandir para 12 relatórios**~~ ✅ 4 novos relatórios adicionados
4. ~~**Adicionar sistema de categorias**~~ ✅ 6 categorias implementadas
5. ~~**Criar endpoints de categorias**~~ ✅ /api/reports e /api/reports/categories
6. **Integrar frontend com filtros de categoria**
7. **Atualizar dashboard com visualização por categoria**
3. **Testar com frontend**
4. **Validar no dashboard de monitoramento**
5. **Deploy em produção**

## 📝 Notas

- **87,812 linhas totais** carregadas em **~19s**
- **100% taxa de sucesso** em todos os 8 relatórios
- **Retry automático** em caso de falha temporária
- **Compatible** com sistema de cache e logging existente

## 🔗 Arquivos Relacionados

- [sheets-loader.cjs](sheets-loader.cjs) - Carregador principal
- [test-sheets-loader.cjs](test-sheets-loader.cjs) - Testes
- [proxy-cache.cjs](meu-servidor/servidor/proxy-cache.cjs) - Proxy Node.js
- [failure-log.cjs](failure-log.cjs) - Sistema de logging
- [monitoring-dashboard.html](monitoring-dashboard.html) - Dashboard

---

**Última atualização:** 21/12/2025
**Commit:** 7c39e9f
