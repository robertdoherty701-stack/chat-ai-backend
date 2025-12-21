# Sistema Multi-Camadas de Cache

Sistema completo de cache distribuído em 3 camadas para máxima performance e confiabilidade.

## 📊 Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│  cache-frontend.js (localStorage - 24h)             │
│  ↓ Se expirado ou não encontrado                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│               NODE.JS PROXY LAYER                   │
│  proxy-cache.cjs + database.cjs (SQLite - 1h)       │
│  ↓ Se expirado ou não encontrado                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              PYTHON BACKEND (FastAPI)               │
│  cache_service.py (SQLite - 24h)                    │
│  ↓ Se expirado, busca do Google Sheets              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              GOOGLE SHEETS (Origem)                 │
│  Dados originais (CSV via publish URL)              │
└─────────────────────────────────────────────────────┘
```

## 🚀 Como Funciona

### Camada 1: Frontend (Browser)
- **Arquivo**: `cache-frontend.js`
- **Storage**: localStorage
- **TTL**: 24 horas
- **Capacidade**: ~5-10 MB
- **Uso**:
```javascript
// Salvar
frontendCache.save('leads', data, { source: 'api', rows: 1562 });

// Buscar
const cached = frontendCache.get('leads');
if (cached) {
  console.log('Dados do cache local:', cached.data);
}

// Estatísticas
const stats = frontendCache.getStats();
console.log(`Cache: ${stats.total} itens, ${stats.totalSize} registros`);
```

### Camada 2: Node.js Proxy
- **Arquivo**: `meu-servidor/servidor/proxy-cache.cjs`
- **Storage**: SQLite via `database.cjs`
- **TTL**: 1 hora (mais agressivo)
- **Porta**: 3000
- **Endpoints**:
  - `GET /api/sheets/:reportId` - Com cache inteligente
  - `GET /api/sheets/:reportId?force=true` - Ignora cache
  - `GET /api/cache/reports` - Lista caches Node.js
  - `GET /health` - Status do proxy e backend

**Iniciar**:
```bash
cd meu-servidor/servidor
node proxy-cache.cjs
```

### Camada 3: Python Backend
- **Arquivo**: `backend/cache_service.py`
- **Storage**: SQLite
- **TTL**: 24 horas
- **Porta**: 8000
- **Endpoints**:
  - `GET /api/sheets/:reportId`
  - `GET /api/cache/info`
  - `POST /api/cache/clear?days_old=30`
  - `GET /api/sheets/reload?force=true`

**Iniciar**:
```bash
cd backend
python -m uvicorn app:app --reload --port 8000
```

## 📁 Estrutura de Arquivos

```
NOVO_PROJETO/
├── cache-frontend.js           # Cache no navegador
├── database.cjs                 # Sistema SQLite Node.js
├── backup-service.cjs           # Sistema de backup alternativo
├── exemplo-uso-cache.cjs        # Exemplos práticos
├── exemplo-integracao-cache.cjs # Integração completa
│
├── meu-servidor/
│   └── servidor/
│       └── proxy-cache.cjs      # Proxy Node.js com cache
│
└── backend/
    ├── cache_service.py         # Cache Python
    └── app.py                   # FastAPI com cache integrado
```

## 🔄 Fluxo de Requisição

### Cenário 1: Cache Hit Total
```
1. Frontend busca no localStorage
   ✅ Encontrado (< 24h) → Retorna imediatamente
   Tempo: ~1ms
```

### Cenário 2: Frontend Miss, Node.js Hit
```
1. Frontend → localStorage vazio
2. Frontend → Node.js Proxy (port 3000)
3. Node.js → SQLite local
   ✅ Encontrado (< 1h) → Retorna
   Tempo: ~50ms
```

### Cenário 3: Node.js Miss, Python Hit
```
1. Frontend → localStorage vazio
2. Node.js → SQLite vazio/expirado
3. Node.js → Python Backend (port 8000)
4. Python → SQLite local
   ✅ Encontrado (< 24h) → Retorna
   Tempo: ~200ms
```

### Cenário 4: Cache Miss Total
```
1. Frontend → localStorage vazio
2. Node.js → SQLite vazio
3. Python → SQLite vazio/expirado
4. Python → Google Sheets API
   ✅ Download CSV, parse, valida
   💾 Salva em todas as camadas
   Tempo: ~3-5s (primeira vez)
