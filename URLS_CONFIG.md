# 🔗 Configuração de URLs dos Serviços

## URLs dos Serviços no Render

Após fazer o deploy de cada serviço no Render, anote as URLs aqui:

```javascript
// ⚠️ SUBSTITUA ESTAS URLs PELAS URLs REAIS DO SEU RENDER

const API_URLS = {
    // Serviço 1: Backend Principal (Auth, Upload, Relatórios, WhatsApp)
    auth: 'https://chat-backend-main.onrender.com',
    
    // Serviço 2: Chat IA Backend (Sistema de Chat)
    chat: 'https://chat-ia-backend.onrender.com',
    
    // Serviço 3: Python Backend API (API adicional)
    api: 'https://python-backend-api.onrender.com',
    
    // Serviço 4: Servidor Node
    node: 'https://meu-servidor-node.onrender.com',
    
    // Serviço 5: Admin Dashboard
    admin: 'https://admin-dashboard.onrender.com'
};
```

## Mapeamento de Endpoints por Serviço

### 1. Backend Principal (`auth`)
```
/api/auth/login          → Login de usuários
/api/auth/register       → Registro
/api/auth/verify         → Verificação de token
/api/upload/image        → Upload de imagens
/api/upload/file         → Upload de arquivos
/api/relatorios/*        → Relatórios
/api/historico/*         → Histórico
/api/whatsapp/*          → WhatsApp integration
```

### 2. Chat IA Backend (`chat`)
```
/api/chat/message        → Enviar mensagem ao chat
/api/chat/history        → Histórico de conversas
/api/chat/clear          → Limpar cache
```

### 3. Python Backend API (`api`)
```
/api/v1/*                → Endpoints da API v1
/health                  → Health check
```

### 4. Servidor Node (`node`)
```
/api/*                   → Endpoints Node
/status                  → Status do servidor
```

### 5. Admin Dashboard (`admin`)
```
/                        → Dashboard administrativo (Vue.js)
```

## Como Usar

### Passo 1: Fazer Deploy no Render

1. Acesse https://dashboard.render.com
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure cada serviço conforme DEPLOY_5_SERVICES.md

### Passo 2: Anotar URLs

Após cada deploy, copie a URL gerada pelo Render e anote acima.

### Passo 3: Atualizar Frontend

Execute o script de atualização:
```bash
node update-frontend-urls.js
```

Ou atualize manualmente:

1. **app-premium.html** - Atualizar linha ~10:
```javascript
const API_BASE_URL = API_URLS.auth;  // Backend Principal
```

2. **chat-integration.js** - Atualizar linha ~5:
```javascript
const CHAT_API_URL = API_URLS.chat;  // Chat IA Backend
```

3. **login.js** - Atualizar URL de autenticação:
```javascript
const AUTH_API_URL = API_URLS.auth;
```

### Passo 4: Configurar CORS

Cada backend precisa aceitar requisições do frontend.

**backend/app.py**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique o domínio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**chat-ia-backend/app/__init__.py**:
```python
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    return app
```

**meu-servidor/servidor/index.js**:
```javascript
const cors = require('cors');
app.use(cors());
```

## Troubleshooting

### ❌ Erro 404 ao fazer login
**Causa**: URL do serviço de auth incorreta
**Solução**: Verificar `API_URLS.auth` em app-premium.html

### ❌ Chat não responde
**Causa**: URL do chat-ia-backend incorreta
**Solução**: Verificar `CHAT_API_URL` em chat-integration.js

### ❌ CORS Error
**Causa**: Backend não está aceitando requisições do frontend
**Solução**: Adicionar CORSMiddleware/CORS no backend

### ❌ Serviços lentos/hibernando
**Causa**: Plano Free do Render hiberna após inatividade
**Solução**: 
- Primeira requisição demora 30-50s (wake up)
- Considere upgrade para plano pago
- Ou configure keepalive (ping a cada 10min)

## Exemplo de Configuração Completa

```javascript
// Em app-premium.html e chat-integration.js

const API_URLS = {
    auth: 'https://chat-backend-main.onrender.com',
    chat: 'https://chat-ia-backend.onrender.com',
    api: 'https://python-backend-api.onrender.com',
    node: 'https://meu-servidor-node.onrender.com',
    admin: 'https://admin-dashboard.onrender.com'
};

// Função de fetch com retry para wake-up
async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Exemplo de uso
const response = await fetchWithRetry(`${API_URLS.auth}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
});
```

## Checklist de Deploy

- [ ] Todos os 5 serviços deployados no Render
- [ ] URLs anotadas neste arquivo
- [ ] Frontend atualizado com URLs corretas
- [ ] CORS configurado em todos os backends
- [ ] Teste de login funcionando
- [ ] Teste de chat funcionando
- [ ] Teste de upload funcionando
- [ ] Teste de geração de gráficos funcionando
- [ ] WhatsApp integration testada

## Próximos Passos

1. ✅ Criar arquivos render.yaml
2. ✅ Fazer commit e push para GitHub
3. ⏳ Fazer deploy dos 5 serviços no Render
4. ⏳ Anotar URLs geradas
5. ⏳ Atualizar frontend com URLs
6. ⏳ Testar sistema completo
