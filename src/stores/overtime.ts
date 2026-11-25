import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useAuthStore } from "./auth";
import { unwrap, unwrapList } from "../utils/apiResponse";
import { formatHoursAsDuration } from "../utils/apiDates";
import { isFeatureUnavailable } from "../utils/featureGate";
import type {
  OvertimeSummary,
  OvertimeRecord,
  OvertimeStatus,
  OvertimeMonthSummary,
} from "../types";

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// `hours` is a decimal column, which Laravel serialises as a string ("1.50").
function normalizeRecord(record: any): OvertimeRecord {
  return { ...record, hours: toNumber(record?.hours) };
}

function normalizeSummary(raw: any): OvertimeSummary {
  const breakdown: Record<string, OvertimeMonthSummary> = {};
  // An empty breakdown arrives as `[]`, a filled one as an object keyed by "yyyy-MM".
  if (raw?.monthlyBreakdown && !Array.isArray(raw.monthlyBreakdown)) {
    for (const [month, value] of Object.entries<any>(raw.monthlyBreakdown)) {
      breakdown[month] = {
        totalHours: toNumber(value?.totalHours),
        approvedHours: toNumber(value?.approvedHours),
        pendingHours: toNumber(value?.pendingHours),
        rejectedHours: toNumber(value?.rejectedHours),
        count: toNumber(value?.count),
      };
    }
  }

  return {
    employeeId: raw?.employeeId,
    employeeName: raw?.employeeName,
    year: toNumber(raw?.year),
    approvedHours: toNumber(raw?.approvedHours),
    pendingHours: toNumber(raw?.pendingHours),
    annualLimit: toNumber(raw?.annualLimit),
    remainingHours: toNumber(raw?.remainingHours),
    usagePercentage: toNumber(raw?.usagePercentage),
    monthlyBreakdown: breakdown,
    records: Array.isArray(raw?.records) ? raw.records.map(normalizeRecord) : [],
  };
}

export const useOvertimeStore = defineStore("overtime", () => {
  const authStore = useAuthStore();

  // State
  const summary = ref<OvertimeSummary | null>(null);
  const records = ref<OvertimeRecord[]>([]);
  const loading = ref(false);
  const error = ref(false);
  /** The company plan does not include overtime (feature-gated 403). */
  const featureUnavailable = ref(false);

  let requestId = 0;

  // Computed
  /** Approved plus pending: everything registered this year that was not rejected. */
  const totalHours = computed(
    () => (summary.value?.approvedHours ?? 0) + (summary.value?.pendingHours ?? 0)
  );

  /** Share of the annual limit already used. The limit counts approved hours only. */
  const progressPercentage = computed(() => {
    if (!summary.value || summary.value.annualLimit <= 0) return 0;
    const percentage = (summary.value.approvedHours / summary.value.annualLimit) * 100;
    return Math.max(0, Math.min(Math.round(percentage), 100));
  });

  const isNearLimit = computed(() => progressPercentage.value >= 80);

  const isAtLimit = computed(() => progressPercentage.value >= 100);

  const formattedTotalOvertime = computed(() => formatHoursAsDuration(totalHours.value));

  const formattedRemainingLimit = computed(() =>
    formatHoursAsDuration(summary.value?.remainingHours ?? 0)
  );

  const pendingRecords = computed(() =>
    records.value.filter((r) => r.status === "pending")
  );

  const approvedRecords = computed(() =>
    records.value.filter((r) => r.status === "approved")
  );

  const rejectedRecords = computed(() =>
    records.value.filter((r) => r.status === "rejected")
  );

  const hasPendingOvertime = computed(
    () => pendingRecords.value.length > 0 || (summary.value?.pendingHours ?? 0) > 0
  );

  // Actions
  async function fetchSummary(year?: number): Promise<void> {
    const employeeId = authStore.currentEmployee?.id;
    if (!employeeId) return;

    const id = ++requestId;
    loading.value = true;
    error.value = false;
    featureUnavailable.value = false;
    try {
      const currentYear = year || new Date().getFullYear();
      const response = await api.get(
        `/overtime/employee/${employeeId}/summary/${currentYear}`
      );
      if (id !== requestId) return;
      summary.value = normalizeSummary(unwrap(response));
    } catch (err) {
      if (id !== requestId) return;
      summary.value = null;
      if (isFeatureUnavailable(err)) {
        featureUnavailable.value = true;
      } else {
        console.error("Error fetching overtime summary:", err);
        error.value = true;
      }
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  /** One page (20 rows) of the employee's records, newest first. */
  async function fetchRecords(filters?: {
    status?: OvertimeStatus;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
  }): Promise<void> {
    const employeeId = authStore.currentEmployee?.id;
    if (!employeeId) return;

    try {
      const params = new URLSearchParams();
      params.append("employee_id", employeeId);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.year) params.append("year", filters.year.toString());
      if (filters?.month) params.append("month", filters.month.toString());
      // The API only applies the range when both ends are present.
      if (filters?.startDate && filters?.endDate) {
        params.append("start_date", filters.startDate);
        params.append("end_date", filters.endDate);
      }
      if (filters?.page && filters.page > 1) params.append("page", filters.page.toString());

      const response = await api.get(`/overtime?${params.toString()}`);
      records.value = unwrapList<any>(response).map(normalizeRecord);
    } catch (err) {
      if (!isFeatureUnavailable(err)) {
        console.error("Error fetching overtime records:", err);
      }
      records.value = [];
    }
  }

  function reset(): void {
    requestId++;
    summary.value = null;
    records.value = [];
    loading.value = false;
    error.value = false;
    featureUnavailable.value = false;
  }

  return {
    // State
    summary,
    records,
    loading,
    error,
    featureUnavailable,

    // Computed
    totalHours,
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
