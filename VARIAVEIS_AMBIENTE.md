# 🔐 Guia de Variáveis de Ambiente

## 📋 Visão Geral

Este documento lista **todas as variáveis de ambiente** necessárias para o projeto funcionar corretamente no Render.

---

## ✅ Variáveis OBRIGATÓRIAS

### 🔑 SECRET_KEY
**Descrição:** Chave secreta para JWT (autenticação)  
**Obrigatório:** ✅ Sim  
**Valor exemplo:** `minha-chave-super-secreta-2025`  
**Como gerar:**
```bash
# Linux/Mac
openssl rand -hex 32

# Python
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## ⚠️ Variáveis IMPORTANTES

### 🌐 ALLOWED_ORIGINS
**Descrição:** Domínios permitidos para CORS  
**Obrigatório:** Recomendado para produção  
**Valor padrão:** `*` (permite todos - apenas desenvolvimento)  
**Valor produção:**
```
https://admin-dashboard.onrender.com,https://seudominio.com
```

**⚠️ IMPORTANTE:** Sempre especifique domínios reais em produção!

---

## 🔧 Variáveis OPCIONAIS

### 🤖 Integração com IA

#### AI_API_KEY
**Descrição:** Chave da API OpenAI (GPT)  
**Obrigatório:** Apenas se usar GPT  
**Valor exemplo:** `sk-proj-abc123...`  
**Obter em:** https://platform.openai.com/api-keys

#### AI_API_URL
**Descrição:** URL da API de IA  
**Valor padrão:** `https://api.openai.com/v1/chat/completions`

---

### 📁 Armazenamento

#### UPLOAD_FOLDER
**Descrição:** Diretório para uploads  
**Valor padrão:** `/tmp/uploads` (Render Free)  
**⚠️ Render Free:** Disco é efêmero, arquivos são perdidos ao reiniciar

#### EXPORT_FOLDER
**Descrição:** Diretório para exports  
**Valor padrão:** `/tmp/exports` (Render Free)

---

### 📱 WhatsApp

#### WHATSAPP_API_URL
**Descrição:** URL da API WhatsApp  
**Valor exemplo:** `https://api.whatsapp.com/send`

#### WHATSAPP_PHONE
**Descrição:** Número WhatsApp com código do país  
**Valor exemplo:** `5511999999999`

---

### 📊 Google Sheets

#### GOOGLE_SHEETS_API_KEY
**Descrição:** Chave da API Google Sheets  
**Obter em:** https://console.cloud.google.com/

#### GOOGLE_SHEETS_SPREADSHEET_ID
**Descrição:** ID da planilha Google  
**Valor exemplo:** `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

---

### 🗄️ Database

#### DATABASE_URL
**Descrição:** URL de conexão PostgreSQL  
**Formato:** `postgresql://user:password@host:5432/dbname`  
**Render:** Gerada automaticamente se criar PostgreSQL

---

### 📧 Email

#### EMAIL_HOST
**Descrição:** Servidor SMTP  
**Valor exemplo:** `smtp.gmail.com`

#### EMAIL_PORT
**Descrição:** Porta SMTP  
**Valor exemplo:** `587`

#### EMAIL_USER
**Descrição:** Email do remetente  
**Valor exemplo:** `seu-email@gmail.com`

#### EMAIL_PASSWORD
**Descrição:** Senha do email  
**⚠️ Gmail:** Use senha de aplicativo (App Password)

#### EMAIL_FROM
**Descrição:** Email exibido no campo "De"  
**Valor exemplo:** `noreply@seudominio.com`

---

### ⚙️ Configurações Gerais

#### DEBUG
**Descrição:** Modo debug  
**Valores:** `True` ou `False`  
**Produção:** Sempre `False`

#### ENVIRONMENT
**Descrição:** Ambiente da aplicação  
**Valores:** `development`, `staging`, `production`

---

## 🚀 Como Configurar no Render

### Método 1: Via Dashboard (Recomendado)

1. Acesse seu serviço no Render
2. Vá em **Environment**
3. Clique em **Add Environment Variable**
4. Adicione cada variável:
   - **Key:** `SECRET_KEY`
   - **Value:** `sua-chave-secreta-aqui`
5. Clique em **Save Changes**

### Método 2: Via render.yaml

```yaml
services:
  - type: web
    name: chat-ai-backend
    runtime: python
    envVars:
      - key: SECRET_KEY
        generateValue: true  # Gera automaticamente
      - key: ALLOWED_ORIGINS
        value: https://meu-frontend.onrender.com
      - key: AI_API_KEY
        sync: false  # Pede para adicionar manualmente
```

---

## ✅ Checklist de Variáveis por Serviço

### Backend Principal (backend/)
- ✅ `SECRET_KEY` (obrigatório)
- ⚠️ `ALLOWED_ORIGINS` (recomendado)
- 🔧 `AI_API_KEY` (se usar IA)
- 🔧 `WHATSAPP_API_URL` (se usar WhatsApp)
- 🔧 `GOOGLE_SHEETS_API_KEY` (se usar Sheets)

### Chat IA Backend (chat-ia-backend/)
- ✅ `SECRET_KEY` (obrigatório)
- ✅ `AI_API_KEY` (obrigatório para IA)
- ⚠️ `ALLOWED_ORIGINS` (recomendado)
- 🔧 `UPLOAD_FOLDER`

### Python Backend API (python-backend-api/)
- ✅ `SECRET_KEY` (obrigatório)
- ⚠️ `ALLOWED_ORIGINS` (recomendado)
- 🔧 `DATABASE_URL` (se usar banco)

### Meu Servidor (meu-servidor/)
- 🔧 Sem variáveis obrigatórias
- ⚠️ `ALLOWED_ORIGINS` (se usar CORS)

---

## 🔒 Segurança

### ✅ Boas Práticas

1. **Nunca commite** arquivos `.env` com chaves reais
2. **Use SECRET_KEY forte** (mínimo 32 caracteres)
3. **Especifique ALLOWED_ORIGINS** em produção
4. **Rotacione chaves** regularmente
5. **Use senhas de aplicativo** para email (não senha principal)

### ❌ NÃO Faça

- ❌ Não use `ALLOWED_ORIGINS=*` em produção
- ❌ Não coloque chaves no código fonte
- ❌ Não use `DEBUG=True` em produção
- ❌ Não compartilhe SECRET_KEY publicamente

---

## 🆘 Problemas Comuns

### "SECRET_KEY não definida"
**Solução:** Configure `SECRET_KEY` nas variáveis de ambiente do Render

### "CORS error"
**Solução:** Configure `ALLOWED_ORIGINS` com o domínio do seu frontend

### "AI API error"
**Solução:** Verifique se `AI_API_KEY` está correta e válida

### "Upload failed"
**Solução:** Verifique se `UPLOAD_FOLDER=/tmp/uploads` está configurado

---

## 📚 Recursos

- [Render Environment Variables](https://render.com/docs/environment-variables)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Última atualização:** Janeiro 2026
