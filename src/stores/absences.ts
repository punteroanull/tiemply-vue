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

interface AbsenceRequest {
  id: string;
  uuid: string;
  employeeId: string;
  absenceTypeId: string;
  startDate: string;
  endDate: string;
  isPartial: boolean;
  startTime?: string;
  endTime?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  notes?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  daysCount: number;
  absenceType?: AbsenceType;
}

export const useAbsencesStore = defineStore("absences", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  const absences = ref<Absence[]>([]);
  const absenceTypes = ref<AbsenceType[]>([]);
  const requests = ref<AbsenceRequest[]>([]);
  const pendingRequests = ref<AbsenceRequest[]>([]);

  const loading = ref(false);
  const submitting = ref(false);

  async function fetchAbsenceTypes() {
    loading.value = true;

    try {
      const response = await api.get("/absence-types");
      // Backend uses ApiResponse trait: { success: true, data: [...] }
      // Axios response is in response.data, so actual data is in response.data.data
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        absenceTypes.value = response.data.data;
      } else {
        // Fallback for direct array response
        absenceTypes.value = response.data;
      }
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
      // Backend uses ApiResponse trait: { success: true, data: [...] }
      // Axios response is in response.data, so actual data is in response.data.data
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        absences.value = response.data.data;
      } else {
        // Fallback for direct array response
        absences.value = response.data;
      }
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
      // Backend uses ApiResponse trait: { success: true, data: [...] }
      // Axios response is in response.data, so actual data is in response.data.data
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        requests.value = response.data.data;
      } else {
        // Fallback for direct array response
        requests.value = response.data;
      }
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
      // Backend uses ApiResponse trait: { success: true, data: [...] }
      // Axios response is in response.data, so actual data is in response.data.data
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        pendingRequests.value = response.data.data;
      } else {
        // Fallback for direct array response
        pendingRequests.value = response.data;
      }
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

  return {
    absences,
    absenceTypes,
    requests,
    pendingRequests,
    loading,
    submitting,
    fetchAbsenceTypes,
    fetchAbsences,
    fetchAbsenceRequests,
    fetchPendingRequests,
    submitAbsenceRequest,
  };
});
