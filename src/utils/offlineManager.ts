// src/utils/offlineManager.ts
import { useWorkStatusStore } from "../stores/workStatus";

interface PendingAction {
  type: "check-in" | "check-out";
  timestamp: number;
  employeeId: string;
  data: any;
  location?: string; // Datos de geolocalización si están disponibles
}

// Guardar acciones pendientes en el almacenamiento local
export function savePendingAction(action: PendingAction): void {
  const pendingActions = getPendingActions();
  pendingActions.push(action);
  localStorage.setItem(
    "tiemply_pending_actions",
    JSON.stringify(pendingActions)
  );
}

// Obtener acciones pendientes
export function getPendingActions(): PendingAction[] {
  const stored = localStorage.getItem("tiemply_pending_actions");
  return stored ? JSON.parse(stored) : [];
}

// Eliminar una acción pendiente
export function removePendingAction(index: number): void {
  const pendingActions = getPendingActions();
  pendingActions.splice(index, 1);
  localStorage.setItem(
    "tiemply_pending_actions",
    JSON.stringify(pendingActions)
  );
}

// Limpiar todas las acciones pendientes
export function clearPendingActions(): void {
  localStorage.removeItem("tiemply_pending_actions");
}

// Sincronizar acciones pendientes cuando se recupere la conexión
export async function syncPendingActions(): Promise<void> {
  if (!navigator.onLine) return;

  const workStatusStore = useWorkStatusStore();
  const pendingActions = getPendingActions();

  if (pendingActions.length === 0) return;

  console.log(`Syncing ${pendingActions.length} pending actions...`);

  for (let i = 0; i < pendingActions.length; i++) {
    const action = pendingActions[i];
    try {
      let success = false;

      if (action.type === "check-in") {
        // Incluir datos de ubicación si están disponibles
        const checkInData = {
          ...action.data,
          location: action.location || undefined,
        };
        success = await workStatusStore.checkIn();
      } else if (action.type === "check-out") {
        // Incluir datos de ubicación si están disponibles
        const checkOutData = {
          ...action.data,
          location: action.location || undefined,
        };
        success = await workStatusStore.checkOut();
      }

      if (success) {
        // Eliminar acción sincronizada exitosamente
        removePendingAction(i);
        i--; // Ajustar índice después de eliminar
        console.log(`Successfully synced ${action.type} action`);
      }
    } catch (error) {
      console.error(
        `Error al sincronizar acción pendiente ${action.type}:`,
        error
      );
      // No eliminar la acción si falla, para reintentarlo más tarde
    }
  }

  const remainingActions = getPendingActions();
  if (remainingActions.length === 0) {
    console.log("All pending actions synchronized successfully");
  } else {
    console.log(`${remainingActions.length} actions remain pending`);
  }
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
