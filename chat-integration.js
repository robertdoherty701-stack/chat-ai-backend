// ==================== INTEGRAÇÃO DO CHAT NO APP-PREMIUM ====================
// Este arquivo integra o sistema de chat completo do chat.js no app-premium.html

const API_URL = 'https://chat-ai-backend-1.onrender.com';

const CHAT_TYPES = {
  novos_clientes: { label: '👥 Novos Clientes', icon: 'fa-users' },
  queijo_reino: { label: '🧀 Queijo do Reino', icon: 'fa-cheese' },
  nao_cobertos_clientes: { label: '⚠️ Não Cobertos (Clientes)', icon: 'fa-exclamation-triangle' },
  nao_cobertos_fornecedor: { label: '⚠️ Não Cobertos (Fornecedor)', icon: 'fa-exclamation-circle' },
  msl_danone: { label: '🥛 MSL Danone', icon: 'fa-glass-water' },
  msl_otg: { label: '📦 MSL OTG', icon: 'fa-box' },
  msl_mini: { label: '🎁 MSL Mini', icon: 'fa-gift' },
  msl_super: { label: '⭐ MSL Super', icon: 'fa-star' },
};

const GRAPH_TYPES = {
  column: { label: 'Gráfico de Coluna', icon: 'fa-chart-column' },
  pizza: { label: 'Gráfico de Pizza', icon: 'fa-chart-pie' },
};

// State Manager
class ChatStateManager {
  constructor() {
    this.currentChatType = 'novos_clientes';
    this.messages = [];
    this.isLoading = false;
    this.uploadedFiles = [];
    this.chartHistory = [];
  }

