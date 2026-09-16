/**
 * Amoha Offline Storage Schema
 * IndexedDB design for offline-first data persistence
 * Compatible with brain.py output format and backend sync
 */

// Database name and version
const DB_NAME = 'amoha-offline';
const DB_VERSION = 2;

// Object store names
const STORES = {
  CARE_LOGS: 'care_logs',
  GAME_SCORES: 'game_scores',
  MEDICATION_REMINDERS: 'medication_reminders',
  PATIENT_PREFERENCES: 'patient_preferences',
  SYNC_QUEUE: 'sync_queue',
  BRAWN_CACHE: 'brain_cache',
};

// Initialize IndexedDB database
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.CARE_LOGS)) {
        const careLogsStore = db.createObjectStore(STORES.CARE_LOGS, { keyPath: 'id', autoIncrement: true });
        careLogsStore.createIndex('by_care_recipient', 'care_recipient_id');
        careLogsStore.createIndex('by_timestamp', 'timestamp', { unique: false });
        careLogsStore.createIndex('by_tag', 'tag');
      }

      if (!db.objectStoreNames.contains(STORES.GAME_SCORES)) {
        db.createObjectStore(STORES.GAME_SCORES, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORES.MEDICATION_REMINDERS)) {
        const medStore = db.createObjectStore(STORES.MEDICATION_REMINDERS, { keyPath: 'id', autoIncrement: true });
        medStore.createIndex('by_care_recipient', 'care_recipient_id');
        medStore.createIndex('by_due_time', 'due_time');
      }

      if (!db.objectStoreNames.contains(STORES.PATIENT_PREFERENCES)) {
        db.createObjectStore(STORES.PATIENT_PREFERENCES, { keyPath: 'user_id' });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'idempotency_key' });
        syncStore.createIndex('by_status', 'status');
        syncStore.createIndex('by_timestamp', 'timestamp');
      }

      if (!db.objectStoreNames.contains(STORES.BRAWN_CACHE)) {
        db.createObjectStore(STORES.BRAWN_CACHE, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Care Log schema (matches backend care_logs table structure + brain.py output)
export const CARE_LOG_SCHEMA = {
  id: 'auto-increment',
  care_recipient_id: 'string',
  logged_by: 'string',
  entry_text: 'string',
  tag: 'string', // Primary tag from brain.py analysis
  suggestion: 'string', // Primary suggestion from brain.py analysis
  alert_level: 'string', // "info", "support", "caregiver_review"
  game_accuracy: 'number', // 0 to 1
  assistance_probability: 'number', // 0 to 1
  game_difficulty: 'string', // "Easy", "Medium", "Hard"
  tags_json: 'object', // Full tags array from brain.py
  suggestions_json: 'object', // Full suggestions array from brain.py
  explanation_json: 'object', // Explanation array from brain.py
  timestamp: 'number', // Unix timestamp
  is_synced: 'boolean', // Whether synced to backend
  idempotency_key: 'string', // For deduplication during sync
};

// Game Score schema
export const GAME_SCORE_SCHEMA = {
  id: 'auto-increment',
  care_recipient_id: 'string',
  game_type: 'string', // "memory", "matching", "etc."
  accuracy: 'number', // 0 to 1
  score: 'number',
  level: 'string', // "Easy", "Medium", "Hard"
  attempts: 'number',
  duration_seconds: 'number',
  timestamp: 'number',
  is_synced: 'boolean',
};

// Medication Reminder schema
export const MEDICATION_REMINDER_SCHEMA = {
  id: 'auto-increment',
  care_recipient_id: 'string',
  medication_name: 'string',
  dosage: 'string',
  time_of_day: 'string', // "morning", "afternoon", "evening"
  frequency: 'string',
  next_due: 'number', // Unix timestamp
  missed_count: 'number',
  is_synced: 'boolean',
};

// Patient Preferences schema (small, fits in brain cache constraint)
export const PATIENT_PREFERENCES_SCHEMA = {
  user_id: 'string',
  preferred_language: 'string',
  voice_guidance: 'boolean',
  theme: 'string', // "high-contrast", "default", "dark"
  font_size: 'string', // "large", "medium", "small"
  cognitive_level: 'string', // "early", "middle", "late"
  favorite_activities: 'string', // JSON array
  created_at: 'number',
  updated_at: 'number',
};

// Sync Queue schema (for background sync)
export const SYNC_QUEUE_SCHEMA = {
  idempotency_key: 'string', // Unique key for deduplication
  data_type: 'string', // "care_log", "game_score", "med_reminder"
  payload: 'object', // The data to sync
  status: 'string', // "pending", "synced", "failed"
  attempts: 'number', // Retry counter
  last_attempt: 'number', // Unix timestamp
  error_message: 'string', // Last error if failed
};

// Brain cache schema (tiny files only - json, re only)
export const BRAIN_CACHE_SCHEMA = {
  key: 'string', // e.g., "keywords", "difficulty-rules", "suggestion-templates"
  data: 'object', // Serialized data, must stay < 500KB
  last_updated: 'number', // Unix timestamp
  version: 'string',
};

// Utility: Store care log offline
export async function storeCareLogOffline(careLogData) {
  const db = await initDB();
  const tx = db.transaction(STORES.CARE_LOGS, 'readwrite');
  const store = tx.objectStore(STORES.CARE_LOGS);
  
  const logEntry = {
    ...careLogData,
    timestamp: Date.now(),
    is_synced: false,
  };
  
  await store.add(logEntry);
  return tx.complete;
}

// Retrieve unsynced care logs
export async function getUnsyncedCareLogs() {
  const db = await initDB();
  const tx = db.transaction(STORES.CARE_LOGS, 'readonly');
  const store = tx.objectStore(STORES.CARE_LOGS);
  const index = store.index('by_timestamp');
  
  return new Promise((resolve) => {
    const getAll = index.openCursor(null, 'prev');
    const logs = [];
    get.onsuccess = () => {
      let cursor = getAll.result;
      while (cursor) {
        if (cursor.value.is_synced === false) {
          logs.push(cursor.value);
        }
        cursor = cursor.continue();
      }
      resolve(logs);
    };
  });
}

// Store game score offline
export async function storeGameScoreOffline(scoreData) {
  const db = await initDB();
  const tx = db.transaction(STORES.GAME_SCORES, 'readwrite');
  const store = tx.objectStore(STORES.GAME_SCORES);
  
  await store.add({
    ...scoreData,
    timestamp: Date.now(),
    is_synced: false,
  });
  
  return tx.complete;
}

// Store medication reminder offline
export async function storeMedicationReminderOffline(reminderData) {
  const db = await initDB();
  const tx = db.transaction(STORES.MEDICATION_REMINDERS, 'readwrite');
  const store = tx.objectStore(STORES.MEDICATION_REMINDERS);
  
  await store.add({
    ...reminderData,
    timestamp: Date.now(),
    is_synced: false,
  });
  
  return tx.complete;
}

// Update brain cache (tiny data only)
export async function updateBrainCache(key, data) {
  const db = await initDB();
  const tx = db.transaction(STORES.BRAWN_CACHE, 'readwrite');
  const store = tx.objectStore(STORES.BRAWN_CACHE);
  
  // Enforce size limit: must be < 500KB
  const dataSize = JSON.stringify(data).length;
  if (dataSize > 500 * 1024) {
    console.error(`Brain cache data exceeds 500KB limit (${dataSize} bytes)`);
    return tx.complete;
  }
  
  await store.put({ key, data, last_updated: Date.now(), version: 'v0.1' }, key);
  return tx.complete;
}

// Retrieve brain cache
export async function getBrainCache(key) {
  const db = await initDB();
  const tx = db.transaction(STORES.BRAWN_CACHE, 'readonly');
  const store = tx.objectStore(STORES.BRAWN_CACHE);
  
  return new Promise((resolve) => {
    const request = store.get(key);
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

// Get all patient preferences
export async function getPatientPreferences(userId) {
  const db = await initDB();
  const tx = db.transaction(STORES.PATIENT_PREFERENCES, 'readonly');
  const store = tx.objectStore(STORES.PATIENT_PREFERENCES);
  
  return new Promise((resolve) => {
    const request = store.get(userId);
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

// Update patient preferences
export async function updatePatientPreferences(preferencesData) {
  const db = await initDB();
  const tx = db.transaction(STORES.PATIENT_PREFERENCES, 'readwrite');
  const store = tx.objectStore(STORES.PATIENT_PREFERENCES);
  
  await store.put({
    ...preferencesData,
    updated_at: Date.now(),
  }, preferencesData.user_id);
  
  return tx.complete;
}

// Export store constants for use in service worker
export const STORE_NAMES = STORES;