import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useAuthStore } from "./auth";
import { unwrapList, unwrapPageMeta } from "../utils/apiResponse";
import type { PageMeta } from "../utils/apiResponse";
import type {
  Incident,
  IncidentFilters,
  IncidentStatus,
  IncidentType,
} from "../types";

export const useIncidentsStore = defineStore("incidents", () => {
  const authStore = useAuthStore();

  // State
  const incidents = ref<Incident[]>([]);
  const pageMeta = ref<PageMeta | null>(null);
  /** Pending incidents of the employee across every page, whatever filter is on screen. */
  const pendingTotal = ref(0);
  const loading = ref(false);
  const error = ref(false);

  // Only the latest request may write, so a slow older response cannot replace a newer one.
  let requestId = 0;

  // Computed
  const pendingIncidents = computed(() =>
    incidents.value.filter((i) => i.status === "pending")
  );

  const resolvedIncidents = computed(() =>
    incidents.value.filter((i) => i.status === "resolved")
  );

  const validatedIncidents = computed(() =>
    incidents.value.filter((i) => i.status === "validated")
  );

  const markedAbsenceIncidents = computed(() =>
    incidents.value.filter((i) => i.status === "marked_absence")
  );

  const pendingCount = computed(() => pendingTotal.value);

  const hasPendingIncidents = computed(() => pendingCount.value > 0);

  const currentPage = computed(() => pageMeta.value?.currentPage ?? 1);
  const totalPages = computed(() => pageMeta.value?.lastPage ?? 1);
  const totalIncidents = computed(() => pageMeta.value?.total ?? incidents.value.length);

  // Group by type
  const incidentsByType = computed(() => {
    const grouped: Record<IncidentType, Incident[]> = {
      unclosed_shift: [],
      late_arrival: [],
      early_departure: [],
      missing_checkout: [],
      manual_adjustment: [],
    };

    incidents.value.forEach((incident) => {
      if (grouped[incident.type]) {
        grouped[incident.type].push(incident);
      }
    });

    return grouped;
  });

  // Group by status
  const incidentsByStatus = computed(() => {
    const grouped: Record<IncidentStatus, Incident[]> = {
      pending: [],
      resolved: [],
      validated: [],
      marked_absence: [],
    };

    incidents.value.forEach((incident) => {
      if (grouped[incident.status]) {
        grouped[incident.status].push(incident);
      }
    });

    return grouped;
  });

  function buildParams(employeeId: string, filters?: IncidentFilters): URLSearchParams {
    const params = new URLSearchParams();
    params.append("employee_id", employeeId);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.type) params.append("type", filters.type);
    // The API only applies the range when both ends are present.
    if (filters?.startDate && filters?.endDate) {
      params.append("start_date", filters.startDate);
      params.append("end_date", filters.endDate);
    }
    if (filters?.page && filters.page > 1) params.append("page", filters.page.toString());
    return params;
  }

  // Actions
  async function fetchIncidents(filters?: IncidentFilters): Promise<void> {
    const employeeId = authStore.currentEmployee?.id;
    if (!employeeId) return;

    const id = ++requestId;
    loading.value = true;
    error.value = false;
    try {
      // The endpoint paginates (20 per page): the rows are in `data.data`.
      const response = await api.get(`/incidents?${buildParams(employeeId, filters).toString()}`);
      if (id !== requestId) return;

      incidents.value = unwrapList<Incident>(response);
      pageMeta.value = unwrapPageMeta(response);

      const unfilteredByType = !filters?.type && !(filters?.startDate && filters?.endDate);
      if (filters?.status === "pending" && unfilteredByType) {
        // This very request already counted them.
        pendingTotal.value = pageMeta.value?.total ?? incidents.value.length;
      } else {
        await fetchPendingTotal(employeeId, id);
      }
    } catch (err) {
      if (id !== requestId) return;
      console.error("Error fetching incidents:", err);
      incidents.value = [];
      pageMeta.value = null;
      error.value = true;
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  async function fetchPendingTotal(employeeId: string, id: number): Promise<void> {
    try {
      const response = await api.get(
        `/incidents?${buildParams(employeeId, { status: "pending" }).toString()}`
      );
      if (id !== requestId) return;
      pendingTotal.value = unwrapPageMeta(response)?.total ?? unwrapList(response).length;
    } catch (err) {
      // The list itself loaded; a missing count is not worth failing the screen for.
      console.warn("Could not count pending incidents:", err);
    }
  }

  function reset(): void {
    requestId++;
    incidents.value = [];
    pageMeta.value = null;
    pendingTotal.value = 0;
    loading.value = false;
    error.value = false;
  }

  return {
    // State
    incidents,
    pageMeta,
    loading,
    error,

    // Computed
    pendingIncidents,
    resolvedIncidents,
    validatedIncidents,
    markedAbsenceIncidents,
    pendingCount,
    hasPendingIncidents,
    currentPage,
    totalPages,
    totalIncidents,
    incidentsByType,
    incidentsByStatus,

    // Actions
    fetchIncidents,
    reset,
  };
});
