import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ==================== CONFIGURAÇÕES ====================
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000');

// ==================== CLIENTE HTTP ====================
class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.accessToken = null;
    this.refreshToken = null;

    // Interceptor para adicionar token em requisições
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para renovar token
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
          originalRequest._retry = true;
          try {
            const response = await this.refreshAccessToken();
            return this.client(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // ==================== AUTENTICAÇÃO ====================
  async register(email, password, name) {
    try {
      const response = await this.client.post('/auth/register', {
        email,
        password,
        name,
      });
      console.log('✅ Usuário registrado com sucesso');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao registrar:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const response = await this.client.post('/auth/login', {
        email,
        password,
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('refreshToken', this.refreshToken);

      console.log('✅ Login bem-sucedido');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await this.client.post('/auth/refresh', {
        refresh_token: this.refreshToken,
      });

      this.accessToken = response.data.access_token;
      localStorage.setItem('accessToken', this.accessToken);

      console.log('✅ Token renovado com sucesso');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao renovar token:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      console.log('✅ Logout bem-sucedido');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error.message);
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/auth/me');
      console.log('✅ Dados do usuário obtidos');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao obter usuário:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async updateProfile(name, email) {
    try {
      const response = await this.client.patch('/auth/me', {
        name,
        email,
      });
      console.log('✅ Perfil atualizado com sucesso');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  // ==================== CHAT COM IA ====================
  async sendChatMessage(chatType, message, fileName = null) {
    try {
      const response = await this.client.post('/chat/message', {
        chat_type: chatType,
        message,
        file_name: fileName,
      });
      console.log(`✅ Mensagem enviada para ${chatType}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async uploadExcelFile(filePath, chatType) {
    try {
      const formData = new FormData();
      const file = await import('fs').then((fs) => fs.readFileSync(filePath));
      formData.append('file', new Blob([file]), filePath.split('/').pop());

      const response = await this.client.post('/chat/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('✅ Arquivo Excel enviado');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar arquivo:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async generateChart(chatType, graphType, title, dataColumn, categoryColumn = null, rows = null, storedFile = null) {
    try {
      const payload = {
        graph_type: graphType,
        title,
        data_column: dataColumn,
        category_column: categoryColumn,
        stored_file: storedFile,
        rows: rows
      };

      // opcional: se quiser manter contexto do tipo de chat no backend
      if (chatType) payload.chat_type = chatType;

      const response = await this.client.post('/chat/generate-chart', payload);

      // retorna URL absoluta para o frontend
      const chartUrl = response.data.chart_url;
      const absoluteUrl = new URL(chartUrl, this.client.defaults.baseURL).href;

      console.log(`✅ Gráfico de ${graphType} gerado: ${absoluteUrl}`);
      return { ...response.data, chart_url: absoluteUrl };
    } catch (error) {
      console.error('❌ Erro ao gerar gráfico:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async sendWhatsAppMessage(phoneNumber, message, mediaUrl = null) {
    try {
      const response = await this.client.post('/chat/send-whatsapp', {
        phone_number: phoneNumber,
        message,
        media_url: mediaUrl,
      });
      console.log('✅ Mensagem WhatsApp enviada');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar WhatsApp:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async getChatHistory() {
    try {
      const response = await this.client.get('/chat/history');
      console.log(`✅ Histórico obtido: ${response.data.total} mensagem(s)`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao obter histórico:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async clearChatCache(chatType) {
    try {
      const response = await this.client.post(`/chat/clear-cache/${chatType}`);
      console.log('✅ Cache limpo');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  // ==================== UPLOAD DE ARQUIVOS ====================
  async uploadFile(filePath) {
    try {
      const formData = new FormData();
      const file = await import('fs').then((fs) => fs.readFileSync(filePath));
      formData.append('file', new Blob([file]), filePath.split('/').pop());

      const response = await this.client.post('/upload/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('✅ Arquivo enviado com sucesso');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao fazer upload:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async uploadMultipleFiles(filePaths) {
    try {
      const formData = new FormData();
      for (const filePath of filePaths) {
        const file = await import('fs').then((fs) => fs.readFileSync(filePath));
        formData.append('files', new Blob([file]), filePath.split('/').pop());
      }

      const response = await this.client.post('/upload/upload-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log(`✅ ${response.data.successful} arquivo(s) enviado(s) com sucesso`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao fazer upload múltiplo:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async listUserFiles(fileType = null) {
    try {
      const params = fileType ? { file_type: fileType } : {};
      const response = await this.client.get('/upload/files', { params });
      console.log(`✅ ${response.data.total_files} arquivo(s) listado(s)`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async getFileInfo(fileId) {
    try {
      const response = await this.client.get(`/upload/file/${fileId}`);
      console.log('✅ Informações do arquivo obtidas');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao obter informações:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async downloadFile(fileId) {
    try {
      const response = await this.client.get(`/upload/download/${fileId}`);
      console.log('✅ Download disponível');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao fazer download:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      const response = await this.client.delete(`/upload/file/${fileId}`);
      console.log('✅ Arquivo deletado');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao deletar arquivo:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async getStorageStats() {
    try {
      const response = await this.client.get('/upload/storage-stats');
      console.log('✅ Estatísticas de armazenamento obtidas');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async verifyFileChecksum(fileId) {
    try {
      const response = await this.client.post(`/upload/verify-checksum/${fileId}`);
      console.log(`✅ Checksum ${response.data.is_valid ? 'válido' : 'inválido'}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao verificar checksum:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  // ==================== ADMINISTRAÇÃO ====================
  async listAllUsers(role = null, isActive = null, limit = 100, offset = 0) {
    try {
      const params = { limit, offset };
      if (role) params.role = role;
      if (isActive !== null) params.is_active = isActive;

      const response = await this.client.get('/admin/users', { params });
      console.log(`✅ ${response.data.total} usuário(s) listado(s)`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao listar usuários:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async updateUserRole(userId, newRole) {
    try {
      const response = await this.client.patch('/admin/user/role', {
        user_id: userId,
        new_role: newRole,
      });
      console.log('✅ Permissão atualizada');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar permissão:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async updateUserStatus(userId, isActive, reason = null) {
    try {
      const response = await this.client.patch('/admin/user/status', {
        user_id: userId,
        is_active: isActive,
        reason,
      });
      console.log('✅ Status do usuário atualizado');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async getAuditTrail(action = null, limit = 100) {
    try {
      const params = { limit };
      if (action) params.action = action;

      const response = await this.client.get('/admin/audit-trail', { params });
      console.log(`✅ ${response.data.total} registro(s) de auditoria`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao obter auditoria:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async getSystemLogs(level = null, component = null, limit = 100) {
    try {
      const params = { limit };
      if (level) params.level = level;
      if (component) params.component = component;

      const response = await this.client.get('/admin/logs', { params });
      console.log(`✅ ${response.data.total} log(s) obtido(s)`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao obter logs:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async getAdminDashboard() {
    try {
      const response = await this.client.get('/admin/dashboard');
      console.log('✅ Dashboard administrativo carregado');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async getSystemSettings() {
    try {
      const response = await this.client.get('/admin/settings');
      console.log('✅ Configurações obtidas');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao obter configurações:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async updateSystemSettings(settings) {
    try {
      const response = await this.client.patch('/admin/settings', settings);
      console.log('✅ Configurações atualizadas');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar configurações:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async createBackup() {
    try {
      const response = await this.client.post('/admin/backup');
      console.log('✅ Backup criado');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async listBackups() {
    try {
      const response = await this.client.get('/admin/backups');
      console.log(`✅ ${response.data.total} backup(s) listado(s)`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao listar backups:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async enableMaintenanceMode() {
    try {
      const response = await this.client.post('/admin/maintenance');
      console.log('✅ Modo manutenção ativado');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao ativar manutenção:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async disableMaintenanceMode() {
    try {
      const response = await this.client.post('/admin/maintenance/disable');
      console.log('✅ Modo manutenção desativado');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao desativar manutenção:', error.response?.data?.detail || error.message);
      throw error;
    }
  }

  async generateReport(reportType, startDate = null, endDate = null) {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await this.client.get(`/admin/report/${reportType}`, { params });
      console.log(`✅ Relatório ${reportType} gerado`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error.response?.data?.detail || error.message);
      throw error;
    }
  }
}

// ==================== EXPORTAR ====================
export default APIClient;

// ==================== EXEMPLOS DE USO ====================
import APIClient from './index.js';

const api = new APIClient();

// Login
await api.login('user@example.com', 'Senha@123');

// Enviar mensagem de chat
await api.sendChatMessage('novos_clientes', 'Quais são os novos clientes?');

// Gerar gráfico
await api.generateChart('queijo_reino', 'column', 'Vendas', 'valor');

// Upload de arquivo
await api.uploadFile('./dados.xlsx');

// Admin: listar usuários
await api.listAllUsers();