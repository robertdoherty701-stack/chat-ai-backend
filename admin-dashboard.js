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

            const response = await fetch(`${this.API_URL}/api/metrics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                this.metrics = await response.json();
            }
        } catch (error) {
            console.error('Erro ao carregar métricas:', error);
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
                                <p style="font-size: 14px; color: #64748B; margin-bottom: 8px;">Upload Planilha</p>
                                <input type="file" id="uploadInput" accept=".xlsx,.xls,.csv" 
                                    style="font-size: 12px; padding: 6px 12px; border: 1px solid #DC2626; border-radius: 6px; cursor: pointer;">
                            </div>
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
