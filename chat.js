import APIClient from './index.js';

// ==================== CONFIGURAÇÕES ====================
const API_CLIENT = new APIClient();

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

// ==================== STATE MANAGER ====================
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

  addChart(chartData) {
    this.chartHistory.push({
      id: `chart_${Date.now()}`,
      ...chartData,
    });
  }

  getState() {
    return {
      currentChatType: this.currentChatType,
      messagesCount: this.messages.length,
      filesCount: this.uploadedFiles.length,
      chartsCount: this.chartHistory.length,
    };
  }
}

// ==================== UI MANAGER ====================
class ChatUIManager {
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

    const timestampEl = document.createElement('small');
    timestampEl.className = 'message-timestamp';
    timestampEl.textContent = new Date(message.timestamp).toLocaleTimeString('pt-BR');

    messageEl.appendChild(contentEl);
    messageEl.appendChild(timestampEl);
    messagesContainer.appendChild(messageEl);

    // Scroll para o final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static showLoadingIndicator() {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    const loadingEl = document.createElement('div');
    loadingEl.className = 'message message-ai loading';
    loadingEl.id = 'loading-indicator';
    loadingEl.innerHTML = `
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    messagesContainer.appendChild(loadingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  static removeLoadingIndicator() {
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) {
      loadingEl.remove();
    }
  }

  static showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'alert alert-danger alert-dismissible fade show';
    errorEl.innerHTML = `
      <strong>⚠️ Erro:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
      chatHeader.parentElement.insertBefore(errorEl, chatHeader.nextSibling);
    }

    setTimeout(() => {
      errorEl.remove();
    }, 5000);
  }

  static showSuccess(message) {
    const successEl = document.createElement('div');
    successEl.className = 'alert alert-success alert-dismissible fade show';
    successEl.innerHTML = `
      <strong>✅ Sucesso:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
      chatHeader.parentElement.insertBefore(successEl, chatHeader.nextSibling);
    }

    setTimeout(() => {
      successEl.remove();
    }, 3000);
  }

  static updateUploadedFilesList(files) {
    const filesList = document.getElementById('uploaded-files-list');
    if (!filesList) return;

    filesList.innerHTML = files
      .map(
        file => `
      <div class="uploaded-file-item">
        <span>📄 ${file.file_name}</span>
        <button class="btn-remove-file" data-file-id="${file.file_id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `
      )
      .join('');
  }

  static updateChartTypeButtons() {
    const chartContainer = document.getElementById('chart-options');
    if (!chartContainer) return;

    chartContainer.innerHTML = Object.entries(GRAPH_TYPES)
      .map(
        ([key, value]) => `
      <button class="btn btn-outline-secondary btn-sm" data-graph-type="${key}">
        <i class="fas ${value.icon}"></i> ${value.label}
      </button>
    `
      )
      .join('');
  }

  static renderChatTypeSelector() {
    const selector = document.getElementById('chat-type-selector');
    if (!selector) return;

    selector.innerHTML = Object.entries(CHAT_TYPES)
      .map(
        ([key, value]) => `
      <button 
        class="chat-type-btn ${key === 'novos_clientes' ? 'active' : ''}" 
        data-chat-type="${key}"
        title="${value.label}"
      >
        <i class="fas ${value.icon}"></i>
        <span>${value.label}</span>
      </button>
    `
      )
      .join('');
  }

  // Modal para visualização de gráficos (criado dinamicamente)
  static _createChartModal() {
    if (document.getElementById('chart-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'chart-modal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    `;
    
    modal.innerHTML = `
      <div id="chart-modal-inner" style="
        max-width: 90%;
        max-height: 90%;
        background: #fff;
        border-radius: 10px;
        padding: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      ">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
          <button id="chart-modal-close" style="
            background: #ff6b6b;
            color: #fff;
            border: none;
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
          ">✕ Fechar</button>
        </div>
        <div style="overflow: auto; max-height: 80vh;">
          <img id="chart-modal-img" src="" alt="Gráfico" style="
            width: 100%;
            height: auto;
            border-radius: 6px;
            display: block;
          " />
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('#chart-modal-close').addEventListener('click', () => {
      modal.style.display = 'none';
      modal.querySelector('#chart-modal-img').src = '';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.querySelector('#chart-modal-img').src = '';
      }
    });
  }

  static showChartModal(url) {
    this._createChartModal();
    const modal = document.getElementById('chart-modal');
    const img = modal.querySelector('#chart-modal-img');
    img.src = url;
    modal.style.display = 'flex';
  }
}

// ==================== CHAT SERVICE ====================
class ChatService {
  constructor() {
    this.state = new ChatStateManager();
  }