  addMessage(role, content, metadata = {}) {
    this.messages.push({
      id: `msg_${Date.now()}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  clearMessages() {
    this.messages = [];
  }

  addUploadedFile(fileData) {
    this.uploadedFiles.push(fileData);
  }

  removeUploadedFile(fileId) {
    this.uploadedFiles = this.uploadedFiles.filter(f => f.file_id !== fileId);
  }
}

// UI Manager
class ChatUIManager {
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static renderMessage(message) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    const messageEl = document.createElement('div');
    messageEl.className = `message message-${message.role}`;
    messageEl.id = message.id;

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';

    if (message.role === 'user') {
      contentEl.innerHTML = `
        <div class="user-message">
          <p>${this.escapeHtml(message.content)}</p>
          ${message.fileName ? `<small class="file-name">📎 ${message.fileName}</small>` : ''}
        </div>
      `;
    } else {
      contentEl.innerHTML = `
        <div class="ai-message">
          <p>${this.escapeHtml(message.content)}</p>
          ${message.data ? `<div class="message-data">${JSON.stringify(message.data, null, 2)}</div>` : ''}
          ${message.chartUrl ? `<img src="${message.chartUrl}" class="message-chart" alt="Gráfico" style="cursor:pointer;max-width:100%;border-radius:8px;"/>` : ''}
        </div>
      `;
    }

    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    messageEl.appendChild(contentEl);
    messageEl.appendChild(timestamp);
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  static renderChatTypeSelector() {
    const selector = document.getElementById('chat-type-selector');
    if (!selector) return;

    selector.innerHTML = Object.entries(CHAT_TYPES)
      .map(([key, value]) => `
        <button 
          class="chat-type-btn ${key === 'novos_clientes' ? 'active' : ''}" 
          data-chat-type="${key}"
        >
          <span>${value.label}</span>
        </button>
      `)
      .join('');
  }

  static updateChartTypeButtons() {
    const chartContainer = document.getElementById('chart-options');
    if (!chartContainer) return;

    chartContainer.innerHTML = Object.entries(GRAPH_TYPES)
      .map(([key, value]) => `
        <button class="tool-btn" data-graph-type="${key}">
          ${value.label}
        </button>
      `)
      .join('');
  }

  static updateUploadedFilesList(files) {
    const filesList = document.getElementById('uploaded-files-list');
    const filesSection = document.querySelector('.uploaded-files-section');
    
    if (!filesList || !filesSection) return;

    if (files.length === 0) {
      filesSection.style.display = 'none';
      return;
    }

    filesSection.style.display = 'block';
    filesList.innerHTML = files.map(file => `
      <div class="uploaded-file-item">
        <span>📎 ${file.file_name}</span>
        <button class="btn-remove-file" data-file-id="${file.file_id}">🗑️ Remover</button>
      </div>
    `).join('');
  }

  static showLoading() {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    const loadingEl = document.createElement('div');
    loadingEl.id = 'loading-indicator';
    loadingEl.className = 'message message-ai';
    loadingEl.innerHTML = `
      <div class="message-content">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(loadingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  static hideLoading() {
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) loadingEl.remove();
  }
}

// Chat Service
class ChatService {
  constructor() {
    this.state = new ChatStateManager();
    this.token = localStorage.getItem('token');
  }

  async sendMessage(message) {
    if (!message.trim()) return;

    const input = document.getElementById('message-input');
    if (input) input.value = '';

    this.state.addMessage('user', message);
    ChatUIManager.renderMessage(this.state.messages[this.state.messages.length - 1]);

    ChatUIManager.showLoading();

    try {
      const response = await fetch(`${API_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          message,
          chat_type: this.state.currentChatType,
          file_data: this.state.uploadedFiles.length > 0 ? this.state.uploadedFiles[0] : null,
          history: this.state.messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      ChatUIManager.hideLoading();

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      const data = await response.json();
      
      this.state.addMessage('ai', data.response || data.message, {
        data: data.data,
        chartUrl: data.chart_data
      });
      
      ChatUIManager.renderMessage(this.state.messages[this.state.messages.length - 1]);
      
      if (typeof showNotification === 'function') {
        showNotification('Mensagem enviada', 'success');
      }
    } catch (error) {
      ChatUIManager.hideLoading();
      console.error('Erro:', error);
      
      this.state.addMessage('ai', 'Desculpe, ocorreu um erro ao processar sua mensagem.');
      ChatUIManager.renderMessage(this.state.messages[this.state.messages.length - 1]);
      
      if (typeof showNotification === 'function') {
        showNotification('Erro ao enviar mensagem', 'error');
      }
    }
  }

  changeChatType(chatType) {
    this.state.currentChatType = chatType;
    
    document.querySelectorAll('.chat-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-chat-type') === chatType);
    });

    const label = CHAT_TYPES[chatType]?.label || chatType;
    this.state.addMessage('ai', `Modo ${label} ativado. Como posso ajudar?`);
    ChatUIManager.renderMessage(this.state.messages[this.state.messages.length - 1]);
  }

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_type', this.state.currentChatType);

    try {
      const response = await fetch(`${API_URL}/api/chat/upload-excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload');
      }

      const data = await response.json();
      
      this.state.addUploadedFile({
        file_id: data.file_id || Date.now(),
        file_name: file.name,
        ...data
      });

      ChatUIManager.updateUploadedFilesList(this.state.uploadedFiles);
      
      this.state.addMessage('ai', `Arquivo "${file.name}" carregado com sucesso! ${data.rows_count || 0} linhas processadas.`);
      ChatUIManager.renderMessage(this.state.messages[this.state.messages.length - 1]);
      
      if (typeof showNotification === 'function') {
        showNotification('Arquivo carregado', 'success');
      }
    } catch (error) {
      console.error('Erro:', error);
      if (typeof showNotification === 'function') {
        showNotification('Erro ao carregar arquivo', 'error');
      }
    }
  }

  async generateChart(graphType, title, dataColumn, categoryColumn) {
    if (this.state.uploadedFiles.length === 0) {
      if (typeof showNotification === 'function') {
        showNotification('Envie um arquivo Excel primeiro', 'error');
      }
      return;
    }

    ChatUIManager.showLoading();

    try {
      const response = await fetch(`${API_URL}/api/chat/generate-chart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          chart_type: graphType,
          title,
          data_column: dataColumn,
          category_column: categoryColumn,
          file_data: this.state.uploadedFiles[0]
        })
      });

      ChatUIManager.hideLoading();

      if (!response.ok) {
        throw new Error('Erro ao gerar gráfico');
      }

      const data = await response.json();
      
      this.state.addMessage('ai', `Gráfico "${title}" gerado com sucesso!`, {
        chartUrl: data.chart_data
      });
      ChatUIManager.renderMessage(this.state.messages[this.state.messages.length - 1]);
      
      if (typeof showNotification === 'function') {
        showNotification('Gráfico gerado', 'success');
      }
    } catch (error) {
      ChatUIManager.hideLoading();
      console.error('Erro:', error);
      if (typeof showNotification === 'function') {
        showNotification('Erro ao gerar gráfico', 'error');
      }
    }
  }

  async sendWhatsAppMessage(phone, message) {
    try {
      const response = await fetch(`${API_URL}/api/chat/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ phone, message })
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar WhatsApp');
      }

      if (typeof showNotification === 'function') {
        showNotification('Mensagem enviada via WhatsApp', 'success');
      }
    } catch (error) {
      console.error('Erro:', error);
      if (typeof showNotification === 'function') {
        showNotification('Erro ao enviar WhatsApp', 'error');
      }
    }
  }

  clearCache() {
    this.state.clearMessages();
    this.state.uploadedFiles = [];
    
    const container = document.getElementById('messages-container');
    if (container) container.innerHTML = '';
    
    ChatUIManager.updateUploadedFilesList([]);
    
    if (typeof showNotification === 'function') {
      showNotification('Cache limpo', 'info');
    }
  }
}

// Inicialização
function initializeChatSystem() {
  const chatService = new ChatService();

  // Renderiza seletores
  ChatUIManager.renderChatTypeSelector();
  ChatUIManager.updateChartTypeButtons();

  // Enviar mensagem
  const messageForm = document.getElementById('message-form');
  if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('message-input');
      const message = input?.value;
      if (message) {
        await chatService.sendMessage(message);
      }
    });
  }

  // Mudar tipo de chat
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.chat-type-btn');
    if (btn) {
      const chatType = btn.getAttribute('data-chat-type');
      chatService.changeChatType(chatType);
    }
  });

  // Upload de arquivo
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        await chatService.uploadFile(file);
        fileInput.value = '';
      }
    });
  }

  // Remover arquivo
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-file');
    if (btn) {
      const fileId = btn.getAttribute('data-file-id');
      chatService.state.removeUploadedFile(fileId);
      ChatUIManager.updateUploadedFilesList(chatService.state.uploadedFiles);
    }
  });

  // Gerar gráfico
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-graph-type]');
    if (btn) {
      const graphType = btn.getAttribute('data-graph-type');
      const title = prompt('Título do gráfico:');
      const dataColumn = prompt('Coluna de dados:');
      const categoryColumn = prompt('Coluna de categorias (opcional):');

      if (title && dataColumn) {
        chatService.generateChart(graphType, title, dataColumn, categoryColumn || null);
      }
    }
  });

  // WhatsApp
  const whatsappBtn = document.getElementById('send-whatsapp-btn');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', async () => {
      const phone = prompt('Número de telefone (com DDI):');
      const message = prompt('Mensagem:');
      if (phone && message) {
        await chatService.sendWhatsAppMessage(phone, message);
      }
    });
  }

  // Limpar cache
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja limpar o cache?')) {
        chatService.clearCache();
      }
    });
  }

  // Torna disponível globalmente
  window.chatService = chatService;
  window.ChatUIManager = ChatUIManager;
  
  console.log('Sistema de chat inicializado com sucesso!');
}

// Exporta para uso no app-premium.html
if (typeof window !== 'undefined') {
  window.initializeChatSystem = initializeChatSystem;
}
