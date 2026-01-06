# 🚀 Chat IA Backend - API Enterprise

Backend FastAPI completo com JWT, histórico, exportação e WhatsApp.

## 📋 Funcionalidades

- ✅ **Autenticação JWT** - Login seguro com tokens
- ✅ **Relatórios Inteligentes** - Filtros por CODVD e Vendedor
- ✅ **Exportação Multi-formato** - JSON, Excel, PDF
- ✅ **Histórico de Consultas** - Rastreamento completo
- ✅ **Upload de Planilhas** - Gerenciamento de dados
- ✅ **WhatsApp Integration** - Envio de notificações
- ✅ **CORS** - Pronto para frontend React/Vue/Angular

## 🛠️ Instalação

### Opção 1: Local

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```

### Opção 2: Docker

```bash
cd ..
docker-compose up -d
```

## 🌐 Endpoints

### Autenticação

**POST /api/auth/login**
```json
{
  "email": "admin@teste.com",
  "password": "123456"
}
```

**POST /api/auth/register**
```json
{
  "email": "novo@email.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

**GET /api/auth/me**
```
Header: Authorization: Bearer {token}
```

### Relatórios

**POST /api/relatorios/gerar**
```json
{
  "tipo": "msl_super",
  "codvd": "123",
  "vendedor": "João Silva",
  "exportar": "json"  // ou "excel" ou "pdf"
}
```

### Upload

**POST /api/upload/excel**
```
Content-Type: multipart/form-data
file: arquivo.xlsx
Header: Authorization: Bearer {token}
```

### Histórico

**GET /api/historico**
```
Header: Authorization: Bearer {token}
```

### WhatsApp

**POST /api/whatsapp/enviar**
```json
{
  "telefone": "+5511999999999",
  "mensagem": "Seu relatório está pronto!"
}
```

## 📊 Tipos de Relatórios Suportados

- `nao_cobertos_clientes` - Não Cobertos (Cliente)
- `nao_cobertos_fornecedor` - Não Cobertos (Fornecedor)
- `msl_mini` - MSL Mini
- `msl_super` - MSL Super
- `msl_otg` - MSL OTG
- `msl_danone` - MSL Danone
- `exp` - Expositor
- `novos_clientes` - Novos Clientes
- `queijo_reino` - Queijo do Reino

## 🔐 Usuários Padrão

| Email | Senha | Role |
|-------|-------|------|
| admin@teste.com | 123456 | admin |
| teste@teste.com | 123456 | user |
| nathiely@empresa.com | Nathiely@2025 | admin |
| roberto.felix@empresa.com | Roberto@2025 | admin |

## 📁 Estrutura de Dados

```
backend/
├── app.py              # Aplicação principal
├── requirements.txt    # Dependências
├── Dockerfile         # Container Docker
├── .env.example       # Variáveis de ambiente
└── data/              # Dados persistentes
    ├── uploads/       # Planilhas enviadas
    ├── exports/       # Arquivos gerados
    └── logs.csv       # Histórico
```

## 🧪 Testes

```bash
# Testar health check
curl http://localhost:8000/health

# Testar login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teste.com","password":"123456"}'
```

## 🚀 Deploy

### Render.com

1. Conecte seu repositório GitHub
2. Crie novo Web Service
3. Build Command: `cd backend && pip install -r requirements.txt`
4. Start Command: `cd backend && uvicorn app:app --host 0.0.0.0 --port $PORT`

### Heroku

```bash
heroku create chat-ia-backend
git push heroku main
```

### Railway

```bash
railway init
railway up
```

## 📝 Notas

- Em produção, use PostgreSQL em vez de dicionário de usuários
- Configure HTTPS e domínio próprio
- Adicione rate limiting para segurança
- Implemente refresh tokens para sessões longas
- Use variáveis de ambiente para secrets

## 🆘 Suporte

Problemas? Abra uma issue no GitHub!
