import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import type {
  OvertimeSummary,
  OvertimeRecord,
  OvertimeStatus,
} from "../types";

export const useOvertimeStore = defineStore("overtime", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  // State
  const summary = ref<OvertimeSummary | null>(null);
  const records = ref<OvertimeRecord[]>([]);
  const loading = ref(false);

  // Helper function to extract data from API response
  function extractData<T>(response: any): T {
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      return response.data.data;
    }
    return response.data;
  }

  // Computed
  const progressPercentage = computed(() => {
    if (!summary.value || !summary.value.annualLimit) return 0;
    return Math.min(
      Math.round((summary.value.totalHours / summary.value.annualLimit) * 100),
      100
    );
  });

  const isNearLimit = computed(() => progressPercentage.value >= 80);

  const isAtLimit = computed(() => progressPercentage.value >= 100);

  const formattedTotalOvertime = computed(() => {
    if (!summary.value) return "0h";
    const hours = Math.floor(summary.value.totalHours);
    const minutes = Math.round((summary.value.totalHours - hours) * 60);
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  });

  const formattedRemainingLimit = computed(() => {
    if (!summary.value) return "0h";
    const remaining = summary.value.remainingLimit;
    const hours = Math.floor(remaining);
    const minutes = Math.round((remaining - hours) * 60);
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  });

  const pendingRecords = computed(() =>
    records.value.filter((r) => r.status === "pending")
  );

  const approvedRecords = computed(() =>
    records.value.filter((r) => r.status === "approved")
  );

  const rejectedRecords = computed(() =>
    records.value.filter((r) => r.status === "rejected")
  );

  const hasPendingOvertime = computed(() => pendingRecords.value.length > 0);

  // Actions
  async function fetchSummary(year?: number): Promise<void> {
    const employeeId = authStore.user?.employeeRecords?.[0]?.id;
    if (!employeeId) return;

    loading.value = true;
    try {
      const currentYear = year || new Date().getFullYear();
      const response = await api.get(
        `/overtime/employee/${employeeId}/summary/${currentYear}`
      );
      summary.value = extractData<OvertimeSummary>(response);
    } catch (error: any) {
      console.error("Error fetching overtime summary:", error);
      toast.error("Failed to fetch overtime summary");
      summary.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRecords(filters?: {
    status?: OvertimeStatus;
    dateFrom?: string;
    dateUntil?: string;
  }): Promise<void> {
    const employeeId = authStore.user?.employeeRecords?.[0]?.id;
    if (!employeeId) return;

    loading.value = true;
    try {
      const params = new URLSearchParams();
      params.append("employee_id", employeeId);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.dateFrom) params.append("date_from", filters.dateFrom);
      if (filters?.dateUntil) params.append("date_until", filters.dateUntil);

      const response = await api.get(`/overtime?${params.toString()}`);
      records.value = extractData<OvertimeRecord[]>(response);
    } catch (error: any) {
      console.error("Error fetching overtime records:", error);
      toast.error("Failed to fetch overtime records");
      records.value = [];
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    summary.value = null;
    records.value = [];
  }

  return {
    // State
    summary,
    records,
    loading,

    // Computed
    progressPercentage,
    isNearLimit,
    isAtLimit,
    formattedTotalOvertime,
    formattedRemainingLimit,
    pendingRecords,
    approvedRecords,
    rejectedRecords,
    hasPendingOvertime,

    // Actions
    fetchSummary,
    fetchRecords,
    reset,
  };
});
