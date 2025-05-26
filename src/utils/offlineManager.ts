import { useWorkStatusStore } from '../stores/workStatus'

interface PendingAction {
  type: 'check-in' | 'check-out';
  timestamp: number;
  employeeId: string;
  data: any;
}

// Guardar acciones pendientes en el almacenamiento local
export function savePendingAction(action: PendingAction): void {
  const pendingActions = getPendingActions();
  pendingActions.push(action);
  localStorage.setItem('tiemply_pending_actions', JSON.stringify(pendingActions));
}

// Obtener acciones pendientes
export function getPendingActions(): PendingAction[] {
  const stored = localStorage.getItem('tiemply_pending_actions');
  return stored ? JSON.parse(stored) : [];
}

// Eliminar una acción pendiente
export function removePendingAction(index: number): void {
  const pendingActions = getPendingActions();
  pendingActions.splice(index, 1);
  localStorage.setItem('tiemply_pending_actions', JSON.stringify(pendingActions));
}

// Sincronizar acciones pendientes
export async function syncPendingActions(): Promise<void> {
  if (!navigator.onLine) return;
  
  const workStatusStore = useWorkStatusStore();
  const pendingActions = getPendingActions();
  
  for (let i = 0; i < pendingActions.length; i++) {
    const action = pendingActions[i];
    try {
      if (action.type === 'check-in') {
        await workStatusStore.checkIn(true, action.data);
      } else if (action.type === 'check-out') {
        await workStatusStore.checkOut(true, action.data);
      }
      
      // Eliminar acción sincronizada
      removePendingAction(i);
      i--; // Ajustar índice después de eliminar
    } catch (error) {
      console.error('Error al sincronizar acción pendiente:', error);
    }
  }
}

// Escuchar eventos de conexión
export function setupOfflineListeners(): void {
  window.addEventListener('online', syncPendingActions);
  
  // Intentar sincronizar al cargar la página
  if (navigator.onLine) {
    syncPendingActions();
  }
}