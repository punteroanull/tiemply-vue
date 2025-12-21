// src/utils/offlineManager.ts
import { useWorkStatusStore } from "../stores/workStatus";

const STORAGE_KEY = 'tiemply_pending_actions';

export interface PendingAction {
  type: 'check-in' | 'check-out' | 'break-start' | 'break-end' | 'offsite-start' | 'offsite-end';
  timestamp: number;
  employeeId: string;
  data: {
    category?: string;
    notes?: string;
    location?: string;
  };
}

// Guardar acciones pendientes en el almacenamiento local
export function savePendingAction(action: PendingAction): void {
  const pendingActions = getPendingActions();
  pendingActions.push(action);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
}

// Obtener acciones pendientes
export function getPendingActions(): PendingAction[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Eliminar una acción pendiente
export function removePendingAction(index: number): void {
  const pendingActions = getPendingActions();
  pendingActions.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
}

// Limpiar todas las acciones pendientes
export function clearPendingActions(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Sincronizar acciones pendientes cuando se recupere la conexión
export async function syncPendingActions(): Promise<void> {
  const actions = getPendingActions();
  if (actions.length === 0) return;

  console.log(`Syncing ${actions.length} pending actions...`);

  const successfulIds: number[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    try {
      const workStatusStore = useWorkStatusStore();

      // Map action types to store methods
      switch (action.type) {
        case 'check-in':
          await workStatusStore.checkIn(action.data.category as 'shift_start' | 'break_end' | 'offsite_end' || 'shift_start');
          break;
        case 'check-out':
          await workStatusStore.checkOut(action.data.category as 'shift_end' | 'break_start' | 'offsite_start' || 'shift_end');
          break;
        case 'break-start':
          await workStatusStore.startBreak();
          break;
        case 'break-end':
          await workStatusStore.endBreak();
          break;
        case 'offsite-start':
          await workStatusStore.startOffsite();
          break;
        case 'offsite-end':
          await workStatusStore.endOffsite();
          break;
      }

      successfulIds.push(i);
      console.log(`Successfully synced action: ${action.type}`);
    } catch (error) {
      console.error(`Failed to sync action ${action.type}:`, error);
    }
  }

  // Remove successful actions
  const remainingActions = actions.filter((_, index) => !successfulIds.includes(index));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingActions));

  console.log(`Sync complete. ${successfulIds.length} synced, ${remainingActions.length} remaining.`);
}

// Escuchar eventos de conexión
export function setupOfflineListeners(): void {
  // Sincronizar cuando se recupere la conexión
  window.addEventListener("online", () => {
    console.log("Connection restored, syncing pending actions...");
    syncPendingActions();
  });

  // Log cuando se pierda la conexión
  window.addEventListener("offline", () => {
    console.log("Connection lost, entering offline mode");
  });

  // Intentar sincronizar al cargar la página si hay conexión
  if (navigator.onLine) {
    // Esperar un poco para que los stores se inicialicen
    setTimeout(() => {
      syncPendingActions();
    }, 1000);
  }
}

// Obtener estado de la conexión
export function isOnline(): boolean {
  return navigator.onLine;
}

// Obtener número de acciones pendientes
export function getPendingActionsCount(): number {
  return getPendingActions().length;
}
