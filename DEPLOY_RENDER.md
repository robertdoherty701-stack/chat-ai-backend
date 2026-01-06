# 🚀 Guia Completo de Deploy no Render

## 📋 Visão Geral do Projeto

Este projeto contém **5 serviços independentes** que precisam ser deployados separadamente no Render:

1. **backend** - FastAPI (Python) - API principal com JWT, uploads, exportação
2. **chat-ia-backend** - FastAPI (Python) - API de chat com IA
3. **python-backend-api** - FastAPI (Python) - API genérica
4. **meu-servidor** - Express (Node.js) - Servidor simples
5. **admin-dashboard** - Vue 3 + Vite - Frontend

---

## 📝 PASSO 1: Preparar o Repositório GitHub

### 1.1 Criar arquivo .gitignore na raiz

Crie um arquivo `.gitignore` na raiz do projeto com o seguinte conteúdo:

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
.venv
.env
*.egg-info/
dist/
build/

# Node
node_modules/
npm-debug.log
yarn-error.log
.DS_Store

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Uploads e dados locais
backend/data/uploads/
backend/data/exports/
*.csv
*.db
*.sqlite

# Build outputs
admin-dashboard/dist/
admin-dashboard/build/
```

### 1.2 Subir para o GitHub

```bash
# Na raiz do projeto
cd "c:\Users\Ataq Nathi\Desktop\chat-ai-backend-main"

# Inicializar Git
git init

# Adicionar todos os arquivos
git add .

# Commit inicial
git commit -m "Projeto completo preparado para deploy no Render"

# Criar repositório no GitHub
# Vá em https://github.com/new e crie um novo repositório chamado 'chat-ai-backend-main'

# Conectar repositório local ao GitHub
git remote add origin https://github.com/SEU_USUARIO/chat-ai-backend-main.git
git branch -M main
git push -u origin main
```

---

## 🌐 PASSO 2: Criar Serviços no Render

Acesse [render.com](https://render.com) e faça login com sua conta GitHub.

---

### 🔷 SERVIÇO 1: Backend Principal (FastAPI)

**Configuração:**

| Campo | Valor |
|-------|-------|
| Type | Web Service |
| Name | `chat-ai-backend` |
| Region | Oregon (US West) ou mais próximo |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free |

**Variáveis de Ambiente (Environment Variables):**

```
SECRET_KEY=SECRET_EMPRESA_CHAT_AI_2025_PRODUCAO_SEGURO
```

**Após o deploy, anote a URL:** `https://chat-ai-backend.onrender.com`

---

### 🔷 SERVIÇO 2: Chat IA Backend (FastAPI)

**Configuração:**

| Campo | Valor |
|-------|-------|
| Type | Web Service |
| Name | `chat-ia-backend` |
| Root Directory | `chat-ia-backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free |

**Variáveis de Ambiente:**

```
DEBUG=False
SECRET_KEY=sua_chave_secreta_chat_ia
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-sua-api-key-da-openai-aqui
UPLOAD_FOLDER=/tmp/uploads
```

**URL:** `https://chat-ia-backend.onrender.com`

---

### 🔷 SERVIÇO 3: Python Backend API (FastAPI)

**Configuração:**

| Campo | Valor |
|-------|-------|
| Type | Web Service |
| Name | `python-backend-api` |
| Root Directory | `python-backend-api` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn src.main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free |

**Variáveis de Ambiente:**

```
DEBUG=false
SECRET_KEY=sua_chave_secreta_python_api
APP_NAME=Python Backend API
HOST=0.0.0.0
```

**URL:** `https://python-backend-api.onrender.com`

---

### 🔷 SERVIÇO 4: Meu Servidor (Node.js/Express)

**Configuração:**

| Campo | Valor |
|-------|-------|
| Type | Web Service |
| Name | `meu-servidor` |
| Root Directory | `meu-servidor/servidor` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `node index.js` |
| Instance Type | Free |

**Ajuste necessário no código:**

O arquivo `meu-servidor/servidor/index.js` precisa usar a porta do Render:

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Servidor rodando no Render!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
```

**URL:** `https://meu-servidor.onrender.com`

---

### 🔷 SERVIÇO 5: Admin Dashboard (Frontend Vue + Vite)

**Configuração:**

| Campo | Valor |
|-------|-------|
| Type | Static Site |
| Name | `admin-dashboard` |
| Root Directory | `admin-dashboard` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

