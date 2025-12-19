# 🔗 Integração Frontend + Backend

Guia para conectar o frontend (index.html) com o backend FastAPI.

## 🎯 Opções de Integração

### Opção 1: Modo Híbrido (Recomendado)
- Frontend continua usando Google Sheets para leitura rápida
- Backend usado apenas para funcionalidades avançadas:
  - Autenticação JWT
  - Exportação PDF/Excel
  - Histórico de consultas
  - WhatsApp

### Opção 2: Modo Completo
- Frontend faz TODAS as requisições para o backend
- Backend busca dados do Google Sheets ou banco de dados
- Mais seguro e centralizado

## 📝 Exemplo de Código

### 1. Adicionar Configuração da API

```javascript
// No início do index.html, adicionar:
const API_URL = 'http://localhost:8000';  // ou URL de produção
let authToken = localStorage.getItem('api_token');

// Função helper para requisições
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });
    
    if (!response.ok) {
        throw new Error(await response.text());
    }
    
    return response.json();
}
```

### 2. Login com Backend

```javascript
async function doLoginAPI() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        authToken = data.token;
        localStorage.setItem('api_token', authToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        currentUser = data.user;
        showMainApp();
        
    } catch (error) {
        alert('Erro no login: ' + error.message);
    }
}
```

### 3. Exportar Relatório

```javascript
async function exportarRelatorio(tipo, codvd, vendedor, formato = 'excel') {
    try {
        const response = await fetch(`${API_URL}/api/relatorios/gerar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                tipo,
                codvd,
                vendedor,
                exportar: formato  // 'excel' ou 'pdf'
            })
        });
        
        if (!response.ok) throw new Error('Erro ao gerar relatório');
        
        // Download do arquivo
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${tipo}_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}
```

### 4. Adicionar Botões de Exportação

```javascript
// Adicionar no modal de relatórios:
function adicionarBotoesExportacao(reportId) {
    const modal = document.getElementById('reportModal');
    const header = modal.querySelector('div[style*="display: flex"]');
    
    // Botão Excel
    const btnExcel = document.createElement('button');
    btnExcel.innerHTML = '📥 Excel';
    btnExcel.onclick = () => exportarRelatorio(reportId, codvd, vendedor, 'excel');
    btnExcel.style.cssText = `...`;  // mesmo estilo dos outros botões
    
    // Botão PDF
    const btnPDF = document.createElement('button');
    btnPDF.innerHTML = '📄 PDF';
    btnPDF.onclick = () => exportarRelatorio(reportId, codvd, vendedor, 'pdf');
    btnPDF.style.cssText = `...`;
    
    header.insertBefore(btnPDF, header.lastChild);
    header.insertBefore(btnExcel, header.lastChild);
}
```

### 5. Histórico de Consultas

```javascript
async function carregarHistorico() {
    try {
        const data = await apiRequest('/api/historico');
        
        const historico = data.historico;
        let html = '<h3>Histórico de Consultas</h3>';
        html += '<table class="stats-table">';
        html += '<tr><th>Data</th><th>Tipo</th><th>CODVD</th><th>Vendedor</th><th>Registros</th></tr>';
        
        historico.forEach(item => {
            html += `<tr>
                <td>${new Date(item.timestamp).toLocaleString('pt-BR')}</td>
                <td>${item.tipo}</td>
                <td>${item.codvd}</td>
                <td>${item.vendedor}</td>
                <td>${item.registros}</td>
            </tr>`;
        });
        
        html += '</table>';
        document.getElementById('historicoContainer').innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}
```

## 🚀 Iniciar Backend

```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend
cd ..
python -m http.server 8080
```

Acesse:
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- Documentação: http://localhost:8000/docs

## 🔒 Segurança

1. Em produção, use HTTPS
2. Configure CORS com domínios específicos
3. Use refresh tokens
4. Implemente rate limiting
5. Valide todos os inputs

## 📦 Deploy Completo

### Backend (Render/Railway)
1. Push código para GitHub
2. Conecte repositório
3. Configure variáveis de ambiente
4. Deploy automático

### Frontend (GitHub Pages)
- Continua funcionando como está
- Atualizar API_URL para URL de produção

## ⚡ Performance

- Use cache para dados frequentes
- Implemente paginação
- Comprima arquivos grandes
- Use CDN para assets estáticos

## 🆘 Troubleshooting

**CORS Error?**
- Verifique allow_origins no backend
- Use proxy em desenvolvimento

**Token Inválido?**
- Verificar se token está sendo enviado
- Checar expiração (60 min)

**Arquivo não encontrado?**
- Fazer upload das planilhas primeiro
- Verificar estrutura de diretórios
