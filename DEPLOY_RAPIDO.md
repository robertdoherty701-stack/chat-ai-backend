# 🚀 GUIA RÁPIDO DE DEPLOY - 5 SERVIÇOS

## ✅ Status Atual
- [x] Arquivos render.yaml criados para os 5 serviços
- [x] CORS configurado no backend principal
- [x] Scripts de automação criados
- [ ] Deploy no Render (você fará agora)
- [ ] URLs atualizadas no frontend

---

## 📋 PASSO A PASSO

### 1️⃣ Commit e Push (Execute no terminal)

```bash
# Adicionar todos os arquivos
git add .

# Commit
git commit -m "Add: Configuração dos 5 serviços para deploy no Render"

# Push para GitHub
git push origin main
```

### 2️⃣ Deploy no Render Dashboard

Acesse: **https://dashboard.render.com**

#### 🔹 Serviço 1: Backend Principal (Autenticação, Upload, Relatórios)

1. Clique em **"New +" → "Web Service"**
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: `chat-backend-main`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `SECRET_KEY` = (gere uma chave aleatória segura)
     - `ALLOWED_ORIGINS` = `*` (ou domínio específico em produção)

4. Clique em **"Create Web Service"**
5. **Aguarde o deploy** (~5 minutos)
6. **Anote a URL**: Ex: `https://chat-backend-main.onrender.com`

#### 🔹 Serviço 2: Chat IA Backend

1. **"New +" → "Web Service"**
2. Configure:
   - **Name**: `chat-ia-backend`
   - **Root Directory**: `chat-ia-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT "app:create_app()"`

3. **Create Web Service**
4. **Anote a URL**: Ex: `https://chat-ia-backend.onrender.com`

#### 🔹 Serviço 3: Python Backend API

1. **"New +" → "Web Service"**
2. Configure:
   - **Name**: `python-backend-api`
   - **Root Directory**: `python-backend-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`

3. **Create Web Service**
4. **Anote a URL**: Ex: `https://python-backend-api.onrender.com`

#### 🔹 Serviço 4: Servidor Node

1. **"New +" → "Web Service"**
2. Configure:
   - **Name**: `meu-servidor-node`
   - **Root Directory**: `meu-servidor`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **Create Web Service**
4. **Anote a URL**: Ex: `https://meu-servidor-node.onrender.com`

#### 🔹 Serviço 5: Admin Dashboard (Static Site)

1. **"New +" → "Static Site"**
2. Configure:
   - **Name**: `admin-dashboard`
   - **Root Directory**: `admin-dashboard`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. **Create Static Site**
4. **Anote a URL**: Ex: `https://admin-dashboard.onrender.com`

---

### 3️⃣ Atualizar URLs no Frontend

Após todos os deploys, edite o arquivo **`update-frontend-urls.js`**:

```javascript
const API_URLS = {
    auth: 'https://chat-backend-main.onrender.com',      // ← Cole a URL do Serviço 1
    chat: 'https://chat-ia-backend.onrender.com',        // ← Cole a URL do Serviço 2
    api: 'https://python-backend-api.onrender.com',      // ← Cole a URL do Serviço 3
    node: 'https://meu-servidor-node.onrender.com',      // ← Cole a URL do Serviço 4
    admin: 'https://admin-dashboard.onrender.com'        // ← Cole a URL do Serviço 5
};
```

Execute o script:
```bash
node update-frontend-urls.js
```

---

### 4️⃣ Adicionar CORS nos Outros Backends

#### Chat IA Backend (`chat-ia-backend/app/__init__.py`)

```python
from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    # Adicionar CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    from .api.routes import api as api_blueprint
    app.register_blueprint(api_blueprint)
    
    return app
```

Instale flask-cors:
```bash
# Adicione em chat-ia-backend/requirements.txt
flask-cors==4.0.0
```

#### Python Backend API (`python-backend-api/src/main.py`)

Verifique se tem CORS configurado:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Servidor Node (`meu-servidor/servidor/index.js`)

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Adicionar CORS
app.use(cors());
app.use(express.json());

// ... resto do código
```

Após adicionar CORS, faça commit e push novamente:
```bash
git add .
git commit -m "Add: CORS em todos os backends"
git push origin main
```

O Render fará redeploy automático.

---

### 5️⃣ Testar o Sistema

1. **Abra** `app-premium.html` no navegador
2. **Teste Login**:
   - Email: `admin@teste.com`
   - Senha: `123456`
3. **Teste Chat**: Envie uma mensagem
4. **Teste Upload**: Envie um arquivo
5. **Teste Gráficos**: Gere um gráfico

---

## ⚠️ AVISOS IMPORTANTES

### 🐌 Hibernação no Plano Free

- Os serviços **hibernam após 15 minutos sem uso**
- A primeira requisição após hibernação demora **30-50 segundos**
- Recomendado: **Upgrade para plano pago** ($7/mês por serviço)

### 🔥 Keepalive (Evitar Hibernação)

Crie um cron job que faz ping a cada 10 minutos:

```javascript
// keepalive.js
const services = [
    'https://chat-backend-main.onrender.com/health',
    'https://chat-ia-backend.onrender.com/health',
    // ... outras URLs
];

setInterval(async () => {
    for (const url of services) {
        try {
            await fetch(url);
            console.log(`✅ ${url} - OK`);
        } catch (e) {
            console.log(`❌ ${url} - Erro`);
        }
    }
}, 600000); // 10 minutos
```

---

## 📊 Checklist Final

- [ ] 5 serviços deployados no Render
- [ ] URLs anotadas em `URLS_CONFIG.md`
- [ ] Frontend atualizado (executou `update-frontend-urls.js`)
- [ ] CORS configurado em todos os backends
- [ ] Teste de login funcionando
- [ ] Teste de chat funcionando
- [ ] Teste de upload funcionando
- [ ] Teste de gráficos funcionando

---

## 🆘 Problemas Comuns

### ❌ Erro 404 ao fazer login

**Causa**: URL incorreta ou serviço não deployado  
**Solução**: Verifique se `chat-backend-main` está rodando no Render

### ❌ Chat não responde

**Causa**: URL do chat-ia-backend incorreta  
**Solução**: Verifique a URL em `chat-integration.js`

### ❌ CORS Error

**Causa**: Backend não aceita requisições do frontend  
**Solução**: Adicione CORS conforme passo 4️⃣

### ❌ Serviço retorna "Service Unavailable"

**Causa**: Serviço hibernou (plano free)  
**Solução**: Aguarde 30-50s para wake-up, ou configure keepalive

---

## 💰 Custos Render

- **Free**: $0 (com hibernação após 15min)
- **Starter**: $7/mês por serviço (sem hibernação)
- **5 serviços Starter**: $35/mês total

---

## ✅ Pronto!

Após seguir todos os passos, seu sistema estará rodando com:
- ✅ Autenticação JWT separada
- ✅ Chat IA funcional
- ✅ Upload de arquivos
- ✅ Geração de gráficos
- ✅ WhatsApp integration
- ✅ Admin dashboard

**Dúvidas?** Consulte `DEPLOY_5_SERVICES.md` para documentação completa.
