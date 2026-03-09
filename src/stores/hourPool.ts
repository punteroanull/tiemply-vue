import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import type {
  EmployeePoolBalance,
  HourPoolEntry,
  PaginatedResponse,
  CompanyPoolSummary,
  EntryType,
  SourceType,
} from "../types";

export const useHourPoolStore = defineStore("hourPool", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  // State
  const balance = ref<EmployeePoolBalance | null>(null);
  const entries = ref<PaginatedResponse<HourPoolEntry> | null>(null);
  const companySummary = ref<CompanyPoolSummary | null>(null);
  const loading = ref(false);
  const loadingEntries = ref(false);
  const loadingSummary = ref(false);
  const hourPoolVisibleToEmployees = ref(false);

  // Helper function to extract data from API response
  function extractData<T>(response: any): T {
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      return response.data.data;
    }
    return response.data;
  }

  // Computed
  const canViewHourPool = computed(() =>
    authStore.isAdmin || authStore.isManager || authStore.isSupervisor || hourPoolVisibleToEmployees.value
  );
  const isCompanyOwes = computed(() => balance.value?.confirmed.status === "company_owes");
  const isEmployeeOwes = computed(() => balance.value?.confirmed.status === "employee_owes");
  const isEven = computed(() => balance.value?.confirmed.status === "even");
  const hasPendingOvertime = computed(() => (balance.value?.pendingOvertimeMinutes || 0) > 0);

  const currentPage = computed(() => entries.value?.currentPage || 1);
  const totalPages = computed(() => entries.value?.lastPage || 1);
  const totalEntries = computed(() => entries.value?.total || 0);

  // Actions
  async function fetchCompanySettings(): Promise<void> {
    try {
      const employeeId = authStore.user?.employeeRecords?.[0]?.id;
      if (!employeeId) return;

      const response = await api.get(`/employees/${employeeId}/company-settings`);
      let data: any;
      if (response.data && typeof response.data === "object" && "data" in response.data) {
        data = response.data.data;
      } else {
        data = response.data;
      }
      hourPoolVisibleToEmployees.value = !!data?.hourPoolVisibleToEmployees;
    } catch (error) {
      console.warn("Could not fetch hour pool company settings:", error);
      hourPoolVisibleToEmployees.value = false;
    }
  }

  async function fetchBalance(year?: number): Promise<void> {
    const employeeId = authStore.user?.employeeRecords?.[0]?.id;
    if (!employeeId || !canViewHourPool.value) return;

    loading.value = true;
    try {
      const params = new URLSearchParams();
      if (year) params.append("year", year.toString());

      const url = `/hour-pool/employee/${employeeId}/balance${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get(url);
      balance.value = extractData<EmployeePoolBalance>(response);
    } catch (error: any) {
      console.error("Error fetching hour pool balance:", error);
      toast.error("Failed to fetch hour pool balance");
      balance.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEntries(filters?: {
    startDate?: string;
    endDate?: string;
    type?: EntryType;
    sourceType?: SourceType;
    perPage?: number;
    page?: number;
  }): Promise<void> {
    const employeeId = authStore.user?.employeeRecords?.[0]?.id;
    if (!employeeId || !canViewHourPool.value) return;

    loadingEntries.value = true;
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append("start_date", filters.startDate);
      if (filters?.endDate) params.append("end_date", filters.endDate);
      if (filters?.type) params.append("type", filters.type);
      if (filters?.sourceType) params.append("source_type", filters.sourceType);
      if (filters?.perPage) params.append("per_page", filters.perPage.toString());
      if (filters?.page) params.append("page", filters.page.toString());

      const url = `/hour-pool/employee/${employeeId}/entries${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get(url);
      entries.value = extractData<PaginatedResponse<HourPoolEntry>>(response);
    } catch (error: any) {
      console.error("Error fetching hour pool entries:", error);
      toast.error("Failed to fetch hour pool entries");
      entries.value = null;
    } finally {
      loadingEntries.value = false;
    }
  }

  async function fetchCompanySummary(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<void> {
    const companyId = authStore.currentCompany?.id;
    if (!companyId) return;

    loadingSummary.value = true;
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append("start_date", filters.startDate);
      if (filters?.endDate) params.append("end_date", filters.endDate);

      const url = `/hour-pool/company/${companyId}/summary${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get(url);
      companySummary.value = extractData<CompanyPoolSummary>(response);
    } catch (error: any) {
      console.error("Error fetching company pool summary:", error);
      toast.error("Failed to fetch company pool summary");
      companySummary.value = null;
    } finally {
      loadingSummary.value = false;
    }
  }

  async function createAdjustment(
    employeeId: string,
    data: { type: EntryType; minutes: number; description: string }
  ): Promise<boolean> {
    try {
      await api.post(`/hour-pool/employee/${employeeId}/adjustment`, {
        type: data.type,
        minutes: data.minutes,
        description: data.description,
      });
      return true;
    } catch (error: any) {
      console.error("Error creating adjustment:", error);
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors).flat()[0] as string;
        toast.error(firstError);
      } else {
        toast.error(error.response?.data?.message || "Failed to create adjustment");
      }
      return false;
    }
  }

  function reset(): void {
    balance.value = null;
    entries.value = null;
    companySummary.value = null;
  }

  return {
    // State
    balance,
    entries,
    companySummary,
    loading,
    loadingEntries,
    loadingSummary,
    hourPoolVisibleToEmployees,

    // Computed
    canViewHourPool,
    isCompanyOwes,
    isEmployeeOwes,
    isEven,
    hasPendingOvertime,
    currentPage,
    totalPages,
    totalEntries,

    // Actions
    fetchCompanySettings,
    fetchBalance,
    fetchEntries,
    fetchCompanySummary,
    createAdjustment,
    reset,
  };
});
