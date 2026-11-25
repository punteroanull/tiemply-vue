// src/utils/offlineManager.ts
import { useToast } from "vue-toastification";
import i18n from "../i18n";
import { useWorkStatusStore } from "../stores/workStatus";
import type { WorkLogCategory } from "../types";

const STORAGE_KEY = "tiemply_pending_actions";

export interface PendingAction {
  /** Identifies the entry so it can be removed without relying on its position. */
  id: string;
  type: "check-in" | "check-out" | "break-start" | "break-end" | "offsite-start" | "offsite-end";
  /** When the user acted. Sent as `occurred_at` so the API dates the entry at that moment. */
  timestamp: number;
  /** Whose entry this is: the queue is shared by everyone who signs in on the device. */
  employeeId: string;
  data: {
    category?: string;
    notes?: string;
    location?: string;
  };
}

export interface SyncSummary {
  synced: number;
  rejected: number;
  remaining: number;
}

function readAll(): PendingAction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];

    // Entries saved by an older build carry no id.
    return parsed
      .filter((action) => action && typeof action === "object")
      .map((action, index) => ({
        ...action,
        id: action.id || `${action.timestamp ?? 0}-${index}`,
      }));
  } catch {
    return [];
  }
}

function writeAll(actions: PendingAction[]): void {
  if (actions.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  }
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Category an entry stands for, including the type-only entries of older builds. */
export function categoryOf(action: PendingAction): WorkLogCategory {
  const fallback: Record<PendingAction["type"], WorkLogCategory> = {
    "check-in": "shift_start",
    "check-out": "shift_end",
    "break-start": "break_start",
    "break-end": "break_end",
    "offsite-start": "offsite_start",
    "offsite-end": "offsite_end",
  };
  return (action.data?.category as WorkLogCategory) || fallback[action.type] || "shift_start";
}

/** Queue an entry made without connection. */
export function savePendingAction(action: Omit<PendingAction, "id"> & { id?: string }): void {
  const pendingActions = readAll();
  pendingActions.push({ ...action, id: action.id || newId() });
  writeAll(pendingActions);
}

/** Queued entries, oldest first. Pass an employee id to get only that person's. */
export function getPendingActions(employeeId?: string | null): PendingAction[] {
  const actions = readAll().sort((a, b) => a.timestamp - b.timestamp);
  return employeeId ? actions.filter((action) => action.employeeId === employeeId) : actions;
}

export function getPendingActionsCount(employeeId?: string | null): number {
  return getPendingActions(employeeId).length;
}

/** Remove one queued entry by id. */
export function removePendingAction(id: string): void {
  // Read again instead of reusing a snapshot: an entry queued meanwhile must survive.
  writeAll(readAll().filter((action) => action.id !== id));
}

/** Discard queued entries: one employee's, or all of them. */
export function clearPendingActions(employeeId?: string | null): void {
  if (!employeeId) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  writeAll(readAll().filter((action) => action.employeeId !== employeeId));
}

let syncInFlight: Promise<SyncSummary> | null = null;

async function runSync(): Promise<SyncSummary> {
  const summary: SyncSummary = { synced: 0, rejected: 0, remaining: 0 };

  if (typeof navigator !== "undefined" && navigator.onLine === false) return summary;

  const workStatusStore = useWorkStatusStore();
  // Only the signed-in employee's entries: replaying someone else's would record them
  // under the wrong person. Theirs stay queued until they sign in on this device again.
  const employeeId = workStatusStore.getEmployeeId();
  if (!employeeId) return summary;

  const queue = getPendingActions(employeeId);
  if (queue.length === 0) return summary;

  const toast = useToast();
  const t = i18n.global.t as any;

  for (const action of queue) {
    const result = await workStatusStore.submitQueuedAction(
      categoryOf(action),
      action.data?.notes,
      action.timestamp
    );

    if (result.ok) {
      removePendingAction(action.id);
      summary.synced++;
      continue;
    }

    if (result.reason === "rejected") {
      // Final: retrying would be refused again and hold back everything queued after it.
      // The user is told, with the server's reason, because the entry does not exist.
      removePendingAction(action.id);
      summary.rejected++;
      toast.error(
        t("workStatus.toasts.syncRejected", {
          reason: result.message || t("workStatus.toasts.syncRejectedGeneric"),
        }),
        { timeout: false }
      );
      continue;
    }

    if (result.reason === "location") {
      toast.warning(t("workStatus.toasts.syncWaitingLocation"));
    }

    // No connection, no position, or another action in flight: keep the rest, in order.
    break;
  }

  summary.remaining = getPendingActionsCount(employeeId);

  if (summary.synced > 0) {
    toast.success(t("workStatus.toasts.syncDone", { count: summary.synced }, summary.synced));
  }

  workStatusStore.refreshPendingCount();
  await workStatusStore.fetchStatus({ silent: true });

  return summary;
}

/**
 * Send the signed-in employee's queued entries, oldest first. Calls made while a sync is
 * running share it, so the same entry is never sent twice.
 */
export function syncPendingActions(): Promise<SyncSummary> {
  if (!syncInFlight) {
    syncInFlight = runSync().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

/**
 * Sync whenever the connection comes back. The sync at start-up is triggered by the
 * work-status store once the session and the company settings are loaded: doing it on a
 * timer could run before the user was known and lose the queue.
 */
export function setupOfflineListeners(): void {
  window.addEventListener("online", () => {
    void syncPendingActions().catch(() => undefined);
  });
}

export function isOnline(): boolean {
  return navigator.onLine;
}
