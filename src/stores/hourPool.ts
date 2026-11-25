import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import i18n from "../i18n";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import { unwrap, unwrapList, apiErrorMessage } from "../utils/apiResponse";
import { isFeatureUnavailable } from "../utils/featureGate";
import type {
  EmployeePoolBalance,
  HourPoolEntry,
  PaginatedResponse,
  CompanyPoolSummary,
  EntryType,
  SourceType,
} from "../types";

export interface PoolEmployeeOption {
  id: string;
  name: string;
}

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
  const balanceError = ref(false);
  const entriesError = ref(false);
  const summaryError = ref(false);
  /** The company plan does not include the hour pool (feature-gated 403). */
  const featureUnavailable = ref(false);
  const hourPoolVisibleToEmployees = ref(false);
  /** False until the company settings answered, so screens can wait before deciding. */
  const settingsLoaded = ref(false);

  // Only the latest request of each kind may write.
  let balanceRequestId = 0;
  let entriesRequestId = 0;

  // Computed
  /** Company-wide figures and manual adjustments: the API allows admins and managers. */
  const canViewCompanySummary = computed(() => authStore.isAdmin || authStore.isManager);

  /**
   * Own balance and entries. Mirrors the API: admins and managers always, anyone else
   * (department supervisors included) only when the company shows the pool to employees.
   */
  const canViewHourPool = computed(
    () => canViewCompanySummary.value || hourPoolVisibleToEmployees.value
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
      const employeeId = authStore.currentEmployee?.id;
      if (!employeeId) return;

      const response = await api.get(`/employees/${employeeId}/company-settings`);
      hourPoolVisibleToEmployees.value = !!unwrap<any>(response)?.hourPoolVisibleToEmployees;
    } catch (error) {
      console.warn("Could not fetch hour pool company settings:", error);
      hourPoolVisibleToEmployees.value = false;
    } finally {
      settingsLoaded.value = true;
    }
  }

  /**
   * The confirmed balance is the running total since the start; `year` only scopes the
   * pending overtime added on top of it.
   */
  async function fetchBalance(year?: number): Promise<void> {
    const employeeId = authStore.currentEmployee?.id;
    if (!employeeId || !canViewHourPool.value) return;

    const id = ++balanceRequestId;
    loading.value = true;
    balanceError.value = false;
    try {
      const params = new URLSearchParams();
      if (year) params.append("year", year.toString());

      const url = `/hour-pool/employee/${employeeId}/balance${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get(url);
      if (id !== balanceRequestId) return;
      balance.value = unwrap<EmployeePoolBalance>(response);
      featureUnavailable.value = false;
    } catch (error: any) {
      if (id !== balanceRequestId) return;
      balance.value = null;
      if (isFeatureUnavailable(error)) {
        featureUnavailable.value = true;
      } else {
        console.error("Error fetching hour pool balance:", error);
        balanceError.value = true;
      }
    } finally {
      if (id === balanceRequestId) loading.value = false;
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
    const employeeId = authStore.currentEmployee?.id;
    if (!employeeId || !canViewHourPool.value) return;

    const id = ++entriesRequestId;
    loadingEntries.value = true;
    entriesError.value = false;
    try {
      const params = new URLSearchParams();
      // The API only applies the range when both ends are present.
      if (filters?.startDate && filters?.endDate) {
        params.append("start_date", filters.startDate);
        params.append("end_date", filters.endDate);
      }
      if (filters?.type) params.append("type", filters.type);
      if (filters?.sourceType) params.append("source_type", filters.sourceType);
      if (filters?.perPage) params.append("per_page", filters.perPage.toString());
      if (filters?.page) params.append("page", filters.page.toString());

      const url = `/hour-pool/employee/${employeeId}/entries${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get(url);
      if (id !== entriesRequestId) return;
      entries.value = unwrap<PaginatedResponse<HourPoolEntry>>(response);
    } catch (error: any) {
      if (id !== entriesRequestId) return;
      entries.value = null;
      if (isFeatureUnavailable(error)) {
        featureUnavailable.value = true;
      } else {
        console.error("Error fetching hour pool entries:", error);
        entriesError.value = true;
      }
    } finally {
      if (id === entriesRequestId) loadingEntries.value = false;
    }
  }

  async function fetchCompanySummary(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<void> {
    const companyId = authStore.currentCompany?.id;
    if (!companyId) {
      // Nothing to ask for: say so instead of leaving a blank page.
      companySummary.value = null;
      summaryError.value = true;
      return;
    }

    loadingSummary.value = true;
    summaryError.value = false;
    try {
      const params = new URLSearchParams();
      if (filters?.startDate && filters?.endDate) {
        params.append("start_date", filters.startDate);
        params.append("end_date", filters.endDate);
      }

      const url = `/hour-pool/company/${companyId}/summary${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get(url);
      companySummary.value = unwrap<CompanyPoolSummary>(response);
      featureUnavailable.value = false;
    } catch (error: any) {
      companySummary.value = null;
      if (isFeatureUnavailable(error)) {
        featureUnavailable.value = true;
      } else {
        console.error("Error fetching company pool summary:", error);
        summaryError.value = true;
      }
    } finally {
      loadingSummary.value = false;
    }
  }

  /**
   * Every employee of the company, so an adjustment can be given to someone whose pool is
   * still empty (the summary only lists employees that already have entries).
   */
  async function fetchCompanyEmployees(): Promise<PoolEmployeeOption[] | null> {
    const companyId = authStore.currentCompany?.id;
    if (!companyId) return null;

    try {
      const response = await api.get(`/companies/${companyId}/employees`);
      return unwrapList<any>(response)
        .map((employee) => ({
          id: String(employee.id),
          name: employee.user?.name || i18n.global.t("common.unknown"),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error fetching company employees:", error);
      return null;
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
      toast.error(apiErrorMessage(error, i18n.global.t("hourPool.adjustment.error")));
      return false;
    }
  }

  function reset(): void {
    balanceRequestId++;
    entriesRequestId++;
    balance.value = null;
    entries.value = null;
    companySummary.value = null;
    loading.value = false;
    loadingEntries.value = false;
    loadingSummary.value = false;
    balanceError.value = false;
    entriesError.value = false;
    summaryError.value = false;
    featureUnavailable.value = false;
    // Belongs to the previous identity's company: must not leak into the next session.
    hourPoolVisibleToEmployees.value = false;
    settingsLoaded.value = false;
  }

  return {
    // State
    balance,
    entries,
    companySummary,
    loading,
    loadingEntries,
    loadingSummary,
    balanceError,
    entriesError,
    summaryError,
    featureUnavailable,
    hourPoolVisibleToEmployees,
    settingsLoaded,

    // Computed
    canViewHourPool,
    canViewCompanySummary,
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
    fetchCompanyEmployees,
    createAdjustment,
    reset,
  };
});
