import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../services/api";
import i18n from "../i18n";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import { apiErrorMessage, apiErrorMessages, unwrap, unwrapList } from "../utils/apiResponse";

export interface AbsenceType {
  id: string;
  uuid: string;
  name: string;
  code: string;
  description?: string;
  requiresApproval: boolean;
  affectsVacationBalance: boolean;
  isPaid: boolean;
}

export interface Absence {
  id: string;
  uuid: string;
  employeeId: string;
  absenceTypeId: string;
  requestId?: string;
  date: string;
  isPartial: boolean;
  startTime?: string;
  endTime?: string;
  notes?: string;
  absenceType?: AbsenceType;
  request?: AbsenceRequest;
}

export interface AbsenceRequestPeriod {
  id: string;
  startDate: string;
  endDate: string;
  isPartial: boolean;
  startTime?: string;
  endTime?: string;
  status: "pending" | "approved" | "rejected";
  daysCount: number;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  reviewer?: { id: string; name: string };
}

interface Employee {
  id: string;
  userId?: string;
  name?: string;
  user?: { id: string; name: string; email: string };
}

export interface AbsenceRequest {
  id: string;
  uuid: string;
  employeeId: string;
  absenceTypeId: string;
  startDate: string | null;
  endDate: string | null;
  isPartial: boolean;
  startTime?: string;
  endTime?: string;
  status: "pending" | "approved" | "rejected" | "partial";
  reviewedBy?: string;
  notes?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt?: string;
  daysCount: number;
  usesPeriods?: boolean;
  approvedDaysCount?: number;
  pendingDaysCount?: number;
  periods?: AbsenceRequestPeriod[];
  absenceType?: AbsenceType;
  employee?: Employee;
  reviewer?: { id: string; name: string };
}

