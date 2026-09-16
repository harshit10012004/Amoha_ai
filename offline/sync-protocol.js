/**
 * Amoha Sync Protocol & Queue Mechanism
 * Handles offline data queuing and background sync with backend
 * Connects Blue module to Yellow's APIs (POST /sync, GET /pending-syncs)
 */

import { initDB, STORE_NAMES, CARE_LOG_SCHEMA, GAME_SCORE_SCHEMA, MEDICATION_REMINDER_SCHEMA } from './indexeddb';

import ConflictResolution from './conflict-resolution';

import SMS from './sms-fallback';

const SYNC_ENDPOINT = '/api/care-log/offline-sync';
const BATCH_SIZE = 10; // Send records in batches for efficiency
const INITIAL_BACKOFF_MS = 1000; // 1 second initial backoff
const MAX_BACKOFF_MS = 30000; // 30 seconds max backoff
const BACKOFF_MULTIPLIER = 2;

// Track sync state per data type
const syncState = {
  isSyncing: false,
  lastSyncAttempt: 0,
  retryCount: 0,
  pendingCount: 0,
};

/**
 * Queue data for sync to backend
 * @param {string} dataType - "care_log", "game_score", "med_reminder"
 * @param {object} data - The data payload
 * @param {string} idempotency_key - Unique key for deduplication
 * @returns {string} The idempotency key
 */