**IMPORTANTE:** Antes de fazer deploy, configure as URLs das APIs no frontend.

Edite o arquivo `admin-dashboard/.env.production` (já criado):

```env
VITE_API_BACKEND_URL=https://chat-ai-backend.onrender.com
VITE_API_CHAT_IA_URL=https://chat-ia-backend.onrender.com
VITE_API_PYTHON_URL=https://python-backend-api.onrender.com
VITE_SERVIDOR_URL=https://meu-servidor.onrender.com
```

**URL:** `https://admin-dashboard.onrender.com`

---

## ⚙️ PASSO 3: Ajustes Necessários no Código

### 3.1 Ajustar meu-servidor para usar PORT do Render

Edite `meu-servidor/servidor/index.js`:

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Servidor rodando no Render!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
```

### 3.2 Ajustar CORS nos backends

Em todos os backends Python, certifique-se de que o CORS permite as origens do Render:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://admin-dashboard.onrender.com",
        "http://localhost:5173",  # Para desenvolvimento local
        "*"  # Remove isso em produção se quiser mais segurança
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3.3 Criar diretórios necessários no backend

O Render usa sistema de arquivos efêmero, então você precisa garantir que os diretórios sejam criados no startup.

No `backend/app.py`, já existe:

```python
BASE_DIR = Path("data")
BASE_DIR.mkdir(exist_ok=True)
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
EXPORTS_DIR = BASE_DIR / "exports"
EXPORTS_DIR.mkdir(exist_ok=True)
```

⚠️ **AVISO:** No plano Free do Render, os arquivos são perdidos quando o serviço reinicia. Para persistência, use:
- Render Disks (pago)
- Serviços de storage externos (AWS S3, Cloudinary, etc.)

---

## 🔄 PASSO 4: Deploy e Verificação

### 4.1 Ordem de Deploy

1. **Backends primeiro** (podem demorar 5-10 minutos cada no primeiro deploy)
2. **Frontend por último** (após ter as URLs dos backends)

### 4.2 Verificar se está funcionando

Após cada deploy, teste a URL:

```bash
# Backend principal
curl https://chat-ai-backend.onrender.com

# Chat IA Backend
curl https://chat-ia-backend.onrender.com

# Python Backend API
curl https://python-backend-api.onrender.com

# Meu Servidor
curl https://meu-servidor.onrender.com

# Admin Dashboard
# Acesse no navegador: https://admin-dashboard.onrender.com
```

---

## 🐛 TROUBLESHOOTING

### Problema: Serviço não inicia

**Solução:** Veja os logs no painel do Render (aba "Logs").

Erros comuns:
- **ModuleNotFoundError:** Verifique se o `requirements.txt` ou `package.json` está completo
- **Port binding error:** Certifique-se de usar `$PORT` ou `process.env.PORT`
- **Path not found:** Verifique o "Root Directory" no Render

### Problema: CORS error no frontend

**Solução:** Adicione a URL do frontend nos backends:

```python
allow_origins=["https://admin-dashboard.onrender.com"]
```

### Problema: Arquivos não persistem

**Solução:** Render Free tem disco efêmero. Use Render Disks (pago) ou serviços externos de storage.

---

## 📊 RESUMO DAS URLs (após deploy)

| Serviço | URL |
|---------|-----|
| Backend Principal | `https://chat-ai-backend.onrender.com` |
| Chat IA Backend | `https://chat-ia-backend.onrender.com` |
| Python Backend API | `https://python-backend-api.onrender.com` |
| Meu Servidor | `https://meu-servidor.onrender.com` |
| Admin Dashboard | `https://admin-dashboard.onrender.com` |

---

## ✅ CHECKLIST FINAL

- [ ] Código está no GitHub
- [ ] Criados 5 serviços no Render
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend conectado aos backends (URLs corretas no .env.production)
- [ ] CORS configurado corretamente
- [ ] Todos os serviços estão "Live" (verde) no Render
- [ ] Testado acessando as URLs

---

## 🎉 PRONTO!

Seu projeto está online no Render! 

**Nota:** O plano Free do Render coloca os serviços em "sleep" após 15 minutos de inatividade. O primeiro acesso pode demorar ~30 segundos para "acordar" o serviço.

Para serviços sempre ativos, considere upgrade para plano pago ($7/mês por serviço).
