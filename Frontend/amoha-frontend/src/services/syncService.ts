import { db } from "../db/database";
import { api } from "./api";

const MAX_RETRIES = 5;

function getRetryDelay(retryCount: number) {
  return Math.min(30000, 1000 * Math.pow(2, retryCount));
}

export async function trySync() {
  if (!navigator.onLine) {
    return;
  }

  const items = await db.syncQueue
    .where("status")
    .anyOf("pending", "failed")
    .toArray();

  for (const item of items) {
    if (!item.id) continue;

    if (item.retryCount >= MAX_RETRIES) {
      continue;
    }

    if (item.nextRetryAt) {
      const retryTime = new Date(item.nextRetryAt).getTime();

      if (Date.now() < retryTime) {
        continue;
      }
    }

    try {
      await db.syncQueue.update(item.id, {
        status: "syncing"
      });

      if (item.dataType === "care-log") {
        await api.createCareLog(item.payload);
      }

      await db.syncQueue.delete(item.id);
    } catch (error) {
      const nextRetryCount = item.retryCount + 1;
      const delay = getRetryDelay(nextRetryCount);

      await db.syncQueue.update(item.id, {
        status: "failed",
        retryCount: nextRetryCount,
        nextRetryAt: new Date(Date.now() + delay).toISOString()
      });

      console.error("Offline sync failed:", error);
    }
  }
}