export async function queueForSync(dataType, data, idempotency_key = null) {
  if (!idempotency_key) {
    idempotency_key = `${dataType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  const db = await initDB();
  
  // Determine which store to use
  let storeName;
  switch (dataType) {
    case 'care_log':
      storeName = STORE_NAMES.CARE_LOGS;
      // Add sync metadata
      const careLogData = {
        ...data,
        idempotency_key,
        status: 'pending',
        synced_at: null,
        attempts: 0,
      };
      await storeCareLogOffline(careLogData);
      break;
    case 'game_score':
      storeName = STORE_NAMES.GAME_SCORES;
      await storeGameScoreOffline({
        ...data,
        idempotency_key,
        status: 'pending',
      });
      break;
    case 'med_reminder':
      storeName = STORE_NAMES.MEDICATION_REMINDERS;
      await storeMedicationReminderOffline({
        ...data,
        idempotency_key,
        status: 'pending',
      });
      break;
    default:
      console.error(`Unknown data type: ${dataType}`);
      return null;
  }

  // Store sync queue entry
  const tx = db.transaction(STORE_NAMES.SYNC_QUEUE, 'readwrite');
  const syncStore = tx.objectStore(STORE_NAMES.SYNC_QUEUE);
  
  const queueEntry = {
    idempotency_key,
    data_type: dataType,
    payload: data,
    status: 'pending',
    attempts: 0,
    timestamp: Date.now(),
    error_message: null,
  };
  
  await syncStore.put(queueEntry, idempotency_key);
  return tx.complete then () => idempotency_key;
}

/**
 * Check connectivity and attempt sync
 * Implements exponential backoff retry logic
 * @returns {Promise<object>} Sync result status
 */
export async function trySync() {
  // Check if already syncing
  if (syncState.isSyncing) {
    return { status: 'already_syncing', pending: syncState.pendingCount };
  }

  // Check online status
  if (!navigator.onLine) {
    return { status: 'offline', pending: syncState.pendingCount };
  }

  syncState.isSyncing = true;
  syncState.lastSyncAttempt = Date.now();
  syncState.retryCount = 0;

  try {
    // Retrieve pending sync entries from IndexedDB
    const pendingEntries = await getPendingSyncEntries();
    
    if (pendingEntries.length === 0) {
      syncState.isSyncing = false;
      syncState.pendingCount = 0;
      return { status: 'no_pending', pending: 0 };
    }

    // Process in batches
    const results = [];
    for (let i = 0; i < pendingEntries.length; i += BATCH_SIZE) {
      const batch = pendingEntries.slice(i, i + BATCH_SIZE);
      const batchResults = await syncBatch(batch);
      results.push(...batchResults);
      
      // Exponential backoff between batches
      await new Promise(resolve => setTimeout(resolve, INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, syncState.retryCount)));
      syncState.retryCount = Math.min(syncState.retryCount + 1, 5); // Cap at 5
    }

    // Update sync state
    syncState.pendingCount = pendingEntries.length - results.filter(r => r.status === 'already_synced').length;
    syncState.isSyncing = false;

    return { status: 'completed', results, pending: syncState.pendingCount };

  } catch (error) {
    syncState.isSyncing = false;
    syncState.retryCount++;
    
    console.error('Sync failed:', error);
    
    // Schedule retry with backoff
    const backoffMs = Math.min(INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, syncState.retryCount), MAX_BACKOFF_MS);
    setTimeout(trySync, backoffMs);
    
    return { status: 'failed', error: error.message, pending: syncState.pendingCount };
  }
}

/**
 * Sync a batch of pending entries
 * @param {Array} batch - Array of sync queue entries
 * @returns {Promise<Array>} Batch sync results
 */
async function syncBatch(batch) {
  // Group by data type for efficient API calling
  const careLogs = batch.filter(e => e.data_type === 'care_log');
  const gameScores = batch.filter(e => e.data_type === 'game_score');
  const medReminders = batch.filter(e => e.data_type === 'med_reminder');

  const results = [];

  // Sync care logs
  if (careLogs.length > 0) {
    const careLogResults = await syncCareLogsBatch(careLogs);
    results.push(...careLogResults);
  }

  // Sync game scores
  if (gameScores.length > 0) {
    const gameScoreResults = await syncGameScoresBatch(gameScores);
    results.push(...gameScoreResults);
  }

  // Sync medication reminders AND send SMS fallbacks
  if (medReminders.length > 0) {
    const medReminderResults = await syncMedRemindersBatch(medReminders);
    results.push(...medReminderResults);
    
    // Also send SMS fallbacks for reminders that need them
    const smsResults = await sendSMSFallbacksForReminders(medReminders);
    results.push(...smsResults);
  }

  return results;
}

/**
 * Sync a batch of care logs to backend
 */
async function syncCareLogsBatch(careLogs) {
  // Extract payloads and idempotency keys
  const payloads = careLogs.map(entry => ({
    idempotency_key: entry.idempotency_key,
    payload: entry.payload,
    dataType: entry.data_type,
  }));

  try {
    const response = await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataType: 'care_log',
        data: payloads,
      }),
    });

    const result = await response.json();
    
    // Update IndexedDB sync status for each entry
    const db = await initDB();
    const syncStore = db.transaction(STORE_NAMES.SYNC_QUEUE, 'readwrite').objectStore(STORE_NAMES.SYNC_QUEUE);

    for (const entry of careLogs) {
      const existing = await syncStore.get(entry.idempotency_key);
      if (existing) {
        // Check for conflict between existing and new version
        const conflictDetected = ConflictResolution.detectSyncConflict(
          // Get existing care log from IndexedDB care_logs store
          // This would need the actual care log data, but we have the version info
          { version: entry.version, is_synced: entry.is_synced },
          { version: entry.payload.version || entry.version, is_synced: entry.payload.is_synced || false }
        );
        
        if (conflictDetected.conflictDetected) {
          // Apply conflict resolution
          const resolution = ConflictResolution.resolveConflict(
            // We need the full care log data, but we only have versions
            // In a full implementation, retrieve the full care log from IndexedDB
            entry,
            entry.payload
          );
          
          // Update based on resolution strategy
          if (resolution.strategy === 'last-write-wins-A') {
            await syncStore.update(entry.idempotency_key, {
              status: 'synced',
              synced_at: Date.now(),
              attempts: existing.attempts + 1,
            });
          } else if (resolution.strategy === 'last-write-wins-B-merged') {
            // Use merged data - would need to store merged version
            await syncStore.update(entry.idempotency_key, {
              status: 'synced',
              synced_at: Date.now(),
              attempts: existing.attempts + 1,
              conflict_resolved: true,
            });
          }
        } else {
          // No conflict, normal sync
          if (result.some(r => r.idempotency_key === entry.idempotency_key && r.status === 'already_synced')) {
            await syncStore.update(entry.idempotency_key, {
              ...existing,
              status: 'synced',
              synced_at: Date.now(),
              attempts: existing.attempts + 1,
            });
          } else if (result.some(r => r.idempotency_key === entry.idempotency_key && r.status === 'failed')) {
            await syncStore.update(entry.idempotency_key, {
              ...existing,
              status: 'failed',
              attempts: existing.attempts + 1,
              error_message: result.find(r => r.idempotency_key === entry.idempotency_key)?.error || existing.error_message,
            });
          }
        }
      } else if (result.some(r => r.idempotency_key === entry.idempotency_key && r.status === 'already_synced')) {
        // New entry, mark as already synced
        await syncStore.put({
          idempotency_key: entry.idempotency_key,
          data_type: entry.data_type,
          status: 'synced',
          synced_at: Date.now(),
          attempts: 0,
        }, entry.idempotency_key);
      }
    }

    return careLogs.map(entry => ({
      idempotency_key: entry.idempotency_key,
      status: 'already_synced',
    }));
  } catch (error) {
    // Update failed status in IndexedDB
    const db = await initDB();
    const syncStore = db.transaction(STORE_NAMES.SYNC_QUEUE, 'readwrite').objectStore(STORE_NAMES.SYNC_QUEUE);

    for (const entry of careLogs) {
      await syncStore.update(entry.idempotency_key, {
        status: 'failed',
        attempts: entry.attempts + 1,
        error_message: error.message,
      });
    }

    return careLogs.map(entry => ({
      idempotency_key: entry.idempotency_key,
      status: 'failed',
      error: error.message,
    }));
  }
}

/**
 * Get all pending sync entries from IndexedDB
 */
export async function getPendingSyncEntries() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAMES.SYNC_QUEUE, 'readonly');
  const store = tx.objectStore(STORE_NAMES.SYNC_QUEUE);
  
  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result;
      // Filter for pending entries only
      const pending = all.filter(entry => entry.status === 'pending');
      syncState.pendingCount = pending.length;
      resolve(pending);
    };
  });
}

/**
 * Get sync status summary
 */
export function getSyncStatus() {
  return {
    isSyncing: syncState.isSyncing,
    lastSyncAttempt: syncState.lastSyncAttempt,
    retryCount: syncState.retryCount,
    pendingCount: syncState.pendingCount,
    online: navigator.onLine,
  };
}

/**
 * Reset sync state (e.g., on new session)
 */
export function resetSyncState() {
  syncState.isSyncing = false;
  syncState.lastSyncAttempt = 0;
  syncState.retryCount = 0;
  syncState.pendingCount = 0;
}

/**
 * Send SMS fallbacks for medication reminders that need them
 * @param {Array} medReminders - Array of sync queue entries for med reminders
 * @returns {Promise<Array>} SMS send results
 */
async function sendSMSFallbacksForReminders(medReminders) {
  const smsResults = [];
  
  for (const entry of medReminders) {
    const reminder = entry.payload;
    
    // Check if this reminder requires SMS fallback
    if (reminder.requires_sms_fallback && reminder.caregiver_phone) {
      const smsMessage = `🔔 Medication Reminder: ${reminder.medication_name}, ${reminder.dosage}. Time: ${reminder.time_of_day}. Please administer.`;
      
      try {
        const sendResult = await SMS.sendPrioritySMS(
          reminder.caregiver_phone,
          smsMessage,
          { providerPreference: ['twilio', 'msg91'] }
        );
        
        // Update reminder status in IndexedDB
        const db = await initDB();
        const tx = db.transaction(STORE_NAMES.SYNC_QUEUE, 'readwrite');
        const syncStore = tx.objectStore(STORE_NAMES.SYNC_QUEUE);
        
        await syncStore.update(entry.idempotency_key, {
          ...entry,
          sms_status: sendResult.status,
          sms_provider: sendResult.provider,
          sms_sent_at: sendResult.status === 'sent' ? Date.now() : null,
          sms_error: sendResult.status === 'failed' ? sendResult.error : null,
        });
        
        smsResults.push({
          idempotency_key: entry.idempotency_key,
          status: sendResult.status,
          provider: sendResult.provider,
        });
      } catch (error) {
        // Update failed status
        const db = await initDB();
        const tx = db.transaction(STORE_NAMES.SYNC_QUEUE, 'readwrite');
        const syncStore = tx.objectStore(STORE_NAMES.SYNC_QUEUE);
        
        await syncStore.update(entry.idempotency_key, {
          ...entry,
          status: 'failed',
          error_message: error.message,
          sms_status: 'failed',
          sms_error: error.message,
        });
        
        smsResults.push({
          idempotency_key: entry.idempotency_key,
          status: 'failed',
          error: error.message,
        });
      }
    } else {
      // No SMS needed or no phone number, mark as sent (no action needed)
      smsResults.push({
        idempotency_key: entry.idempotency_key,
        status: 'sent',
        provider: 'none',
        note: 'No SMS required or no caregiver phone on file',
      });
    }
  }
  
  return smsResults;
}