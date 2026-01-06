#!/bin/bash

# Script de Deploy dos 5 Serviços no Render
# Execute: chmod +x deploy-all-services.sh && ./deploy-all-services.sh

echo "🚀 Deploy dos 5 Serviços no Render"
echo "===================================="
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "DEPLOY_5_SERVICES.md" ]; then
    echo -e "${RED}❌ Execute este script na raiz do projeto!${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Serviços que serão deployados:${NC}"
echo "1. Backend Principal (backend/)"
echo "2. Chat IA Backend (chat-ia-backend/)"
echo "3. Python Backend API (python-backend-api/)"
echo "4. Servidor Node (meu-servidor/)"
echo "5. Admin Dashboard (admin-dashboard/)"
echo ""

read -p "Continuar com o deploy? (s/n): " confirm
if [ "$confirm" != "s" ]; then
    echo "Deploy cancelado."
    exit 0
fi

echo ""
echo -e "${BLUE}📝 Verificando configurações...${NC}"

# Verificar se os arquivos render.yaml existem
services=("backend" "chat-ia-backend" "python-backend-api" "meu-servidor" "admin-dashboard")
for service in "${services[@]}"; do
    if [ -f "$service/render.yaml" ]; then
        echo -e "${GREEN}✅ $service/render.yaml encontrado${NC}"
    else
        echo -e "${RED}❌ $service/render.yaml NÃO encontrado!${NC}"
        echo "Execute primeiro: criar os arquivos render.yaml"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}✅ Todas as configurações OK!${NC}"
echo ""
echo -e "${BLUE}📦 Próximos passos:${NC}"
echo ""
echo "1. Commit e push para o GitHub:"
echo "   git add ."
echo "   git commit -m \"Add: Configuração dos 5 serviços para Render\""
echo "   git push origin main"
echo ""
echo "2. Acesse o Render Dashboard: https://dashboard.render.com"
echo ""
echo "3. Para cada serviço, clique em 'New +' → 'Web Service' e:"
echo ""
echo "   📌 Serviço 1: Backend Principal"
echo "   - Name: chat-backend-main"
echo "   - Root Directory: backend"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: uvicorn app:app --host 0.0.0.0 --port \$PORT"
echo ""
echo "   📌 Serviço 2: Chat IA Backend"
echo "   - Name: chat-ia-backend"
echo "   - Root Directory: chat-ia-backend"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: gunicorn -w 4 -b 0.0.0.0:\$PORT \"app:create_app()\""
echo ""
echo "   📌 Serviço 3: Python Backend API"
echo "   - Name: python-backend-api"
echo "   - Root Directory: python-backend-api"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: uvicorn src.main:app --host 0.0.0.0 --port \$PORT"
echo ""
echo "   📌 Serviço 4: Servidor Node"
echo "   - Name: meu-servidor-node"
echo "   - Root Directory: meu-servidor"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo ""
echo "   📌 Serviço 5: Admin Dashboard (Static Site)"
echo "   - Name: admin-dashboard"
echo "   - Root Directory: admin-dashboard"
echo "   - Build Command: npm install && npm run build"
echo "   - Publish Directory: dist"
echo ""
echo "4. Anote as URLs de cada serviço após o deploy"
echo ""
echo "5. Execute o script de atualização do frontend:"
echo "   ./update-frontend-urls.sh"
echo ""
echo -e "${GREEN}✨ Configuração concluída!${NC}"
