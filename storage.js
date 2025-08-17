// Storage utilities for BrowseMate AI Side Panel
// Provides namespaced access to chrome.storage.local

const PREFIX = 'bm';

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: `${PREFIX}_settings`,
  SESSIONS: `${PREFIX}_sessions`,
  ACTIVE_SESSION_ID: `${PREFIX}_active_session_id`,
  API_KEY: `${PREFIX}_api_key`
};

// One-time migration from old "cedric" keys to new "bm" keys
async function migrateFromCedric() {
  try {
    const old = await chrome.storage.local.get(null);
    const updates = {};
    
    if (old['cedric_settings'] && !old[STORAGE_KEYS.SETTINGS]) {
      updates[STORAGE_KEYS.SETTINGS] = old['cedric_settings'];
    }
    if (old['cedric_sessions'] && !old[STORAGE_KEYS.SESSIONS]) {
      updates[STORAGE_KEYS.SESSIONS] = old['cedric_sessions'];
    }
    if (old['cedric_active_session_id'] && !old[STORAGE_KEYS.ACTIVE_SESSION_ID]) {
      updates[STORAGE_KEYS.ACTIVE_SESSION_ID] = old['cedric_active_session_id'];
    }
    if (old['cedric_api_key'] && !old[STORAGE_KEYS.API_KEY]) {
      updates[STORAGE_KEYS.API_KEY] = old['cedric_api_key'];
    }
    
    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
      console.log('Migrated data from old Cedric keys to new BrowseMate keys');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration on load
migrateFromCedric();

// Generic storage operations
async function get(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function remove(key) {
  await chrome.storage.local.remove(key);
}

async function setMultiple(updates) {
  await chrome.storage.local.set(updates);
}

// Settings storage
export class SettingsStorage {
  static async getSettings() {
    const settings = await get(STORAGE_KEYS.SETTINGS);
    return settings || {
      sendUrlWithRequests: false
    };
  }

  static async updateSettings(newSettings) {
    const current = await this.getSettings();
    const updated = { ...current, ...newSettings };
    await set(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  static async getApiKey() {
    return await get(STORAGE_KEYS.API_KEY);
  }

  static async setApiKey(apiKey) {
    await set(STORAGE_KEYS.API_KEY, apiKey);
  }

  static async removeApiKey() {
    await remove(STORAGE_KEYS.API_KEY);
  }
}

// Session storage
export class SessionStorage {
  static async getSessions() {
    const sessions = await get(STORAGE_KEYS.SESSIONS);
    return sessions || {};
  }

  static async getSession(sessionId) {
    const sessions = await this.getSessions();
    return sessions[sessionId];
  }

  static async saveSession(session) {
    const sessions = await this.getSessions();
    sessions[session.id] = session;
    await set(STORAGE_KEYS.SESSIONS, sessions);
    return session;
  }

  static async createSession() {
    const sessions = await this.getSessions();
    const newSession = {
      id: `session_${Date.now()}`,
      name: `Session ${Object.keys(sessions).length + 1}`,
      messages: [],
      ingestedUrls: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.saveSession(newSession);
    return newSession;
  }

  static async addMessage(sessionId, message) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');
    
    session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    await this.saveSession(session);
    return message;
  }

  static async getCurrentSessionId() {
    return await get(STORAGE_KEYS.ACTIVE_SESSION_ID);
  }

  static async setCurrentSessionId(sessionId) {
    await set(STORAGE_KEYS.ACTIVE_SESSION_ID, sessionId);
  }

  static async setMultiple(updates) {
    await setMultiple(updates);
  }
}
