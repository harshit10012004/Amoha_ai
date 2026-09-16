import { db, SyncQueueItem } from "../db/database";

export async function queueForSync(
  dataType: string,
  payload: unknown
) {
  const item: SyncQueueItem = {
    dataType,
    payload,
    status: "pending",
    retryCount: 0,
    createdAt: new Date().toISOString()
  };

  return await db.syncQueue.add(item);
}

export async function getPendingSyncItems() {
  return await db.syncQueue
    .where("status")
    .equals("pending")
    .toArray();
}

export async function markSyncing(id: number) {
  await db.syncQueue.update(id, {
    status: "syncing"
  });
}

export async function markSyncFailed(id: number) {
  const item = await db.syncQueue.get(id);

  if (!item) return;

  await db.syncQueue.update(id, {
    status: "failed",
    retryCount: item.retryCount + 1
  });
}

export async function removeSyncedItem(id: number) {
  await db.syncQueue.delete(id);
}

export async function getSyncQueueCount() {
  return await db.syncQueue
    .where("status")
    .equals("pending")
    .count();
}
