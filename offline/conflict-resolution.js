/**
 * Amoha Conflict Resolution Module
 * Handles simultaneous offline/online edits to care logs and other data
 * Implements last-write-wins strategy with manual merge fallback
 * Connects Blue module to Yellow (sync queue), Green (brain.py output), Purple (encryption)
 */

// Version tracking for care log conflict resolution
const VERSION_KEY = 'care_log_version';

/**
 * Generate a version tag for a care log entry
 * Combines timestamp with a hash of the content for basic integrity checking
 * @param {object} careLogData - The care log data
 * @returns {string} Version string
 */
export function generateVersion(careLogData) {
  const { entry_text, tag, suggestion, alert_level, game_accuracy, timestamp, idempotency_key } = careLogData;

  // Create a content hash for basic integrity checking
  const contentString = `${entry_text}-${tag}-${suggestion}-${alert_level}-${game_accuracy}`;
  const contentHash = contentString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(36);

  return `${timestamp}-${contentHash}-${idempotency_key}`;
}

/**
 * Compare two care log versions to determine which is newer
 * Uses last-write-wins strategy based on version timestamp
 * @param {string} versionA - First version string
 * @param {string} versionB - Second version string
 * @returns {object} Comparison result with winning version and reason
 */
export function compareVersions(versionA, versionB) {
  if (!versionA) return { winner: 'B', reason: 'A has no version' };
  if (!versionB) return { winner: 'A', reason: 'B has no version' };

  // Parse version components
  const parseVersion = (v) => {
    const parts = v.split('-');
    return {
      timestamp: parts[0] ? parseInt(parts[0], 36) : 0,
      hash: parts.slice(1, -1).join('-') || '0',
      idempotency_key: parts[parts.length - 1] || '',
    };
  };

  const a = parseVersion(versionA);
  const b = parseVersion(versionB);

  // Last-write-wins: compare timestamps
  if (b.timestamp > a.timestamp) {
    return {
      winner: 'B',
      reason: 'B has newer timestamp (last-write-wins)',
      versionA,
      versionB,
    };
  } else if (a.timestamp > b.timestamp) {
    return {
      winner: 'A',
      reason: 'A has newer timestamp (last-write-wins)',
      versionA,
      versionB,
    };
  }

  // Timestamps are equal - compare hash for content integrity
  const hashComparison = b.hash.localeCompare(a.hash);
  if (hashComparison !== 0) {
    return {
      winner: hashComparison > 0 ? 'B' : 'A',
      reason: 'Equal timestamps, content hash determines winner',
      versionA,
      versionB,
    };
  }

  // Everything is equal - return A (arbitrary but consistent)
  return {
    winner: 'A',
    reason: 'Versions are identical (no conflict)',
    versionA,
    versionB,
  };
}

/**
 * Manual merge function for care log entries
 * Combines data from two versions, preferring non-empty values from B
 * @param {object} versionA - Original care log data
 * @param {object} versionB - New care log data
 * @returns {object} Merged care log data
 */
export function mergeCareLogs(versionA, versionB) {
  const merged = {
    ...versionA,
    ...versionB,
  };

  // Specific merge rules for care log fields
  // entry_text: Prefer non-empty from B
  if (versionB.entry_text && versionB.entry_text.trim()) {
    merged.entry_text = versionB.entry_text;
  }

  // tag: Prefer the tag that indicates more severe condition
  const tagPriority = {
    'med_missed': 4,
    'agitation': 3,
    'sleep_issue': 3,
    'confusion': 2,
    'general_wellness': 1,
  };

  if (versionA.tag && versionB.tag) {
    const priorityA = tagPriority[versionA.tag] || 0;
    const priorityB = tagPriority[versionB.tag] || 0;
    if (priorityB >= priorityA) {
      merged.tag = versionB.tag;
    }
  } else if (versionB.tag) {
    merged.tag = versionB.tag;
  }

  // suggestion: Use B's suggestion if available
  if (versionB.suggestion && versionB.suggestion.trim()) {
    merged.suggestion = versionB.suggestion;
  }

  // alert_level: Use the higher severity level
  const alertPriority = {
    'info': 1,
    'support': 2,
    'caregiver_review': 3,
  };

  if (versionA.alert_level && versionB.alert_level) {
    const priorityA = alertPriority[versionA.alert_level] || 0;
    const priorityB = alertPriority[versionB.alert_level] || 0;
    if (priorityB >= priorityA) {
      merged.alert_level = versionB.alert_level;
    }
  } else if (versionB.alert_level) {
    merged.alert_level = versionB.alert_level;
  }

  // game_accuracy: Use the more conservative (lower) accuracy
  // (lower accuracy means more caution needed)
  if (versionA.game_accuracy !== undefined && versionB.game_accuracy !== undefined) {
    merged.game_accuracy = Math.min(versionA.game_accuracy, versionB.game_accuracy);
  }

  // assistance_probability: Average the two values
  if (versionA.assistance_probability !== undefined && versionB.assistance_probability !== undefined) {
    merged.assistance_probability = (
      (versionA.assistance_probability + versionB.assistance_probability) / 2
    ).toFixed(3);
  }

  // game_difficulty: Use B's difficulty if available
  if (versionB.game_difficulty) {
    merged.game_difficulty = versionB.game_difficulty;
  }

  // tags array: Combine and deduplicate
  if versionA.tags && versionB.tags {
    const combined = [...new Set([...versionA.tags, ...versionB.tags])];
    merged.tags = combined;
  }

  // suggestions array: Combine and deduplicate
  if (versionA.suggestions && versionB.suggestions) {
    const combinedSuggestions = [...new Set([
      ...versionA.suggestions.map(s => s.text),
      ...versionB.suggestions.map(s => s.text),
    ]).map(text => ({
      type: 'routine_support', // Default type
      text,
      reason: 'Merged from multiple entries',
    }))]
    merged.suggestions = combinedSuggestions;
  }

  // explanation: Combine explanation parts
  const explanationParts = [];
  if (versionA.explanation) versionA.explanation.forEach(p => explanationParts.push({ source: 'A', text: p }));
  if (versionB.explanation) versionB.explanation.forEach(p => explanationParts.push({ source: 'B', text: p }));
  merged.explanation = explanationParts.map(p => p.text);

  // Generate new version for merged result
  merged.version = generateVersion(merged);

  return merged;
}

