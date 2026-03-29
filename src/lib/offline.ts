import { openDB } from "idb";

const DB_NAME = "amper-staff";
const DB_VERSION = 1;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Subscribers cache
      if (!db.objectStoreNames.contains("subscribers")) {
        const store = db.createObjectStore("subscribers", { keyPath: "id" });
        store.createIndex("branch_id", "branch_id");
        store.createIndex("serial_number", "serial_number");
      }
      // Pending payments queue
      if (!db.objectStoreNames.contains("pending_payments")) {
        db.createObjectStore("pending_payments", { keyPath: "client_uuid" });
      }
      // Last sync timestamp
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    },
  });
}

// Save subscribers to IndexedDB
export async function cacheSubscribers(subscribers: any[]) {
  const db = await getDB();
  const tx = db.transaction("subscribers", "readwrite");
  for (const sub of subscribers) {
    await tx.store.put(sub);
  }
  await tx.done;
  const db2 = await getDB();
  await db2.put("meta", { key: "last_sync", value: new Date().toISOString() });
}

// Get subscribers from IndexedDB (offline fallback)
export async function getCachedSubscribers(branchId: string) {
  const db = await getDB();
  return db.getAllFromIndex("subscribers", "branch_id", branchId);
}

// Queue a payment for sync
export async function queuePayment(payment: any) {
  const db = await getDB();
  const clientUuid = crypto.randomUUID();
  await db.put("pending_payments", {
    ...payment,
    client_uuid: clientUuid,
    queued_at: new Date().toISOString(),
  });
  return clientUuid;
}

// Get pending payments
export async function getPendingPayments() {
  const db = await getDB();
  return db.getAll("pending_payments");
}

// Remove synced payment
export async function removePendingPayment(clientUuid: string) {
  const db = await getDB();
  await db.delete("pending_payments", clientUuid);
}

// Get pending payments count
export async function getPendingCount() {
  const db = await getDB();
  return db.count("pending_payments");
}

// Get last sync timestamp
export async function getLastSyncTime(): Promise<string | null> {
  const db = await getDB();
  const meta = await db.get("meta", "last_sync");
  return meta?.value ?? null;
}

// Update a cached subscriber locally (after offline payment)
export async function updateCachedSubscriber(
  subscriberId: string,
  updates: Partial<any>
) {
  const db = await getDB();
  const sub = await db.get("subscribers", subscriberId);
  if (sub) {
    await db.put("subscribers", { ...sub, ...updates });
  }
}
