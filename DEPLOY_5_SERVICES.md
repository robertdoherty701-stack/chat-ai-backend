# 🚀 Deploy dos 5 Serviços no Render

## 📋 Visão Geral dos Serviços

### 1. **Backend Principal** (`backend/`)
- **Tipo**: FastAPI
- **Função**: Autenticação (JWT), Upload, Relatórios PDF/Excel, WhatsApp, Google Sheets
- **Endpoints principais**: 
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/upload/excel`
  - `/api/relatorios/gerar`
  - `/api/historico`

### 2. **Chat IA Backend** (`chat-ia-backend/`)
- **Tipo**: Flask
- **Função**: Sistema de chat com IA
- **Endpoints**: `/api/chat/*`

### 3. **Python Backend API** (`python-backend-api/`)
- **Tipo**: FastAPI
- **Função**: API adicional para funcionalidades específicas
- **Endpoints**: Conforme routes

### 4. **Servidor Node** (`meu-servidor/`)
- **Tipo**: Node.js/Express
- **Função**: Servidor adicional
- **Porta**: 3000

### 5. **Admin Dashboard** (`admin-dashboard/`)
- **Tipo**: Vue.js (Frontend)
- **Função**: Dashboard administrativo
- **Build**: Vite

---

## 🔧 Passo a Passo do Deploy

### **Serviço 1: Backend Principal**

1. No Render Dashboard, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub
3. Configure:
   ```
   Name: chat-backend-main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app:app --host 0.0.0.0 --port $PORT
   ```
4. Variáveis de ambiente:
   ```
   SECRET_KEY=sua-chave-secreta-forte-aqui
   ALLOWED_ORIGINS=*
   DATABASE_URL=sqlite:///./database.db
   ```

### **Serviço 2: Chat IA Backend**

1. **"New +"** → **"Web Service"**
2. Configure:
   ```
   Name: chat-ia-backend
   Root Directory: chat-ia-backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn -w 4 -b 0.0.0.0:$PORT "app:create_app()"
   ```
3. Variáveis de ambiente:
   ```
   FLASK_ENV=production
   SECRET_KEY=outra-chave-secreta
   ```

### **Serviço 3: Python Backend API**

1. **"New +"** → **"Web Service"**
2. Configure:
   ```
   Name: python-backend-api
   Root Directory: python-backend-api
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn src.main:app --host 0.0.0.0 --port $PORT
   ```

### **Serviço 4: Servidor Node**

1. **"New +"** → **"Web Service"**
2. Configure:
   ```
   Name: meu-servidor-node
   Root Directory: meu-servidor
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```
3. Variáveis de ambiente:
   ```
   NODE_ENV=production
   PORT=$PORT
   ```

### **Serviço 5: Admin Dashboard (Frontend)**

1. **"New +"** → **"Static Site"**
2. Configure:
   ```
   Name: admin-dashboard
   Root Directory: admin-dashboard
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```
3. Variáveis de ambiente:
   ```
   VITE_API_URL=https://chat-backend-main.onrender.com
   ```

---

## 📝 URLs Finais (Exemplo)

Depois do deploy, você terá:

```
1. Backend Principal:     https://chat-backend-main.onrender.com
2. Chat IA Backend:       https://chat-ia-backend.onrender.com
3. Python Backend API:    https://python-backend-api.onrender.com
4. Servidor Node:         https://meu-servidor-node.onrender.com
5. Admin Dashboard:       https://admin-dashboard.onrender.com
```

---

## 🔗 Configuração do Frontend (app-premium.html)

Atualize as URLs no frontend para usar cada serviço:

```javascript
// URLs dos serviços
const API_URLS = {
    auth: 'https://chat-backend-main.onrender.com',      // Login, registro
    chat: 'https://chat-ia-backend.onrender.com',        // Sistema de chat
    api: 'https://python-backend-api.onrender.com',      // API geral
    node: 'https://meu-servidor-node.onrender.com',      // Servidor Node
    upload: 'https://chat-backend-main.onrender.com',    // Upload de arquivos
    reports: 'https://chat-backend-main.onrender.com'    // Relatórios
};

// Exemplo de uso
async function login(email, password) {
    const response = await fetch(`${API_URLS.auth}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return await response.json();
}

async function sendChatMessage(message) {
    const response = await fetch(`${API_URLS.chat}/api/chat/message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
    });
    return await response.json();
}
```

---

## ⚠️ Pontos Importantes

### CORS
Cada backend precisa aceitar requisições do frontend. Configure em todos:

```python
# Python/FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ou lista específica
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Plano Free do Render
- ⚠️ **5 serviços = Muito lento!** (cada um "hiberna" após 15min de inatividade)
- ⏱️ **Primeira requisição demora ~1 minuto** para acordar
- 💰 **Considere upgradar para plano pago** ($7/mês por serviço)

### Alternativa Recomendada
Se todos os backends forem Python, **UNIFIQUE TUDO** em 1 só:
- Mais rápido
- Mais barato
- Mais fácil de manter

---

## 🆘 Problemas Comuns

### Erro: "Application failed to respond"
- Verifique se o `Start Command` está correto
- Confirme que a porta usa `$PORT` (variável do Render)

### Erro 404 nos endpoints
- Verifique se o `Root Directory` está correto
- Confira se os arquivos estão na pasta certa

### CORS errors
- Configure CORS em TODOS os backends
- Use `*` para desenvolvimento, URLs específicas para produção

---

## ✅ Checklist de Deploy

- [ ] **Serviço 1** (Backend Principal) - Deploy e teste `/api/auth/login`
- [ ] **Serviço 2** (Chat IA) - Deploy e teste `/api/chat/message`
- [ ] **Serviço 3** (Python API) - Deploy e teste endpoints
- [ ] **Serviço 4** (Node Server) - Deploy e teste
- [ ] **Serviço 5** (Admin Dashboard) - Build e deploy
- [ ] Atualizar URLs no `app-premium.html`
- [ ] Atualizar URLs no `chat-integration.js`
- [ ] Testar login completo
- [ ] Testar chat completo
- [ ] Testar upload de arquivos

---

**Próximo Passo**: Vou criar os arquivos de configuração específicos para cada serviço!
