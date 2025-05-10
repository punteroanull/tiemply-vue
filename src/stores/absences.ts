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
  color: string;
  description?: string;
  affects_vacation_balance: boolean;
}

interface Absence {
  id: string;
  uuid: string;
  employee_id: string;
  absence_type_id: string;
  request_id?: string;
  date: string;
  is_partial: boolean;
  start_time?: string;
  end_time?: string;
  notes?: string;
  absenceType?: AbsenceType;
  request?: AbsenceRequest;
}

interface AbsenceRequest {
  id: string;
  uuid: string;
  employee_id: string;
  absence_type_id: string;
  start_date: string;
  end_date: string;
  is_partial: boolean;
  start_time?: string;
  end_time?: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  notes?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  days_count: number;
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
      absenceTypes.value = response.data;
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
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.get(`/employees/${employeeId}/absences`);
      absences.value = response.data;
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
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.get(
        `/employees/${employeeId}/absence-requests`
      );
      requests.value = response.data;
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
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.get(
        `/requests/pending/employee/${employeeId}`
      );
      pendingRequests.value = response.data;
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
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const data = {
        ...requestData,
        employee_id: employeeId,
      };

      await api.post("/absence-requests", data);

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
