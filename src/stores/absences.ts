import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";

interface AbsenceType {
  id: string;
  uuid: string;
  name: string;
  code: string;
  description?: string;
  requiresApproval: boolean;
  affectsVacationBalance: boolean;
  isPaid: boolean;
}

interface Absence {
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

interface AbsenceRequestPeriod {
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
  name?: string;
  user?: { id: string; name: string; email: string };
}

interface AbsenceRequest {
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
  daysCount: number;
  usesPeriods?: boolean;
  approvedDaysCount?: number;
  pendingDaysCount?: number;
  periods?: AbsenceRequestPeriod[];
  absenceType?: AbsenceType;
  employee?: Employee;
}

export const useAbsencesStore = defineStore("absences", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  const absences = ref<Absence[]>([]);
  const absenceTypes = ref<AbsenceType[]>([]);
  const requests = ref<AbsenceRequest[]>([]);
  const pendingRequests = ref<AbsenceRequest[]>([]);
  const teamPendingRequests = ref<AbsenceRequest[]>([]);

  const loading = ref(false);
  const submitting = ref(false);
  const reviewing = ref(false);

  // Helper function to extract array data from API response
  function extractArrayData<T>(response: any): T[] {
    let data;
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      data = response.data.data;
    } else {
      data = response.data;
    }
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  }

  async function fetchAbsenceTypes() {
    loading.value = true;

    try {
      const response = await api.get("/absence-types");
      absenceTypes.value = extractArrayData<AbsenceType>(response);
    } catch (error) {
      console.error("Error fetching absence types:", error);
      toast.error("Failed to fetch absence types");
    } finally {
      loading.value = false;
    }
  }

  async function fetchAbsences() {
    if (!authStore.user?.id) return;

    loading.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.get(`/employees/${employeeId}/absences`);
      absences.value = extractArrayData<Absence>(response);
    } catch (error) {
      console.error("Error fetching absences:", error);
      toast.error("Failed to fetch your absences");
    } finally {
      loading.value = false;
    }
  }

  async function fetchAbsenceRequests() {
    if (!authStore.user?.id) return;

    loading.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.get(
        `/employees/${employeeId}/absence-requests`
      );
      requests.value = extractArrayData<AbsenceRequest>(response);
    } catch (error) {
      console.error("Error fetching absence requests:", error);
      toast.error("Failed to fetch your absence requests");
    } finally {
      loading.value = false;
    }
  }

  async function fetchPendingRequests() {
    if (!authStore.user?.id) return;

    loading.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.get(
        `/requests/pending/employee/${employeeId}`
      );
      pendingRequests.value = extractArrayData<AbsenceRequest>(response);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      toast.error("Failed to fetch your pending requests");
    } finally {
      loading.value = false;
    }
  }

  async function submitAbsenceRequest(requestData: any) {
    if (!authStore.user?.id) return false;

    submitting.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const data = {
        ...requestData,
        employee_id: employeeId,
      };

      await api.post("/requests", data);

      toast.success("Absence request submitted successfully");
      await fetchAbsenceRequests();
      await fetchPendingRequests();
      return true;
    } catch (error: any) {
      console.error("Error submitting absence request:", error);
      toast.error(
        error.response?.data?.message || "Failed to submit absence request"
      );
      return false;
    } finally {
      submitting.value = false;
    }
  }

  async function fetchRequestById(requestId: string): Promise<AbsenceRequest | null> {
    loading.value = true;

    try {
      const response = await api.get(`/requests/${requestId}`);
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      console.error("Error fetching request:", error);
      toast.error("Failed to fetch request details");
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateRequest(requestId: string, requestData: any): Promise<boolean> {
    submitting.value = true;

    try {
      await api.put(`/requests/${requestId}`, requestData);
      toast.success("Request updated successfully");
      await fetchAbsenceRequests();
      await fetchPendingRequests();
      return true;
    } catch (error: any) {
      console.error("Error updating request:", error);
      toast.error(
        error.response?.data?.message || "Failed to update request"
      );
      return false;
    } finally {
      submitting.value = false;
    }
  }

  async function fetchTeamPendingRequests() {
    if (!authStore.user?.id) return;

    loading.value = true;

    try {
      const response = await api.get('/requests/pending');
      teamPendingRequests.value = extractArrayData<AbsenceRequest>(response);
    } catch (error) {
      console.error("Error fetching team pending requests:", error);
      toast.error("Failed to fetch team pending requests");
    } finally {
      loading.value = false;
    }
  }

  async function reviewPeriod(
    periodId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<boolean> {
    reviewing.value = true;

    try {
      const data: { status: string; rejection_reason?: string } = { status };
      if (status === 'rejected' && rejectionReason) {
        data.rejection_reason = rejectionReason;
      }

      await api.post(`/requests/periods/${periodId}/review`, data);
      toast.success(status === 'approved' ? "Period approved" : "Period rejected");
      await fetchTeamPendingRequests();
      return true;
    } catch (error: any) {
      console.error("Error reviewing period:", error);
      toast.error(
        error.response?.data?.message || "Failed to review period"
      );
      return false;
    } finally {
      reviewing.value = false;
    }
  }

  async function approveAllPeriods(requestId: string): Promise<boolean> {
    reviewing.value = true;

    try {
      await api.post(`/requests/${requestId}/approve-all-periods`);
      toast.success("All periods approved");
      await fetchTeamPendingRequests();
      return true;
    } catch (error: any) {
      console.error("Error approving all periods:", error);
      toast.error(
        error.response?.data?.message || "Failed to approve all periods"
      );
      return false;
    } finally {
      reviewing.value = false;
    }
  }

  async function rejectAllPeriods(requestId: string, rejectionReason: string): Promise<boolean> {
    reviewing.value = true;

    try {
      await api.post(`/requests/${requestId}/reject-all-periods`, {
        rejection_reason: rejectionReason
      });
      toast.success("All periods rejected");
      await fetchTeamPendingRequests();
      return true;
    } catch (error: any) {
      console.error("Error rejecting all periods:", error);
      toast.error(
        error.response?.data?.message || "Failed to reject all periods"
      );
      return false;
    } finally {
      reviewing.value = false;
    }
  }

  return {
    absences,
    absenceTypes,
    requests,
    pendingRequests,
    teamPendingRequests,
    loading,
    submitting,
    reviewing,
    fetchAbsenceTypes,
    fetchAbsences,
    fetchAbsenceRequests,
    fetchPendingRequests,
    fetchTeamPendingRequests,
    submitAbsenceRequest,
    fetchRequestById,
    updateRequest,
    reviewPeriod,
    approveAllPeriods,
    rejectAllPeriods,
  };
});
