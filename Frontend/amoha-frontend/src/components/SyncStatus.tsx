import { Cloud, CloudCheck, CloudOff, RefreshCw, Error } from 'lucide-react';

/**
 * SyncStatus - Displays connection and sync status to user
 * Connects Blue module (sync protocol) with Orange UI
 */
export default function SyncStatus({online, syncStatus, onManualSync}) {
  return (
    <div className="sync-status-bar">
      {/* Online/Offline indicator */}
      <div className="connection-status">
        {online ? (
          <Cloud className="status-icon" title="Online" />
        ) : (
          <CloudOff className="status-icon" title="Offline" />
        )}
      </div>

      {/* Sync status */}
      {syncStatus.isSyncing && (
        <div className="sync-indicator">
          <RefreshCw className="spinner" title="Syncing..." />
          <span>Syncing {syncStatus.pendingCount} items...</span>
        </div>
      )}

      {/* Pending count */}
      {syncStatus.pendingCount > 0 && !syncStatus.isSyncing && (
        <div className="pending-count">
          <CloudCheck className="status-icon" title="Pending sync" />
          <span>{syncStatus.pendingCount} pending</span>
        </div>
      )}

      {/* Failed sync */}
      {syncStatus.lastError && !syncStatus.isSyncing && (
        <div className="sync-error">
          <Error className="status-icon" title="Sync failed" />
          <span>Sync error: {syncStatus.lastError}</span>
          <button onClick={onManualSync}>Retry</button>
        </div>
      )}

      {/* Ready to sync when online with pending */}
      {syncStatus.online && syncStatus.pendingCount > 0 && !syncStatus.isSyncing && (
        <button className="sync-now-btn" onClick={onManualSync}>
          Sync Now ({syncStatus.pendingCount})
        </button>
      )}
    </div>
  );
}