  async sendMessage(message, fileName = null) {
    if (!message || !message.trim()) {
      ChatUIManager.showError('Mensagem vazia');
      return;
    }

    // Adiciona mensagem do usuário
    this.state.addMessage('user', message, { fileName });
    ChatUIManager.renderMessage(this.state.messages[this.state.messages.length - 1]);

    // Limpa input
    const input = document.getElementById('message-input');
    if (input) input.value = '';

    // Mostra indicador de carregamento
    ChatUIManager.showLoadingIndicator();
    this.state.isLoading = true;

    try {
      const response = await API_CLIENT.sendChatMessage(
        this.state.currentChatType,
        message,
        fileName
      );

      ChatUIManager.removeLoadingIndicator();

      // Adiciona resposta da IA
      this.state.addMessage('ai', response.message, {
        data: response.data,
        chartUrl: response.chart_url,
      });

      ChatUIManager.renderMessage(this.state.messages[this.state.messages.length - 1]);
    } catch (error) {
      ChatUIManager.removeLoadingIndicator();
      ChatUIManager.showError(error.response?.data?.detail || 'Erro ao processar mensagem');
      console.error(error);
    } finally {
      this.state.isLoading = false;
    }
  }

  async uploadFile(file) {
    if (!file) {
      ChatUIManager.showError('Arquivo não selecionado');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    ChatUIManager.showLoadingIndicator();

    try {
      const response = await API_CLIENT.client.post('/upload/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      ChatUIManager.removeLoadingIndicator();

      this.state.addUploadedFile({
        file_id: response.data.metadata?.checksum || `file_${Date.now()}`,
        file_name: file.name,
        upload_date: new Date().toISOString(),
        stored_name: response.data.metadata?.stored_name,
      });

      ChatUIManager.updateUploadedFilesList(this.state.uploadedFiles);
      ChatUIManager.showSuccess(`Arquivo "${file.name}" enviado com sucesso`);
    } catch (error) {
      ChatUIManager.removeLoadingIndicator();
      ChatUIManager.showError('Erro ao fazer upload do arquivo');
      console.error(error);
    }
  }

  async generateChart(graphType, title, dataColumn, categoryColumn = null, rows = null, storedFile = null) {
    if (!graphType || !title || !dataColumn) {
      ChatUIManager.showError('Preencha: tipo, título e coluna de dados');
      return;
    }

    ChatUIManager.showLoadingIndicator();

    try {
      const response = await API_CLIENT.generateChart(
        this.state.currentChatType,
        graphType,
        title,
        dataColumn,
        categoryColumn,
        rows,
        storedFile
      );

      ChatUIManager.removeLoadingIndicator();

      this.state.addChart({
        type: graphType,
        title: title,
        url: response.chart_url,
        timestamp: new Date().toISOString(),
      });

      // Adiciona gráfico como mensagem
      this.state.addMessage('ai', `📊 Gráfico gerado: ${title}`, {
        chartUrl: response.chart_url,
      });

      ChatUIManager.renderMessage(this.state.messages[this.state.messages.length - 1]);
      ChatUIManager.showSuccess('Gráfico gerado com sucesso');
    } catch (error) {
      ChatUIManager.removeLoadingIndicator();
      ChatUIManager.showError(error.response?.data?.detail || 'Erro ao gerar gráfico');
      console.error(error);
    }
  }

  async sendWhatsAppMessage(phoneNumber, message, mediaUrl = null) {
    if (!phoneNumber || !message) {
      ChatUIManager.showError('Preencha telefone e mensagem');
      return;
    }

    try {
      await API_CLIENT.sendWhatsAppMessage(phoneNumber, message, mediaUrl);
      ChatUIManager.showSuccess('Mensagem enviada via WhatsApp');
    } catch (error) {
      ChatUIManager.showError('Erro ao enviar WhatsApp');
      console.error(error);
    }
  }

  async getChatHistory() {
    try {
      const response = await API_CLIENT.getChatHistory();
      return response.history;
    } catch (error) {
      ChatUIManager.showError('Erro ao obter histórico');
      return [];
    }
  }

  async clearCache() {
    try {
      await API_CLIENT.clearChatCache(this.state.currentChatType);
      this.state.clearMessages();

      const container = document.getElementById('messages-container');
      if (container) container.innerHTML = '';

      ChatUIManager.showSuccess('Cache limpo com sucesso');
    } catch (error) {
      ChatUIManager.showError('Erro ao limpar cache');
      console.error(error);
    }
  }

  changeChatType(newChatType) {
    if (CHAT_TYPES[newChatType]) {
      this.state.currentChatType = newChatType;

      // Atualiza UI
      document.querySelectorAll('.chat-type-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      const activeBtn = document.querySelector(`[data-chat-type="${newChatType}"]`);
      if (activeBtn) activeBtn.classList.add('active');

      // Limpa mensagens
      this.state.clearMessages();
      const container = document.getElementById('messages-container');
      if (container) container.innerHTML = '';

      ChatUIManager.showSuccess(`Mudou para: ${CHAT_TYPES[newChatType].label}`);
    }
  }

  getState() {
    return this.state.getState();
  }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    const chatService = new ChatService();

    // Renderiza seletores
    ChatUIManager.renderChatTypeSelector();
    ChatUIManager.updateChartTypeButtons();
    ChatUIManager._createChartModal();

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

    // Clique em gráfico abre modal
    document.addEventListener('click', (e) => {
        const img = e.target.closest('.message-chart');
        if (img && img.src) {
            ChatUIManager.showChartModal(img.src);
        }
    });

    // Torna disponível globalmente
    window.chatService = chatService;
    window.ChatUIManager = ChatUIManager;
});

// ==================== EXPORTAR ====================
export { ChatService, ChatUIManager, ChatStateManager };