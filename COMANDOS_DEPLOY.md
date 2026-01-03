# 🚀 Comandos Rápidos para Deploy

## 1️⃣ PREPARAR E SUBIR PARA O GITHUB

```powershell
# Navegar para a pasta do projeto
cd "c:\Users\Ataq Nathi\Desktop\chat-ai-backend-main"

# Inicializar Git
git init

# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "Projeto preparado para deploy no Render"

# Criar repositório no GitHub (faça isso no navegador primeiro)
# Vá em: https://github.com/new
# Nome do repositório: chat-ai-backend-main
# Deixe PÚBLICO ou PRIVADO (Render funciona com ambos)

# Conectar ao GitHub (substitua SEU_USUARIO pelo seu usuário do GitHub)
git remote add origin https://github.com/SEU_USUARIO/chat-ai-backend-main.git
git branch -M main
git push -u origin main
```

## 2️⃣ CRIAR SERVIÇOS NO RENDER

Acesse: https://render.com

### ✅ Serviço 1: Backend Principal

1. New + → Web Service
2. Connect seu repositório GitHub
3. Configurar:
   - **Name:** `chat-ai-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   ```
   SECRET_KEY = SECRET_EMPRESA_CHAT_AI_2025_PRODUCAO
   ```
5. Create Web Service

### ✅ Serviço 2: Chat IA Backend

1. New + → Web Service
2. Mesmo repositório
3. Configurar:
   - **Name:** `chat-ia-backend`
   - **Root Directory:** `chat-ia-backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   ```
   DEBUG = False
   SECRET_KEY = sua_chave_secreta
   AI_API_URL = https://api.openai.com/v1/chat/completions
   AI_API_KEY = sk-sua-api-key-aqui
   ```
5. Create Web Service

### ✅ Serviço 3: Python Backend API

1. New + → Web Service
2. Mesmo repositório
3. Configurar:
   - **Name:** `python-backend-api`
   - **Root Directory:** `python-backend-api`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   ```
   DEBUG = false
   SECRET_KEY = sua_chave_secreta
   ```
5. Create Web Service

### ✅ Serviço 4: Meu Servidor (Node.js)

1. New + → Web Service
2. Mesmo repositório
3. Configurar:
   - **Name:** `meu-servidor`
   - **Root Directory:** `meu-servidor/servidor`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
4. Create Web Service

### ✅ Serviço 5: Admin Dashboard (Frontend)

⚠️ **IMPORTANTE:** Edite o arquivo `admin-dashboard/.env.production` com as URLs reais do Render antes de fazer deploy!

```env
VITE_API_BACKEND_URL=https://chat-ai-backend.onrender.com
VITE_API_CHAT_IA_URL=https://chat-ia-backend.onrender.com
VITE_API_PYTHON_URL=https://python-backend-api.onrender.com
VITE_SERVIDOR_URL=https://meu-servidor.onrender.com
```

Depois de editar, faça commit e push:

```powershell
git add admin-dashboard/.env.production
git commit -m "Configurar URLs de produção"
git push
```

Agora crie o serviço no Render:

1. New + → Static Site
2. Mesmo repositório
3. Configurar:
   - **Name:** `admin-dashboard`
   - **Root Directory:** `admin-dashboard`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Create Static Site

## 3️⃣ VERIFICAR SE ESTÁ FUNCIONANDO

Após cada deploy (aguarde ficar "Live" - verde):

```powershell
# Backend Principal
curl https://chat-ai-backend.onrender.com

# Chat IA Backend
curl https://chat-ia-backend.onrender.com

# Python Backend API
curl https://python-backend-api.onrender.com

# Meu Servidor
curl https://meu-servidor.onrender.com

# Admin Dashboard (abra no navegador)
# https://admin-dashboard.onrender.com
```

## 4️⃣ ATUALIZAR O PROJETO (após mudanças)

```powershell
# Fazer mudanças no código
# Depois:

git add .
git commit -m "Descrição das mudanças"
git push

# O Render vai fazer deploy automático!
```

## 🎉 PRONTO!

Seu projeto está online! As URLs serão algo como:
- https://chat-ai-backend.onrender.com
- https://chat-ia-backend.onrender.com
- https://python-backend-api.onrender.com
- https://meu-servidor.onrender.com
- https://admin-dashboard.onrender.com

## 📝 NOTAS IMPORTANTES

- ⏰ Plano Free: Serviços dormem após 15 min de inatividade (primeiro acesso demora ~30s)
- 💾 Arquivos não persistem (disco efêmero) - use storage externo se precisar
- 🔄 Redeploy automático a cada push no GitHub
- 💰 Upgrade para $7/mês por serviço para serviço sempre ativo

## ❓ PROBLEMAS?

Veja os logs no painel do Render (aba "Logs" de cada serviço).

Leia o arquivo DEPLOY_RENDER.md para mais detalhes!