/**
 * Detect if a conflict exists between two care log versions
 * @param {string} existingVersion - Version currently in IndexedDB
 * @param {string} newVersion - Version from sync/offline update
 * @returns {boolean} True if conflict detected
 */
export function hasConflict(existingVersion, newVersion) {
  if (!existingVersion || !newVersion) {
    return false; // No conflict if one is missing
  }

  // Versions are different
  if (existingVersion !== newVersion) {
    return true;
  }

  // Same version string - no conflict
  return false;
}

/**
 * Resolve a conflict between existing and new care log data
 * Uses last-write-wins by default, with manual merge fallback
 * @param {object} existingCareLog - Care log currently stored in IndexedDB
 * @param {object} newCareLog - Care log from sync/offline update
 * @returns {object} Resolution result with merged data and strategy used
 */
export function resolveConflict(existingCareLog, newCareLog) {
  const existingVersion = existingCareLog.version;
  const newVersion = newCareLog.version;

  // Check if conflict exists
  if (!hasConflict(existingVersion, newVersion)) {
    return {
      strategy: 'no_conflict',
      mergedData: newCareLog,
      message: 'No conflict detected - new data accepted',
    };
  }

  // Determine which version wins using last-write-wins
  const comparison = compareVersions(existingVersion, newVersion);

  if (comparison.winner === 'A') {
    // Keep existing data
    return {
      strategy: 'last-write-wins-A',
      mergedData: existingCareLog,
      message: 'Existing data kept (last-write-wins)',
    };
  } else {
    // Use new data, but attempt merge for critical fields
    const merged = mergeCareLogs(existingCareLog, newCareLog);

    return {
      strategy: 'last-write-wins-B-merged',
      mergedData: merged,
      message: 'New data accepted with merge for critical fields',
    };
  }
}

/**
 * Sync-aware conflict detection
 * Checks if care log has been modified both offline and online
 * by comparing version numbers and sync status
 * @param {object} careLogFromDB - Care log retrieved from IndexedDB
 * @param {object} careLogFromSync - Care log data from backend sync
 * @returns {object} Conflict detection result
 */
export function detectSyncConflict(careLogFromDB, careLogFromSync) {
  const dbVersion = careLogFromDB.version;
  const syncVersion = careLogFromSync.version;
  const dbSynced = careLogFromDB.is_synced;
  const syncSynced = careLogFromSync.is_synced;

  // Conflict scenarios:
  // 1. Both modified offline (same version, both unsynced) - no conflict, merge
  // 2. Existing synced, new unsynced - potential conflict
  // 3. Existing unsynced, new synced - potential conflict

  const conflictDetected =
    (dbVersion !== syncVersion) ||
    (dbSynced && !syncSynced) ||
    (!dbSynced && syncSynced);

  return {
    conflictDetected,
    dbVersion,
    syncVersion,
    dbSynced,
    syncSynced,
    message: conflictDetected
      ? 'Conflict detected - applying resolution strategy'
      : 'No sync conflict - data versions aligned',
  };
}

/**
 * Export all conflict resolution functions
 */
export default {
  generateVersion,
  compareVersions,
  mergeCareLogs,
  hasConflict,
  resolveConflict,
  detectSyncConflict,
};