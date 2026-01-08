import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import type {
  Incident,
  IncidentFilters,
  IncidentStatus,
  IncidentType,
} from "../types";

export const useIncidentsStore = defineStore("incidents", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  // State
  const incidents = ref<Incident[]>([]);
  const loading = ref(false);

  // Helper function to extract array data from API response
  function extractArrayData<T>(response: any): T[] {
    let data;
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      data = response.data.data;
    } else {
      data = response.data;
    }
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  }

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

  const pendingCount = computed(() => pendingIncidents.value.length);

  const hasPendingIncidents = computed(() => pendingCount.value > 0);

  // Group by type
  const incidentsByType = computed(() => {
    const grouped: Record<IncidentType, Incident[]> = {
      unclosed_shift: [],
      late_arrival: [],
      early_departure: [],
      missing_checkout: [],
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

  // Actions
  async function fetchIncidents(filters?: IncidentFilters): Promise<void> {
    const employeeId = authStore.user?.employeeRecords?.[0]?.id;
    if (!employeeId) return;

    loading.value = true;
    try {
      const params = new URLSearchParams();
      params.append("employee_id", employeeId);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.type) params.append("type", filters.type);
      if (filters?.startDate) params.append("start_date", filters.startDate);
      if (filters?.endDate) params.append("end_date", filters.endDate);

      const response = await api.get(`/incidents?${params.toString()}`);
      incidents.value = extractArrayData<Incident>(response);
    } catch (error: any) {
      console.error("Error fetching incidents:", error);
      toast.error("Failed to fetch incidents");
      incidents.value = [];
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    incidents.value = [];
  }

  return {
    // State
    incidents,
    loading,

    // Computed
    pendingIncidents,
    resolvedIncidents,
    validatedIncidents,
    markedAbsenceIncidents,
    pendingCount,
    hasPendingIncidents,
    incidentsByType,
    incidentsByStatus,

    // Actions
    fetchIncidents,
    reset,
  };
});
