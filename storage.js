// Storage wrapper for Chrome extension
// Provides namespaced keys and utility functions for chrome.storage.local

const STORAGE_KEYS = {
  API_KEY: 'cedric_api_key',
  SESSIONS: 'cedric_sessions',
  SETTINGS: 'cedric_settings',
  CURRENT_SESSION: 'cedric_current_session'
};

// Default settings
const DEFAULT_SETTINGS = {
  sendUrlWithRequests: true,
  theme: 'dark'
};

// Default session structure
const DEFAULT_SESSION = {
  id: '',
  name: '',
  messages: [],
  createdAt: '',
  updatedAt: ''
};

// Storage utility functions
export const Storage = {
  // Get a value from storage
  async get(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key];
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  // Set a value in storage
  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  // Remove a key from storage
  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  },

  // Get multiple values at once
  async getMultiple(keys) {
    try {
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      console.error('Storage getMultiple error:', error);
      return {};
    }
  },

  // Set multiple values at once
  async setMultiple(values) {
    try {
      await chrome.storage.local.set(values);
      return true;
    } catch (error) {
      console.error('Storage setMultiple error:', error);
      return false;
    }
  },

  // Clear all storage
  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
};

// Session management functions
export const SessionStorage = {
  // Get all sessions
  async getSessions() {
    const sessions = await Storage.get(STORAGE_KEYS.SESSIONS);
    return sessions || {};
  },

  // Save a session
  async saveSession(session) {
    const sessions = await this.getSessions();
    sessions[session.id] = {
      ...session,
      updatedAt: new Date().toISOString()
    };
    return await Storage.set(STORAGE_KEYS.SESSIONS, sessions);
  },

  // Get a specific session
  async getSession(sessionId) {
    const sessions = await this.getSessions();
    return sessions[sessionId] || null;
  },

  // Delete a session
  async deleteSession(sessionId) {
    const sessions = await this.getSessions();
    delete sessions[sessionId];
    return await Storage.set(STORAGE_KEYS.SESSIONS, sessions);
  },

  // Create a new session
  async createSession(name = null) {
    const sessions = await this.getSessions();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionName = name || `Session ${Object.keys(sessions).length + 1}`;
    
    const newSession = {
      id: sessionId,
      name: sessionName,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    sessions[sessionId] = newSession;
    await Storage.set(STORAGE_KEYS.SESSIONS, sessions);
    
    return newSession;
  },

  // Add message to session
  async addMessage(sessionId, message) {
    const session = await this.getSession(sessionId);
    if (!session) return false;
    
    session.messages.push({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    return await this.saveSession(session);
  },

  // Update session name
  async updateSessionName(sessionId, newName) {
    const session = await this.getSession(sessionId);
    if (!session) return false;
    
    session.name = newName;
    return await this.saveSession(session);
  },

  // Get current active session ID
  async getCurrentSessionId() {
    return await Storage.get(STORAGE_KEYS.CURRENT_SESSION);
  },

  // Set current active session ID
  async setCurrentSessionId(sessionId) {
    return await Storage.set(STORAGE_KEYS.CURRENT_SESSION, sessionId);
  }
};

// Settings management functions
export const SettingsStorage = {
  // Get settings
  async getSettings() {
    const settings = await Storage.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  // Update settings
  async updateSettings(newSettings) {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    return await Storage.set(STORAGE_KEYS.SETTINGS, updatedSettings);
  },

  // Get API key
  async getApiKey() {
    return await Storage.get(STORAGE_KEYS.API_KEY);
  },

  // Set API key
  async setApiKey(apiKey) {
    return await Storage.set(STORAGE_KEYS.API_KEY, apiKey);
  },

  // Remove API key
  async removeApiKey() {
    return await Storage.remove(STORAGE_KEYS.API_KEY);
  }
};

// Export storage keys for use in other modules
export { STORAGE_KEYS, DEFAULT_SETTINGS, DEFAULT_SESSION };
