# 🔄 Guia de Integração: Sheets Loader + Cache + Logging

## 📋 Visão Geral

Este guia mostra como integrar o **sheets-loader.cjs** com o sistema de cache multi-camadas e logging já existente.

## 🏗️ Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE SHEETS (8 relatórios)              │
│  leads | queijo | nao_cobertos_cli | nao_cobertos_forn |    │
│  msl_danone | msl_otg | msl_mini | msl_super               │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   sheets-loader.cjs
              (Retry logic + CSV parser)
                            ↓
           ┌────────────────────────────────┐
           │  Cache em Memória (Node.js)    │
           │  reportDataCache                │
           └────────────────────────────────┘
                            ↓
              ┌──────────────────────────┐
              │  proxy-cache.cjs         │
              │  (porta 3000)            │
              │  + SQLite cache          │
              │  + failure-log.cjs       │
              └──────────────────────────┘
                            ↓
              ┌──────────────────────────┐
              │  Frontend (porta 8080)   │
              │  + cache-frontend.js     │
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
| Memory (Node)  | ~1ms     | ∞         | 87,812    | Leitura |
| SQLite (Node)  | ~50ms    | 1h        | 87,812    | Backup  |
| Google Sheets  | ~19s     | -         | 87,812    | Origem  |
| Python Backend | ~200ms   | 24h       | 34,434    | Legacy  |

## 🎯 Recomendação

**Use Opção 1** se:
- ✅ Quer abandonar Python backend
- ✅ Precisa de máxima performance
- ✅ Quer tudo em Node.js

**Use Opção 2** se:
- ✅ Quer manter Python para outras APIs
- ✅ Migração gradual
- ✅ Precisa de compatibilidade

**Use Opção 3** se:
- ✅ Quer recarregamento automático em background
- ✅ Não quer requests bloqueantes
- ✅ Cache sempre fresh

## 🚀 Próximos Passos

1. **Escolher opção de integração**
2. **Atualizar proxy-cache.cjs**
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