```

## 🛡️ Benefícios

### Performance
- **1ª camada (Browser)**: ~1ms
- **2ª camada (Node.js)**: ~50ms
- **3ª camada (Python)**: ~200ms
- **Sem cache**: ~3-5s

### Confiabilidade
- Fallback automático em caso de erro
- 3 cópias dos dados em diferentes camadas
- Funciona offline (se cache disponível)

### Eficiência
- Reduz carga no Google Sheets
- Economia de banda
- Menor latência para usuário

## 📊 Exemplo de Uso Integrado

### No Frontend (HTML)
```html
<script src="cache-frontend.js"></script>
<script>
async function carregarDados(reportId) {
  // 1. Tenta cache local
  let cached = frontendCache.get(reportId);
  if (cached) {
    console.log('📦 Cache local');
    return cached.data;
  }

  // 2. Busca do Node.js Proxy
  const response = await fetch(`http://localhost:3000/api/sheets/${reportId}`);
  const result = await response.json();
  
  // 3. Salva no cache local
  frontendCache.save(reportId, result.data, {
    source: result.source,
    rows: result.row_count
  });
  
  return result.data;
}
</script>
```

### No Node.js (Servidor)
```javascript
// Já está tudo configurado no proxy-cache.cjs
// Basta iniciar: node proxy-cache.cjs
```

### No Python (Backend)
```python
# Já está integrado no backend/app.py
# Cache automático ao carregar dados
```

## 🧪 Testes

### Testar Frontend
```javascript
// No console do navegador
frontendCache.save('test', [{id: 1, nome: 'Teste'}]);
console.log(frontendCache.get('test'));
console.log(frontendCache.getStats());
```

### Testar Node.js Proxy
```bash
# Terminal 1: Iniciar proxy
cd meu-servidor/servidor
node proxy-cache.cjs

# Terminal 2: Testar endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/cache/reports
curl http://localhost:3000/api/sheets/leads
```

### Testar Python Backend
```bash
# Terminal 1: Iniciar backend
cd backend
python -m uvicorn app:app --reload --port 8000

# Terminal 2: Testar cache
curl http://localhost:8000/api/cache/info
curl http://localhost:8000/api/sheets/leads
```

## 🔧 Configuração

### Variáveis de Ambiente

**Node.js Proxy** (.env):
```env
NODE_PORT=3000
PYTHON_BACKEND=http://localhost:8000
```

**Python Backend** (.env):
```env
SECRET_KEY=your_secret_key
```

## 📈 Monitoramento

### Frontend Stats
```javascript
const stats = frontendCache.getStats();
console.log(`
  Total caches: ${stats.total}
  Total registros: ${stats.totalSize}
  Idade média: ${stats.avgAge}h
  Mais antigo: ${stats.oldestAge}h
`);
```

### Node.js Health
```bash
curl http://localhost:3000/health
```

### Python Cache Info
```bash
curl http://localhost:8000/api/cache/info
```

## 🗑️ Limpeza de Cache

### Frontend
```javascript
// Limpar cache antigo (>7 dias)
frontendCache.clearOld(168);

// Limpar tudo
frontendCache.clearAll();
```

### Node.js
Usa o mesmo `database.cjs`:
```javascript
const { clearOldCache } = require('./database.cjs');
await clearOldCache(30); // >30 dias
```

### Python
```bash
curl -X POST http://localhost:8000/api/cache/clear?days_old=30
```

## 🎯 Casos de Uso

### 1. Dashboard Inicial
- Frontend busca cache local → Exibe imediatamente
- Background: atualiza do Node.js se expirado
- UX: Dados instantâneos, atualização invisível

### 2. Modo Offline
- Frontend usa cache local (válido 24h)
- Funciona sem internet
- Mostra indicador "dados em cache"

### 3. Refresh Forçado
- Usuário clica "Atualizar"
- Ignora todos os caches (force=true)
- Busca direto do Google Sheets
- Atualiza todas as camadas

### 4. Alta Carga
- 1000 usuários simultâneos
- 90% servido do cache (< 50ms)
- 10% do Google Sheets (distribuído)
- Sistema permanece responsivo

## ✅ Checklist de Implementação

- [x] Cache Frontend (localStorage)
- [x] Cache Node.js (SQLite)
- [x] Cache Python (SQLite)
- [x] Proxy Node.js com fallback
- [x] Endpoints de monitoramento
- [x] Limpeza automática
- [x] Testes de integração
- [x] Documentação completa

## 🚀 Deploy

### Desenvolvimento
```bash
# Terminal 1: Backend Python
cd backend && python -m uvicorn app:app --reload --port 8000

# Terminal 2: Proxy Node.js
cd meu-servidor/servidor && node proxy-cache.cjs

# Terminal 3: Frontend
python -m http.server 8080
```

### Produção
- **Frontend**: GitHub Pages (cache no navegador)
- **Node.js**: Heroku/Railway (proxy + cache)
- **Python**: Render/Railway (backend + cache)
- **Bancos**: Persistentes via volumes

## 📚 Referências

- [cache-frontend.js](cache-frontend.js) - 180 linhas
- [database.cjs](database.cjs) - 336 linhas
- [proxy-cache.cjs](meu-servidor/servidor/proxy-cache.cjs) - 140 linhas
- [cache_service.py](backend/cache_service.py) - 316 linhas
- Total: ~970 linhas de código de cache!
