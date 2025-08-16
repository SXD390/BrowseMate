// Main panel logic for Cedric AI Side Panel
// Handles UI interactions, session management, and Gemini API integration

import { SessionStorage, SettingsStorage, STORAGE_KEYS } from './storage.js';
import { callGemini, parseGeminiResponse, compileMessagesForGemini, testApiKey } from './gemini.js';

class CedricPanel {
  constructor() {
    this.currentSessionId = null;
    this.isLoading = false;
    this.settings = {};
    
    this.initializeElements();
    this.bindEvents();
    this.initializePanel();
  }

  // Initialize DOM element references
  initializeElements() {
    // Header elements
    this.sessionSelect = document.getElementById('sessionSelect');
    this.newSessionBtn = document.getElementById('newSessionBtn');
    this.ingestBtn = document.getElementById('ingestBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.closeBtn = document.getElementById('closeBtn');
    
    // Tab elements
    this.tabChat = document.getElementById('tabChat');
    this.tabSources = document.getElementById('tabSources');
    this.viewChat = document.getElementById('viewChat');
    this.viewSources = document.getElementById('viewSources');
    this.sourcesList = document.getElementById('sourcesList');
    this.ingestedCount = document.getElementById('ingestedCount');
    
    // Main content elements
    this.apiKeyBanner = document.getElementById('apiKeyBanner');
    this.openSettingsBtn = document.getElementById('openSettingsBtn');
    this.chatContainer = document.getElementById('chatContainer');
    this.messagesList = document.getElementById('messagesList');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    
    // Composer elements
    this.messageInput = document.getElementById('messageInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.tokenPill = document.getElementById('tokenPill');
    
    // Settings modal elements
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.testApiKeyBtn = document.getElementById('testApiKeyBtn');
    this.sendUrlToggle = document.getElementById('sendUrlToggle');
    this.exportSessionsBtn = document.getElementById('exportSessionsBtn');
    this.importSessionsBtn = document.getElementById('importSessionsBtn');
    this.clearDataBtn = document.getElementById('clearDataBtn');
    this.importFileInput = document.getElementById('importFileInput');
    
    // Toast container
    this.toastContainer = document.getElementById('toastContainer');
  }

  // Bind event listeners
  bindEvents() {
    // Header events
    this.newSessionBtn.addEventListener('click', () => this.createNewSession());
    this.sessionSelect.addEventListener('change', (e) => this.switchSession(e.target.value));
    this.ingestBtn.addEventListener('click', () => this.ingestCurrentPage());
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.closeBtn.addEventListener('click', () => this.closePanel());
    
    // Composer events
    this.messageInput.addEventListener('input', (e) => this.handleInputChange(e));
    this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Settings modal events
    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.testApiKeyBtn.addEventListener('click', () => this.testApiKey());
    this.exportSessionsBtn.addEventListener('click', () => this.exportSessions());
    this.importSessionsBtn.addEventListener('click', () => this.importSessions());
    this.clearDataBtn.addEventListener('click', () => this.clearAllData());
    this.importFileInput.addEventListener('change', (e) => this.handleFileImport(e));
    
    // Banner events
    this.openSettingsBtn.addEventListener('click', () => this.openSettings());
    
    // Modal backdrop click
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this.closeSettings();
      }
    });
  }

  // Initialize the panel
  async initializePanel() {
    try {
      // Load settings and check API key
      await this.loadSettings();
      await this.checkApiKeyStatus();
      
      // Load sessions and create default if none exist
      await this.loadSessions();
      if (Object.keys(await SessionStorage.getSessions()).length === 0) {
        await this.createNewSession();
      }
      
      // Load current session
      await this.loadCurrentSession();
      
      // Check if side panel API is available
      this.checkSidePanelSupport();
      
    } catch (error) {
      console.error('Failed to initialize panel:', error);
      this.showToast('Failed to initialize panel', 'error');
    }
  }

  // Check if Chrome Side Panel API is available
  checkSidePanelSupport() {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      console.log('Chrome Side Panel API is available');
    } else {
      console.warn('Chrome Side Panel API not available, falling back to content script overlay');
      this.showToast('Side Panel API not available', 'warning');
    }
  }

  // Load user settings
  async loadSettings() {
    try {
      this.settings = await SettingsStorage.getSettings();
      
      // Update UI with loaded settings
      this.apiKeyInput.value = await SettingsStorage.getApiKey() || '';
      this.sendUrlToggle.checked = this.settings.sendUrlWithRequests;
      
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // Check API key status and show/hide banner
  async checkApiKeyStatus() {
    const apiKey = await SettingsStorage.getApiKey();
    if (!apiKey) {
      this.apiKeyBanner.classList.remove('hidden');
      this.ingestBtn.disabled = true;
      this.messageInput.disabled = true;
      this.sendBtn.disabled = true;
    } else {
      this.apiKeyBanner.classList.add('hidden');
      this.ingestBtn.disabled = false;
      this.messageInput.disabled = false;
      this.updateSendButtonState();
    }
  }

  // Load all sessions and populate dropdown
  async loadSessions() {
    try {
      const sessions = await SessionStorage.getSessions();
      this.populateSessionDropdown(sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  // Populate session dropdown
  populateSessionDropdown(sessions) {
    this.sessionSelect.innerHTML = '';
    
    if (Object.keys(sessions).length === 0) {
      this.sessionSelect.innerHTML = '<option value="">No sessions</option>';
      return;
    }
    
    Object.values(sessions).forEach(session => {
      const option = document.createElement('option');
      option.value = session.id;
      option.textContent = session.name;
      this.sessionSelect.appendChild(option);
    });
  }

  // Load current session
  async loadCurrentSession() {
    try {
      const currentSessionId = await SessionStorage.getCurrentSessionId();
      if (currentSessionId) {
        await this.switchSession(currentSessionId);
      } else {
        // Select first available session
        const sessions = await SessionStorage.getSessions();
        const firstSessionId = Object.keys(sessions)[0];
        if (firstSessionId) {
          await this.switchSession(firstSessionId);
        }
      }
    } catch (error) {
      console.error('Failed to load current session:', error);
    }
  }

  // Switch to a different session
  async switchSession(sessionId) {
    if (!sessionId) return;
    
    try {
      this.currentSessionId = sessionId;
      await SessionStorage.setCurrentSessionId(sessionId);
      
      // Update dropdown selection
      this.sessionSelect.value = sessionId;
      
      // Load and display messages
      await this.loadSessionMessages(sessionId);
      
    } catch (error) {
      console.error('Failed to switch session:', error);
      this.showToast('Failed to switch session', 'error');
    }
  }

  // Load messages for a session
  async loadSessionMessages(sessionId) {
    try {
      const session = await SessionStorage.getSession(sessionId);
      if (session) {
        this.displayMessages(session.messages);
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
    }
  }

  // Create a new session
  async createNewSession() {
    try {
      const newSession = await SessionStorage.createSession();
      await this.loadSessions();
      await this.switchSession(newSession.id);
      this.showToast('New session created', 'success');
    } catch (error) {
      console.error('Failed to create new session:', error);
      this.showToast('Failed to create new session', 'error');
    }
  }

  // Ingest current page content
  async ingestCurrentPage() {
    try {
      this.ingestBtn.disabled = true;
      this.ingestBtn.innerHTML = '<div class="loading-spinner"></div> Ingesting...';

      const response = await chrome.runtime.sendMessage({ type: 'EXTRACT_CONTENT' });
      if (response.error) throw new Error(response.error);

      const session = await SessionStorage.getSession(this.currentSessionId);
      if (!session) throw new Error('Session not found');

      session.ingestedUrls = session.ingestedUrls || {};

      // De-dupe by URL
      if (session.ingestedUrls[response.url]) {
        this.showToast('Already ingested this page for this session', 'warning');
        return;
      }

      // Record URL
      session.ingestedUrls[response.url] = {
        title: response.title,
        timestamp: response.timestamp
      };

      // Save the registry
      await SessionStorage.saveSession(session);

      // Add compact PAGE CONTEXT message
      const contextMessage = {
        role: 'context',
        title: response.title,
        url: response.url,
        timestamp: response.timestamp,
        domain: this.extractDomain(response.url),
        // Store both full markdown and a trimmed essential slice
        markdown: response.markdown || null,
        essentialMarkdown: response.essentialMarkdown || (response.text || '').slice(0, 3000),
        text: undefined   // no bulky plain text in the visible message
      };

      await SessionStorage.addMessage(this.currentSessionId, contextMessage);
      await this.loadSessionMessages(this.currentSessionId);

      this.showToast(`Ingested content from ${contextMessage.domain}`, 'success');
    } catch (error) {
      console.error('Failed to ingest page:', error);
      this.showToast('Failed to ingest page content', 'error');
    } finally {
      this.ingestBtn.disabled = false;
      this.ingestBtn.innerHTML = `
        <svg class="ingest-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7,10 12,15 17,10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Ingest this web page
      `;
    }
  }

  // Extract domain from URL
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return 'unknown';
    }
  }

  // Handle input change (character count, send button state)
  handleInputChange(event) {
    const text = event.target.value;
    this.tokenPill.textContent = `${text.length} tokens`; // Assuming 1 token = 1 character for simplicity
    this.updateSendButtonState();
    
    // Auto-resize textarea
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
  }

  // Handle keyboard shortcuts
  handleKeyDown(event) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.sendMessage();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.messageInput.blur();
    }
  }

  // Update send button state
  updateSendButtonState() {
    const hasText = this.messageInput.value.trim().length > 0;
    const hasApiKey = !this.apiKeyBanner.classList.contains('hidden');
    
    this.sendBtn.disabled = !hasText || hasApiKey || this.isLoading;
  }

  // Send message to Gemini
  async sendMessage() {
    const text = this.messageInput.value.trim();
    if (!text || !this.currentSessionId || this.isLoading) return;
    
    try {
      this.isLoading = true;
      this.setLoadingState(true);
      
      // Add user message to session
      const userMessage = { role: 'user', text };
      await SessionStorage.addMessage(this.currentSessionId, userMessage);
      
      // Display user message
      this.addMessageToUI(userMessage);
      
      // Clear input
      this.messageInput.value = '';
      this.messageInput.style.height = 'auto';
      this.handleInputChange({ target: { value: '' } });
      
      // Get API key
      const apiKey = await SettingsStorage.getApiKey();
      if (!apiKey) {
        throw new Error('API key not set');
      }
      
      // Get session messages
      const session = await SessionStorage.getSession(this.currentSessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Compile messages for Gemini
      const { contents, systemInstruction } = compileMessagesForGemini(session.messages, this.settings);
      
      // Call Gemini API
      const response = await callGemini({ apiKey, contents, systemInstruction });
      const responseText = parseGeminiResponse(response);
      
      // Add model response to session
      const modelMessage = { role: 'model', text: responseText };
      await SessionStorage.addMessage(this.currentSessionId, modelMessage);
      
      // Display model response
      this.addMessageToUI(modelMessage);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      this.showToast(error.message, 'error');
      
      // Add error message to UI
      const errorMessage = { role: 'model', text: `Error: ${error.message}`, isError: true };
      this.addMessageToUI(errorMessage);
    } finally {
      this.isLoading = false;
      this.setLoadingState(false);
    }
  }

  // Set loading state
  setLoadingState(loading) {
    if (loading) {
      this.loadingIndicator.classList.remove('hidden');
      this.sendBtn.disabled = true;
      this.messageInput.disabled = true;
    } else {
      this.loadingIndicator.classList.add('hidden');
      this.sendBtn.disabled = false;
      this.messageInput.disabled = false;
      this.updateSendButtonState();
    }
  }

  // Display all messages for a session
  displayMessages(messages) {
    this.messagesList.innerHTML = '';
    messages.forEach(message => this.addMessageToUI(message));
    this.scrollToBottom();
  }

  // Add a single message to the UI
  addMessageToUI(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role}`;
    
    let contentHTML = '';
    
    if (message.role === 'context') {
      contentHTML = `
        <div class="message-content">
          <div class="context-header">
            <svg class="context-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span class="context-domain">${message.domain || 'Unknown'}</span>
            <span class="context-timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
          <div>Context ingested from <strong>${message.title || 'Unknown page'}</strong></div>
          ${message.essentialMarkdown ? `<div class="context-preview">${message.essentialMarkdown.slice(0, 200)}${message.essentialMarkdown.length > 200 ? '...' : ''}</div>` : ''}
        </div>
      `;
    } else {
      const textClass = message.isError ? 'text-error' : '';
      contentHTML = `
        <div class="message-content ${textClass}">
          ${this.formatMessageText(message.text)}
        </div>
      `;
    }
    
    messageElement.innerHTML = contentHTML;
    this.messagesList.appendChild(messageElement);
    this.scrollToBottom();
  }

  // Format message text (basic markdown support)
  formatMessageText(text) {
    if (!text) return '';
    
    // Escape HTML
    text = text.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
    
    // Basic markdown formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
    
    return text;
  }

  // Scroll chat to bottom
  scrollToBottom() {
    setTimeout(() => {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }, 100);
  }

  // Open settings modal
  openSettings() {
    this.settingsModal.classList.remove('hidden');
    this.apiKeyInput.focus();
  }

  // Close settings modal
  closeSettings() {
    this.settingsModal.classList.add('hidden');
    this.saveSettings();
  }

  // Save settings
  async saveSettings() {
    try {
      const apiKey = this.apiKeyInput.value.trim();
      const sendUrlWithRequests = this.sendUrlToggle.checked;
      
      await SettingsStorage.setApiKey(apiKey);
      await SettingsStorage.updateSettings({ sendUrlWithRequests });
      
      this.settings = await SettingsStorage.getSettings();
      await this.checkApiKeyStatus();
      
      this.showToast('Settings saved', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  // Test API key
  async testApiKey() {
    const apiKey = this.apiKeyInput.value.trim();
    if (!apiKey) {
      this.showToast('Please enter an API key', 'warning');
      return;
    }
    
    try {
      this.testApiKeyBtn.disabled = true;
      this.testApiKeyBtn.textContent = 'Testing...';
      
      const isValid = await testApiKey(apiKey);
      
      if (isValid) {
        this.showToast('API key is valid!', 'success');
        await this.saveSettings();
      } else {
        this.showToast('API key is invalid', 'error');
      }
    } catch (error) {
      console.error('API key test failed:', error);
      this.showToast('Failed to test API key', 'error');
    } finally {
      this.testApiKeyBtn.disabled = false;
      this.testApiKeyBtn.textContent = 'Test';
    }
  }

  // Export sessions
  async exportSessions() {
    try {
      const sessions = await SessionStorage.getSessions();
      const dataStr = JSON.stringify(sessions, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `cedric-sessions-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      this.showToast('Sessions exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export sessions:', error);
      this.showToast('Failed to export sessions', 'error');
    }
  }

  // Import sessions
  importSessions() {
    this.importFileInput.click();
  }

  // Handle file import
  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const sessions = JSON.parse(text);
      
      if (typeof sessions !== 'object' || sessions === null) {
        throw new Error('Invalid file format');
      }
      
      // Validate sessions structure
      for (const [id, session] of Object.entries(sessions)) {
        if (!session.id || !session.messages || !Array.isArray(session.messages)) {
          throw new Error('Invalid session structure');
        }
      }
      
      // Save imported sessions
      await SessionStorage.setMultiple({ [STORAGE_KEYS.SESSIONS]: sessions });
      await this.loadSessions();
      
      this.showToast('Sessions imported successfully', 'success');
      
    } catch (error) {
      console.error('Failed to import sessions:', error);
      this.showToast('Failed to import sessions: ' + error.message, 'error');
    } finally {
      // Reset file input
      event.target.value = '';
    }
  }

  // Clear all data
  async clearAllData() {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }
    
    try {
      await chrome.storage.local.clear();
      this.showToast('All data cleared', 'success');
      
      // Reload panel
      location.reload();
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.showToast('Failed to clear data', 'error');
    }
  }

  // Close the side panel
  closePanel() {
    if (chrome.sidePanel) {
      chrome.sidePanel.close();
    } else {
      // Fallback for when side panel API is not available
      this.showToast('Side panel closed', 'info');
    }
  }

  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${iconMap[type] || iconMap.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close">×</button>
    `;
    
    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });
    
    this.toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);
  }
}

// Initialize the panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CedricPanel();
});
