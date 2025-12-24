// admin-dashboard.js
// Dashboard administrativo com métricas e upload

class AdminDashboard {
    constructor() {
        this.API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:8000' 
            : 'https://sua-api.render.com';
        this.metrics = [];
        this.userRole = 'admin';
    }

    async init() {
        await this.loadMetrics();
        await this.loadUserRole();
        this.render();
    }

    async loadMetrics() {
        try {
            const token = localStorage.getItem('api_token');
            if (!token) return;

            // Carregar métricas da API
            const response = await fetch(`${this.API_URL}/api/metrics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                this.metrics = await response.json();
            }

            // NOVO: Carregar dados do Google Sheets
            await this.loadSheetsData();
        } catch (error) {
            console.error('Erro ao carregar métricas:', error);
        }
    }

    async loadSheetsData() {
        try {
            const token = localStorage.getItem('api_token');
            if (!token) return;

            const response = await fetch(`${this.API_URL}/api/sheets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                this.sheetsData = await response.json();
                console.log('✅ Dados Google Sheets carregados:', this.sheetsData);
            }
        } catch (error) {
            console.error('Erro ao carregar dados sheets:', error);
            this.sheetsData = null;
        }
    }

    async reloadSheets() {
        try {
            const token = localStorage.getItem('api_token');
            if (!token) {
                alert('⚠️ Faça login com backend');
                return;
            }

            const btn = event.target;
            btn.disabled = true;
            btn.textContent = '🔄 Recarregando...';

            const response = await fetch(`${this.API_URL}/api/sheets/reload`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ Planilhas recarregadas!\n\n${JSON.stringify(data.data, null, 2)}`);
                await this.loadSheetsData();
                this.render();
            } else {
                throw new Error('Erro ao recarregar');
            }
        } catch (error) {
            alert('❌ Erro: ' + error.message);
        } finally {
            const btn = event.target;
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🔄 Recarregar Planilhas';
            }
        }
    }

    async viewSheetData(reportId) {
        try {
            const token = localStorage.getItem('api_token');
            if (!token) {
                alert('⚠️ Faça login com backend');
                return;
            }

            const response = await fetch(`${this.API_URL}/api/sheets/${reportId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Exibir em modal ou nova janela
                const preview = data.data.slice(0, 10);
                const headers = Object.keys(preview[0] || {});
                
                let html = `
                    <div style="max-width: 900px; margin: 20px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                        <h2 style="margin-bottom: 20px; color: #1F2937;">${data.label}</h2>
                        <p style="color: #64748B; margin-bottom: 20px;">Total: ${data.rows} registros</p>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background: #F3F4F6;">
                                        ${headers.map(h => `<th style="padding: 12px; text-align: left; border: 1px solid #E5E7EB;">${h}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${preview.map(row => `
                                        <tr style="border-bottom: 1px solid #E5E7EB;">
                                            ${headers.map(h => `<td style="padding: 12px; border: 1px solid #E5E7EB;">${row[h] || '-'}</td>`).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <p style="color: #64748B; margin-top: 15px; font-size: 12px;">Exibindo primeiros 10 registros</p>
                        <button onclick="this.parentElement.remove()" style="margin-top: 20px; background: #DC2626; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Fechar</button>
                    </div>
                `;
                
                const modal = document.createElement('div');
                modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; overflow: auto; padding: 20px;';
                modal.innerHTML = html;
                document.body.appendChild(modal);
            }
        } catch (error) {
            alert('❌ Erro ao visualizar: ' + error.message);
        }
    }

    async loadUserRole() {
        try {
            const token = localStorage.getItem('api_token');
            if (!token) {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                this.userRole = user.role || 'user';
                return;
            }

            const response = await fetch(`${this.API_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.userRole = data.role;
            }
        } catch (error) {
            console.error('Erro ao carregar role:', error);
        }
    }

    async uploadFile(file) {
        try {
            const token = localStorage.getItem('api_token');
            if (!token) {
                alert('⚠️ Faça login com backend para usar upload');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.API_URL}/api/upload/excel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ Planilha enviada com sucesso!\n\n${data.rows} linhas\n${data.columns.length} colunas`);
                await this.loadMetrics();
                this.render();
            } else {
                throw new Error('Erro no upload');
            }
        } catch (error) {
            alert('❌ Erro ao enviar planilha: ' + error.message);
        }
    }

    renderMetricsChart() {
        if (!this.metrics || this.metrics.length === 0) {
            return '<p style="text-align: center; color: #64748B; padding: 40px;">Nenhuma métrica disponível</p>';
        }

        const maxValue = Math.max(...this.metrics.map(m => m.total || 0));
        
        let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 20px;">';
        
        this.metrics.forEach(item => {
            const percentage = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
            html += `
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="font-weight: 600; color: #1F2937;">${item.name}</span>
                        <span style="font-weight: 700; color: #DC2626;">${item.total}</span>
                    </div>
                    <div style="background: #E5E7EB; border-radius: 8px; height: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #DC2626, #EF4444); height: 100%; width: ${percentage}%; transition: width 0.5s;"></div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    render() {
        const container = document.getElementById('dashboardSection');
        if (!container) return;

        const isAdmin = this.userRole === 'admin';
        const isVendedor = this.userRole === 'vendedor';

        container.innerHTML = `
            <div style="padding: 24px;">
                <h1 style="font-size: 28px; font-weight: 800; margin-bottom: 24px; color: #1F2937;">
                    📊 Painel Administrativo
                </h1>

                <!-- Cards Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 32px;">
                    
                    ${isAdmin ? `
                    <!-- Upload Card -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="background: #FEE2E2; padding: 12px; border-radius: 10px;">
                                <svg width="24" height="24" fill="#DC2626" viewBox="0 0 24 24">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                            </div>
                            <div style="flex: 1;">
                                <p style="font-size: 14px; color: #64748B; margin-bottom: 8px;">Upload de Arquivo</p>
                                <input type="file" id="uploadInput" accept=".xlsx,.xls,.csv" 
                                    style="display: none;">
                                <button onclick="document.getElementById('uploadInput').click()" 
                                    style="width: 100%; padding: 8px 16px; background: #DC2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
                                    📎 Escolher Arquivo
                                </button>
                                <p id="fileName" style="font-size: 11px; color: #64748B; margin-top: 6px; min-height: 16px;"></p>
                            </div>
                            <script>
                                document.getElementById('uploadInput').addEventListener('change', function(e) {
                                    const fileName = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
                                    document.getElementById('fileName').textContent = fileName;
                                });
                            </script>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Relatórios Card -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="background: #DBEAFE; padding: 12px; border-radius: 10px;">
                                <svg width="24" height="24" fill="#2563EB" viewBox="0 0 24 24">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                            </div>
                            <div style="flex: 1;">
                                <p style="font-size: 14px; color: #64748B; margin-bottom: 8px;">Relatórios</p>
                                <button onclick="navigateTo(null, 'relatorios')" 
                                    style="background: #2563EB; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                                    Visualizar
                                </button>
                            </div>
                        </div>
                    </div>

                    ${!isVendedor ? `
                    <!-- Usuários Card -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="background: #D1FAE5; padding: 12px; border-radius: 10px;">
                                <svg width="24" height="24" fill="#059669" viewBox="0 0 24 24">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <div style="flex: 1;">
                                <p style="font-size: 14px; color: #64748B; margin-bottom: 8px;">Usuários</p>
                                <button onclick="alert('Funcionalidade em desenvolvimento')" 
                                    style="background: #059669; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                                    Gerenciar
                                </button>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Métricas Card -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="background: #FEF3C7; padding: 12px; border-radius: 10px;">
                                <svg width="24" height="24" fill="#D97706" viewBox="0 0 24 24">
                                    <line x1="12" y1="20" x2="12" y2="10"></line>
                                    <line x1="18" y1="20" x2="18" y2="4"></line>
                                    <line x1="6" y1="20" x2="6" y2="16"></line>
                                </svg>
                            </div>
                            <div style="flex: 1;">
                                <p style="font-size: 14px; color: #64748B; margin-bottom: 4px;">Métricas</p>
                                <p style="font-size: 24px; font-weight: 700; color: #DC2626;">${this.metrics.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Google Sheets Cards -->
                ${this.sheetsData ? `
                <div style="margin-bottom: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h2 style="font-size: 20px; font-weight: 700; color: #1F2937;">
                            📊 Google Sheets
                        </h2>
                        <button onclick="window.adminDashboard.reloadSheets()" 
                            style="background: #2563EB; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            🔄 Recarregar Planilhas
                        </button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                        ${this.sheetsData.sheets.map(sheet => `
                            <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB; transition: transform 0.2s; cursor: pointer;" 
                                onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';"
                                onclick="window.adminDashboard.viewSheetData('${sheet.id}')">
                                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                                    <div style="background: ${sheet.has_data ? '#D1FAE5' : '#FEE2E2'}; padding: 12px; border-radius: 10px;">
                                        <svg width="24" height="24" fill="${sheet.has_data ? '#059669' : '#DC2626'}" viewBox="0 0 24 24">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                        </svg>
                                    </div>
                                    <div style="flex: 1;">
                                        <h3 style="font-size: 16px; font-weight: 700; color: #1F2937; margin-bottom: 4px;">${sheet.label}</h3>
                                        <p style="font-size: 12px; color: #64748B;">ID: ${sheet.id}</p>
                                    </div>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #E5E7EB;">
                                    <div>
                                        <p style="font-size: 13px; color: #64748B; margin-bottom: 4px;">Registros</p>
                                        <p style="font-size: 24px; font-weight: 700; color: ${sheet.has_data ? '#059669' : '#DC2626'};">${sheet.rows}</p>
                                    </div>
                                    <div style="text-align: right;">
                                        <p style="font-size: 13px; color: #64748B; margin-bottom: 4px;">Tipo</p>
                                        <p style="font-size: 12px; font-weight: 600; color: #1F2937;">${sheet.type}</p>
                                    </div>
                                </div>
                                
                                <div style="margin-top: 12px;">
                                    <p style="font-size: 11px; color: #64748B; margin-bottom: 6px;">Keywords:</p>
                                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                        ${sheet.keywords.map(kw => `
                                            <span style="background: #F3F4F6; color: #4B5563; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                                                ${kw}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                                
                                <div style="margin-top: 16px;">
                                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: ${sheet.has_data ? '#D1FAE5' : '#FEE2E2'}; border-radius: 6px;">
                                        <span style="font-size: 16px;">${sheet.has_data ? '✅' : '⚠️'}</span>
                                        <span style="font-size: 12px; font-weight: 600; color: ${sheet.has_data ? '#059669' : '#DC2626'};">
                                            ${sheet.has_data ? 'Dados carregados' : 'Sem dados'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Chart Card -->
                <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB;">
                    <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #1F2937;">
                        📈 Visão Geral
                    </h2>
                    ${this.renderMetricsChart()}
                </div>
            </div>
        `;

        // Adicionar event listener para upload
        if (isAdmin) {
            const uploadInput = document.getElementById('uploadInput');
            if (uploadInput) {
                uploadInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) this.uploadFile(file);
                });
            }
        }
    }
}

// Inicializar dashboard quando a página carregar
window.adminDashboard = new AdminDashboard();
