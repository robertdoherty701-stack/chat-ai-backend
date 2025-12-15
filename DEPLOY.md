# Deploy do Chat AI Backend

## 🚀 Opções de Deploy (Gratuitas)

### 1. Render.com (RECOMENDADO)

#### Passo a Passo:

1. **Crie uma conta** em [render.com](https://render.com)

2. **Conecte seu repositório GitHub:**
   - Faça push do projeto para o GitHub
   - No Render, clique em "New +" → "Web Service"
   - Conecte sua conta GitHub e selecione o repositório

3. **Configure o serviço:**
   - **Name**: `chat-ai-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Adicione variáveis de ambiente:**
   ```
   SECRET_KEY=sua-chave-secreta-aqui-mude-isso
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   DEV_ADMIN_EMAIL=admin@seudominio.com
   DEV_ADMIN_PASSWORD=SuaSenhaSegura123!
   ALLOWED_ORIGINS=https://seu-frontend.render.com,https://seudominio.com
   ```

5. **Deploy automático** - O Render fará o deploy automaticamente!

6. **URL do seu backend**: `https://chat-ai-backend.onrender.com`

---

### 2. Railway.app

#### Passo a Passo:

1. **Crie uma conta** em [railway.app](https://railway.app)

2. **New Project** → **Deploy from GitHub repo**

3. **Variáveis de ambiente** (Settings → Variables):
   ```
   PORT=8000
   SECRET_KEY=sua-chave-secreta
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

4. **Deploy automático** ao fazer push no GitHub

---

### 3. Fly.io

#### Passo a Passo:

1. **Instale o Fly CLI:**
   ```bash
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Login e deploy:**
   ```bash
   fly auth login
   fly launch
   fly deploy
   ```

3. **Configure secrets:**
   ```bash
   fly secrets set SECRET_KEY=sua-chave-secreta
   fly secrets set DEV_ADMIN_EMAIL=admin@example.com
   fly secrets set DEV_ADMIN_PASSWORD=SenhaSegura123!
   ```

---

## 📦 Preparar projeto para GitHub

Antes de fazer deploy, envie seu código para o GitHub:

```bash
# Inicialize o Git (se ainda não fez)
git init

# Adicione todos os arquivos
git add .

# Commit
git commit -m "Projeto Chat AI Backend pronto para deploy"

# Conecte ao GitHub (crie um repositório primeiro em github.com)
git remote add origin https://github.com/seu-usuario/chat-ai-backend.git

# Envie o código
git push -u origin main
```

---

## 🔒 Segurança

⚠️ **IMPORTANTE**: Antes do deploy:

1. Mude o `SECRET_KEY` para algo seguro e único
2. Use senhas fortes para o admin
3. Configure `ALLOWED_ORIGINS` com seus domínios reais
4. Nunca commite arquivos `.env` no GitHub

---

## 🌐 Testar após Deploy

Depois do deploy, sua API estará disponível em:
- Render: `https://seu-app.onrender.com`
- Railway: `https://seu-app.up.railway.app`
- Fly: `https://seu-app.fly.dev`

### Endpoints principais:
- Documentação: `/docs`
- Login: `/auth/login`
- Registro: `/auth/register`
- Chat: `/chat/message`

---

## 🎯 Próximos Passos

1. Faça deploy do backend
2. Atualize o `login.js` e `chat.js` com a URL do backend em produção
3. Faça deploy do frontend (HTML/JS) no Netlify ou Vercel
4. Teste tudo!

---

## 💡 Dicas

- **Render Free Tier**: Pode ficar inativo após 15 minutos sem uso
- **Railway**: 500 horas grátis/mês ($5 de crédito)
- **Fly.io**: Bom para aplicações que ficam sempre ativas
