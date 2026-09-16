import { useEffect, useState } from 'react';
import {
  initDB,
  storeCareLogOffline,
  getUnsyncedCareLogs,
  storeGameScoreOffline,
  storeMedicationReminderOffline,
  updateBrainCache,
  getBrainCache,
  getPatientPreferences,
  updatePatientPreferences,
  CARE_LOG_SCHEMA,
  GAME_SCORE_SCHEMA,
  MEDICATION_REMINDER_SCHEMA,
  PATIENT_PREFERENCES_SCHEMA,
  STORE_NAMES,
} from '../offline/indexeddb';
import { queueForSync, trySync, getPendingSyncEntries, getSyncStatus, resetSyncState } from '../offline/sync-protocol';
import * as ConflictResolution from '../offline/conflict-resolution';

/**
 * Hook for offline data persistence
 * Connects IndexedDB storage with React component state
 */
export function useOfflineStorage() {
  const [dbReady, setDbReady] = useState(false);
  const [careLogs, setCareLogs] = useState([]);
  const [unsyncedLogs, setUnsyncedLogs] = useState([]);
  const [gameScores, setGameScores] = useState([]);
  const [medReminders, setMedReminders] = useState([]);
  const [patientPrefs, setPatientPrefs] = useState(null);
  const [brainCache, setBrainCache] = useState(null);

  // Initialize IndexedDB on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        setDbReady(true);
        
        // Load existing data
        await loadInitialData();
      } catch (error) {
        console.error('IndexedDB initialization failed:', error);
      }
    };
    init();
  }, []);

  const loadInitialData = async () => {
    // Load unsynced care logs
    const unsynced = await getUnsyncedCareLogs();
    setUnsyncedLogs(unsynced);
    
    // Load patient preferences (if user_id available)
    // const prefs = await getPatientPreferences('current_user');
    // setPatientPrefs(prefs);
  };

  /**
   * Store a care log offline (when no internet)
   */
  const storeCareLog = async (careLogData) => {
    if (!dbReady) return;
    
    // Normalize data to schema
    const normalizedData = {
      care_recipient_id: careLogData.care_recipient_id || '',
      logged_by: careLogData.logged_by || '',
      entry_text: careLogData.entry_text || '',
      tag: careLogData.tag || '',
      suggestion: careLogData.suggestion || '',
      alert_level: careLogData.alert_level || 'info',
      game_accuracy: careLogData.game_accuracy !== undefined ? careLogData.game_accuracy : 0.5,
      assistance_probability: careLogData.assistance_probability || 0.5,
      game_difficulty: careLogData.game_difficulty || 'Medium',
      tags_json: careLogData.tags || [],
      suggestions_json: careLogData.suggestions || [],
      explanation_json: careLogData.explanation || [],
      timestamp: Date.now(),
      is_synced: false,
      idempotency_key: careLogData.idempotency_key || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    await storeCareLogOffline(normalizedData);
    setUnsyncedLogs(prev => [...prev, normalizedData]);
    setCareLogs(prev => [...prev, normalizedData]);
    
    return normalizedData.idempotency_key;
  };

  /**
   * Store game score offline
   */
  const storeGameScore = async (scoreData) => {
    if (!dbReady) return;
    
    const normalizedData = {
      care_recipient_id: scoreData.care_recipient_id || '',
      game_type: scoreData.game_type || 'memory',
      accuracy: scoreData.accuracy !== undefined ? scoreData.accuracy : 0.5,
      score: scoreData.score || 0,
      level: scoreData.level || 'Medium',
      attempts: scoreData.attempts || 1,
      duration_seconds: scoreData.duration_seconds || 0,
      timestamp: Date.now(),
      is_synced: false,
    };
    
    await storeGameScoreOffline(normalizedData);
    setGameScores(prev => [...prev, normalizedData]);
  };

  /**
   * Store medication reminder offline
   */
  const storeMedicationReminder = async (reminderData) => {
    if (!dbReady) return;
    
    const normalizedData = {
      care_recipient_id: reminderData.care_recipient_id || '',
      medication_name: reminderData.medication_name || '',
      dosage: reminderData.dosage || '',
      time_of_day: reminderData.time_of_day || 'morning',
      frequency: reminderData.frequency || 'daily',
      next_due: reminderData.next_due || Date.now() + 24 * 60 * 60 * 1000,
      missed_count: reminderData.missed_count || 0,
      is_synced: false,
    };
    
    await storeMedicationReminderOffline(normalizedData);
    setMedReminders(prev => [...prev, normalizedData]);
  };

  /**
   * Update brain cache with tiny data (keywords, rules, etc.)
   * Must stay under 500KB constraint
   */
  const updateBrainCacheData = async (key, data) => {
    if (!dbReady) return;
    await updateBrainCache(key, data);
    setBrainCache(prev => ({
      ...prev,
      [key]: {
        ...data,
        last_updated: Date.now(),
        version: 'v0.1',
      },
    }));
  };

  /**
   * Get brain cache data
   */
  const getCachedBrainData = async (key) => {
    if (!dbReady) return null;
    const cached = await getBrainCache(key);
    if (cached) {
      setBrainCache(prev => ({
        ...prev,
        [key]: cached,
      }));
    }
    return cached;
  };

  /**
   * Update patient preferences offline
   */
  const savePatientPreferences = async (preferences) => {
    if (!dbReady) return;
    
    const data = {
      ...preferences,
      user_id: preferences.user_id || 'current_user',
      created_at: preferences.created_at || Date.now(),
      updated_at: Date.now(),
    };
    
    await updatePatientPreferences(data);
    setPatientPrefs(data);
  };

  /**
   * Get all unsynced care logs ready for sync
   */
  const getPendingSyncData = async () => {
    if (!dbReady) return [];
    const logs = await getUnsyncedCareLogs();
    return logs.map(log => ({
      idempotency_key: log.idempotency_key,
      payload: {
        care_recipient_id: log.care_recipient_id,
        logged_by: log.logged_by,
        entry_text: log.entry_text,
        tag: log.tag,
        suggestion: log.suggestion,
        alert_level: log.alert_level,
        game_accuracy: log.game_accuracy,
      },
      status: 'pending',
    }));
  };

  const [syncStatus, setSyncStatus] = useState(() => getSyncStatus());

  useEffect(() => {
    // Listen for online/offline changes and auto-sync
    const handleOnline = () => {
      setSyncStatus(prev => ({
        ...prev,
        online: true,
      }));
      trySync().then(result => {
        setSyncStatus(prev => ({
          ...prev,
          ...result,
          online: true,
        }));
      });
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({
        ...prev,
        online: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [trySync]);

  /**
   * Manual sync trigger
   */
  const manualSync = async () => {
    if (!syncStatus.online) {
      // Will auto-sync when online
      return { status: 'queued_for_later', online: false };
    }
    const result = await trySync();
    setSyncStatus(result);
    return result;
  };

  return {
    dbReady,
    careLogs,
    setCareLogs,
    unsyncedLogs,
    setUnsyncedLogs,
    gameScores,
    setGameScores,
    medReminders,
    setMedReminders,
    patientPrefs,
    setPatientPrefs,
    brainCache,
    setBrainCache,
    storeCareLog,
    storeGameScore,
    storeMedicationReminder,
    updateBrainCacheData,
    getCachedBrainData,
    savePatientPreferences,
    getPendingSyncData,
    syncStatus,
    setSyncStatus,
    manualSync,
    trySync,
    getSyncStatus,
    resetSyncState,
    queueForSync,
    /**
     * SMS fallback for critical reminders
     */
    triggerSMSForCriticalReminder: async (careLogData, caregiverPhone) => {
      if (!dbReady) return { status: 'not_ready', reason: 'IndexedDB not ready' };
      return SMS.triggerSMSForCriticalReminder(careLogData, caregiverPhone);
    },
    sendBatchSMSReminders: async () => {
      if (!dbReady) return { status: 'not_ready', reason: 'IndexedDB not ready' };
      return SMS.sendBatchSMSReminders();
    },
    formatIndianPhone: SMS.formatIndianPhone,
    /**
     * Conflict resolution for care log entries
     */
    generateVersion: ConflictResolution.generateVersion,
    compareVersions: ConflictResolution.compareVersions,
    mergeCareLogs: ConflictResolution.mergeCareLogs,
    hasConflict: ConflictResolution.hasConflict,
    resolveConflict: ConflictResolution.resolveConflict,
    detectSyncConflict: ConflictResolution.detectSyncConflict,
  };
}

/**
 * Hook for online/offline status with auto-sync
 */
export function useOnlineSync() {
  const { storeCareLog, getPendingSyncData } = useOfflineStorage();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Attempt automatic sync
      syncPendingData();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [storeCareLog, getPendingSyncData]);

  const syncPendingData = async () => {
    if (!online) return;
    
    const pending = await getPendingSyncData();
    if (pending.length === 0) return;
    
    // Send to backend sync endpoint
    try {
      const response = await fetch('/api/care-log/offline-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataType: 'care_log',
          data: pending,
        }),
      });
      
      const result = await response.json();
      console.log('Sync result:', result);
      
      // Mark synced in IndexedDB
      if (dbReady) {
        const db = await initDB();
        const tx = db.transaction('care_logs', 'readwrite');
        const store = tx.objectStore('care_logs');
        
        pending.forEach(async (item) => {
          const entry = await store.get(item.idempotency_key);
          if (entry) {
            entry.is_synced = true;
            entry.sync_status = 'synced';
            entry.sync_attempted_at = Date.now();
            await store.put(entry, entry.idempotency_key);
          }
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      // Mark as failed, will retry on next online
    }
  };

  return { online, syncPendingData };
}