export const useAbsencesStore = defineStore("absences", () => {
  const toast = useToast();
  const authStore = useAuthStore();
  const t = i18n.global.t;

  const absences = ref<Absence[]>([]);
  const absenceTypes = ref<AbsenceType[]>([]);
  const requests = ref<AbsenceRequest[]>([]);
  const pendingRequests = ref<AbsenceRequest[]>([]);
  const teamPendingRequests = ref<AbsenceRequest[]>([]);
  const teamReviewedRequests = ref<AbsenceRequest[]>([]);

  const loading = ref(false);
  const submitting = ref(false);
  const reviewing = ref(false);
  /** Why the last create or edit of a request was refused, for the form to show. */
  const submitErrors = ref<string[]>([]);

  // A failed fetch must not look like "there is nothing": views show a retry instead.
  const absencesError = ref(false);
  const requestsError = ref(false);
  const teamRequestsError = ref(false);

  // Fetches overlap (a view loads several lists at once), so `loading` only clears when
  // the last one finishes.
  let pendingFetches = 0;

  async function tracked<T>(silent: boolean, work: () => Promise<T>): Promise<T> {
    if (silent) return work();
    pendingFetches++;
    loading.value = true;
    try {
      return await work();
    } finally {
      pendingFetches--;
      if (pendingFetches === 0) loading.value = false;
    }
  }

  /** The employee record the rest of the app works with (first active one). */
  function currentEmployeeId(): string | null {
    return authStore.currentEmployee?.id ?? null;
  }

  /** The balance lives on the user, so anything that may change it reloads `/me`. */
  async function refreshBalance() {
    try {
      await authStore.fetchCurrentUser?.();
    } catch {
      // The request itself went through; a stale balance is corrected on the next load.
    }
  }

  async function fetchAbsenceTypes() {
    return tracked(false, async () => {
      try {
        const response = await api.get("/absence-types");
        absenceTypes.value = unwrapList<AbsenceType>(response);
      } catch (error) {
        toast.error(apiErrorMessage(error, t("absences.errors.fetchTypes")));
      }
    });
  }

  async function fetchAbsences(options: { silent?: boolean } = {}) {
    const employeeId = currentEmployeeId();
    if (!employeeId) return;

    return tracked(!!options.silent, async () => {
      try {
        const response = await api.get(`/employees/${employeeId}/absences`);
        absences.value = unwrapList<Absence>(response);
        absencesError.value = false;
      } catch (error) {
        absencesError.value = true;
        toast.error(apiErrorMessage(error, t("absences.errors.fetchAbsences")));
      }
    });
  }

  async function fetchAbsenceRequests(options: { silent?: boolean } = {}) {
    const employeeId = currentEmployeeId();
    if (!employeeId) return;

    return tracked(!!options.silent, async () => {
      try {
        const response = await api.get(`/employees/${employeeId}/absence-requests`);
        requests.value = unwrapList<AbsenceRequest>(response);
        requestsError.value = false;
      } catch (error) {
        requestsError.value = true;
        toast.error(apiErrorMessage(error, t("requests.errors.fetch")));
      }
    });
  }

  async function fetchPendingRequests(options: { silent?: boolean } = {}) {
    const employeeId = currentEmployeeId();
    if (!employeeId) return;

    return tracked(!!options.silent, async () => {
      try {
        const response = await api.get(`/requests/pending/employee/${employeeId}`);
        pendingRequests.value = unwrapList<AbsenceRequest>(response);
      } catch (error) {
        toast.error(apiErrorMessage(error, t("requests.errors.fetch")));
      }
    });
  }

  async function submitAbsenceRequest(requestData: any) {
    const employeeId = currentEmployeeId();
    if (!employeeId) {
      submitErrors.value = [t("newRequest.submitError")];
      return false;
    }

    submitting.value = true;
    submitErrors.value = [];

    try {
      await api.post("/requests", { ...requestData, employee_id: employeeId });

      toast.success(t("newRequest.submitSuccess"));
      // A type that needs no approval is approved on the spot and already took its days.
      await Promise.all([
        fetchAbsenceRequests({ silent: true }),
        fetchPendingRequests({ silent: true }),
        fetchAbsences({ silent: true }),
        refreshBalance(),
      ]);
      return true;
    } catch (error) {
      // The API is the authority on notice days and balance; show what it said.
      submitErrors.value = apiErrorMessages(error, t("newRequest.submitError"));
      return false;
    } finally {
      submitting.value = false;
    }
  }

  async function fetchRequestById(requestId: string): Promise<AbsenceRequest | null> {
    return tracked(false, async () => {
      try {
        const response = await api.get(`/requests/${requestId}`);
        return unwrap<AbsenceRequest>(response) ?? null;
      } catch (error) {
        toast.error(apiErrorMessage(error, t("requests.errors.fetchOne")));
        return null;
      }
    });
  }

  async function updateRequest(requestId: string, requestData: any): Promise<boolean> {
    submitting.value = true;
    submitErrors.value = [];

    try {
      await api.put(`/requests/${requestId}`, requestData);
      toast.success(t("requests.requestUpdated"));
      await Promise.all([
        fetchAbsenceRequests({ silent: true }),
        fetchPendingRequests({ silent: true }),
      ]);
      return true;
    } catch (error) {
      submitErrors.value = apiErrorMessages(error, t("requests.updateError"));
      return false;
    } finally {
      submitting.value = false;
    }
  }

  /** Withdraw one's own request. The API only allows it while it is fully pending. */
  async function cancelRequest(requestId: string): Promise<boolean> {
    submitting.value = true;

    try {
      await api.delete(`/requests/${requestId}`);
      toast.success(t("requests.cancelSuccess"));
      await Promise.all([
        fetchAbsenceRequests({ silent: true }),
        fetchPendingRequests({ silent: true }),
        refreshBalance(),
      ]);
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error, t("requests.cancelError")));
      return false;
    } finally {
      submitting.value = false;
    }
  }

  async function fetchTeamPendingRequests(options: { silent?: boolean } = {}) {
    if (!authStore.user?.id) return;

    return tracked(!!options.silent, async () => {
      try {
        const response = await api.get("/requests/pending");
        teamPendingRequests.value = unwrapList<AbsenceRequest>(response);
        teamRequestsError.value = false;
      } catch (error) {
        teamRequestsError.value = true;
        toast.error(apiErrorMessage(error, t("teamRequests.errors.fetch")));
      }
    });
  }

  /**
   * Requests already decided, in full or in part. These come from the general list, which
   * filters by one status at a time.
   */
  async function fetchTeamReviewedRequests(options: { silent?: boolean } = {}) {
    if (!authStore.user?.id) return;

    return tracked(!!options.silent, async () => {
      try {
        const [approved, rejected, partial] = await Promise.all([
          api.get("/requests", { params: { status: "approved" } }),
          api.get("/requests", { params: { status: "rejected" } }),
          // An API that does not know this filter yet must not take the other two down.
          api.get("/requests", { params: { status: "partial" } }).catch(() => null),
        ]);
        const newestFirst = (a: AbsenceRequest, b: AbsenceRequest) =>
          (b.reviewedAt ?? b.createdAt ?? "").localeCompare(a.reviewedAt ?? a.createdAt ?? "");

        // A partial request with periods still pending is already in the pending list.
        const pendingIds = new Set(teamPendingRequests.value.map((request) => request.id));
        const seen = new Set<string>();

        teamReviewedRequests.value = [
          ...unwrapList<AbsenceRequest>(approved),
          ...unwrapList<AbsenceRequest>(rejected),
          ...(partial ? unwrapList<AbsenceRequest>(partial) : []),
        ]
          .filter((request) => {
            if (pendingIds.has(request.id) || seen.has(request.id)) return false;
            seen.add(request.id);
            return true;
          })
          .sort(newestFirst);
        teamRequestsError.value = false;
      } catch (error) {
        teamRequestsError.value = true;
        toast.error(apiErrorMessage(error, t("teamRequests.errors.fetch")));
      }
    });
  }

  /** Runs one review call. The list refreshes in place: no spinner, no lost scroll. */
  async function review(call: () => Promise<unknown>): Promise<boolean> {
    reviewing.value = true;

    try {
      await call();
      await fetchTeamPendingRequests({ silent: true });
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error, t("teamRequests.errors.review")));
      return false;
    } finally {
      reviewing.value = false;
    }
  }

  function reviewPeriod(
    periodId: string,
    status: "approved" | "rejected",
    rejectionReason?: string
  ): Promise<boolean> {
    const data: { status: string; rejection_reason?: string } = { status };
    if (status === "rejected" && rejectionReason) {
      data.rejection_reason = rejectionReason;
    }
    return review(() => api.post(`/requests/periods/${periodId}/review`, data));
  }

  function approveAllPeriods(requestId: string): Promise<boolean> {
    return review(() => api.post(`/requests/${requestId}/approve-all-periods`));
  }

  function rejectAllPeriods(requestId: string, rejectionReason: string): Promise<boolean> {
    return review(() =>
      api.post(`/requests/${requestId}/reject-all-periods`, {
        rejection_reason: rejectionReason,
      })
    );
  }

  /** Whole-request review, for requests with a single date range and no periods. */
  function approveRequest(requestId: string): Promise<boolean> {
    return review(() => api.post("/requests/approve", { request_id: requestId }));
  }

  function rejectRequest(requestId: string, rejectionReason: string): Promise<boolean> {
    return review(() =>
      api.post("/requests/reject", {
        request_id: requestId,
        rejection_reason: rejectionReason,
      })
    );
  }

  /** Drop everything cached for the current identity. */
  function reset() {
    absences.value = [];
    absenceTypes.value = [];
    requests.value = [];
    pendingRequests.value = [];
    teamPendingRequests.value = [];
    teamReviewedRequests.value = [];
    absencesError.value = false;
    requestsError.value = false;
    teamRequestsError.value = false;
    submitErrors.value = [];
  }

  return {
    reset,
    absences,
    absenceTypes,
    requests,
    pendingRequests,
    teamPendingRequests,
    teamReviewedRequests,
    loading,
    submitting,
    submitErrors,
    reviewing,
    absencesError,
    requestsError,
    teamRequestsError,
    fetchAbsenceTypes,
    fetchAbsences,
    fetchAbsenceRequests,
    fetchPendingRequests,
    fetchTeamPendingRequests,
    fetchTeamReviewedRequests,
    submitAbsenceRequest,
    fetchRequestById,
    updateRequest,
    cancelRequest,
    reviewPeriod,
    approveAllPeriods,
    rejectAllPeriods,
    approveRequest,
    rejectRequest,
  };
});
