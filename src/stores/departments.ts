import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";

interface Department {
  id: string;
  uuid: string;
  companyId: string;
  supervisorId?: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  supervisor?: DepartmentEmployee;
  company?: {
    id: string;
    name: string;
  };
  employees?: DepartmentEmployee[];
}

interface DepartmentEmployee {
  id: string;
  uuid?: string;
  userId?: string;
  companyId?: string;
  departmentId?: string;
  contractStartTime?: string;
  contractEndTime?: string;
  remainingVacationDays?: number;
  active?: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

interface CalendarDay {
  date: string;
  absences: CalendarAbsence[];
  pendingRequests: CalendarRequest[];
}

interface CalendarAbsence {
  id: string;
  employee: {
    id: string;
    name: string;
  };
  type: {
    id: string;
    name: string;
    code: string;
  };
  isPartial: boolean;
}

interface CalendarRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
  employee: {
    id: string;
    user: {
      name: string;
    };
  };
  absenceType: {
    id: string;
    name: string;
  };
}

interface DepartmentAbsence {
  id: string;
  employeeId: string;
  absenceTypeId: string;
  date: string;
  isPartial: boolean;
  startTime?: string;
  endTime?: string;
  notes?: string;
  registeredBy?: string;
  employee?: {
    id: string;
    user?: {
      name: string;
    };
  };
  absenceType?: {
    id: string;
    name: string;
    code: string;
  };
  registeredByUser?: {
    id: string;
    name: string;
  };
}

interface DepartmentRequest {
  id: string;
  employeeId: string;
  absenceTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  isPartial: boolean;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  employee?: {
    id: string;
    user?: {
      name: string;
    };
  };
  absenceType?: {
    id: string;
    name: string;
  };
  reviewer?: {
    id: string;
    name: string;
  };
}

interface DepartmentWorkLog {
  id: string;
  employeeId: string;
  date: string;
  time: string;
  type: "check_in" | "check_out";
  category: string;
  ipAddress?: string;
  location?: string;
  nfcDeviceId?: string | null;
  nfcCardId?: string | null;
  source?: 'web' | 'mobile' | 'nfc' | 'manual';
  employee?: {
    id: string;
    user?: {
      name: string;
    };
  };
}

interface CalendarResponse {
  year: number;
  month: number;
  department: {
    id: string;
    name: string;
  };
  calendar: CalendarDay[];
  pendingRequests: CalendarRequest[];
}

interface CreateAbsenceData {
  employee_id: string;
  absence_type_id: string;
  date: string;
  is_partial: boolean;
  start_time?: string;
  end_time?: string;
  notes?: string;
}

export const useDepartmentsStore = defineStore("departments", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  // State
  const department = ref<Department | null>(null);
  const employees = ref<DepartmentEmployee[]>([]);
  const calendarData = ref<CalendarResponse | null>(null);
  const absences = ref<DepartmentAbsence[]>([]);
  const requests = ref<DepartmentRequest[]>([]);
  const workLogs = ref<DepartmentWorkLog[]>([]);

  const loading = ref(false);
  const submitting = ref(false);

  // Computed: Department ID del empleado actual
  const currentDepartmentId = computed(() => {
    return authStore.currentDepartmentId;
  });

  // Computed: Verificar si el usuario es supervisor del departamento
  const isSupervisor = computed(() => {
    if (!department.value || !authStore.currentEmployee) return false;
    return department.value.supervisorId === authStore.currentEmployee.id;
  });

  // Computed: Puede gestionar departamento (supervisor, manager o admin)
  const canManageDepartment = computed(() => {
    return isSupervisor.value || authStore.isManager || authStore.isAdmin;
  });

  // Computed: Días del calendario
  const calendarDays = computed(() => {
    return calendarData.value?.calendar || [];
  });

  // Helper para extraer datos de respuesta API
  function extractData<T>(response: any): T {
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      return response.data.data;
    }
    return response.data;
  }

  // ===== MÉTODOS PARA TODOS LOS EMPLEADOS =====

  async function fetchDepartment(departmentId?: string) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    loading.value = true;
    try {
      const response = await api.get(`/departments/${deptId}`);
      department.value = extractData<Department>(response);
    } catch (error: any) {
      console.error("Error fetching department:", error);
      toast.error(error.response?.data?.message || "Failed to load department");
    } finally {
      loading.value = false;
    }
  }

  async function fetchEmployees(departmentId?: string) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    loading.value = true;
    try {
      const response = await api.get(`/departments/${deptId}/employees`);
      employees.value = extractData<DepartmentEmployee[]>(response);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error(error.response?.data?.message || "Failed to load employees");
    } finally {
      loading.value = false;
    }
  }

  async function fetchCalendar(year: number, month: number, departmentId?: string) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    loading.value = true;
    try {
      const response = await api.get(
        `/departments/${deptId}/calendar?year=${year}&month=${month}`
      );
      calendarData.value = extractData<CalendarResponse>(response);
    } catch (error: any) {
      console.error("Error fetching calendar:", error);
      toast.error(error.response?.data?.message || "Failed to load calendar");
    } finally {
      loading.value = false;
    }
  }

  // ===== MÉTODOS SOLO PARA SUPERVISORES =====

  async function fetchDepartmentAbsences(
    departmentId?: string,
    startDate?: string,
    endDate?: string
  ) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    loading.value = true;
    try {
      let url = `/departments/${deptId}/absences`;
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get(url);
      absences.value = extractData<DepartmentAbsence[]>(response);
    } catch (error: any) {
      console.error("Error fetching department absences:", error);
      toast.error(error.response?.data?.message || "Failed to load absences");
    } finally {
      loading.value = false;
    }
  }

  async function fetchDepartmentRequests(
    departmentId?: string,
    status?: string
  ) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    loading.value = true;
    try {
      let url = `/departments/${deptId}/absence-requests`;
      if (status && status !== "all") url += `?status=${status}`;

      const response = await api.get(url);
      requests.value = extractData<DepartmentRequest[]>(response);
    } catch (error: any) {
      console.error("Error fetching department requests:", error);
      toast.error(error.response?.data?.message || "Failed to load requests");
    } finally {
      loading.value = false;
    }
  }

  async function fetchDepartmentWorkLogs(
    departmentId?: string,
    startDate?: string,
    endDate?: string
  ) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    loading.value = true;
    try {
      let url = `/departments/${deptId}/work-logs`;
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get(url);
      workLogs.value = extractData<DepartmentWorkLog[]>(response);
    } catch (error: any) {
      console.error("Error fetching department work logs:", error);
      toast.error(error.response?.data?.message || "Failed to load work logs");
    } finally {
      loading.value = false;
    }
  }

  async function createDirectAbsence(
    data: CreateAbsenceData,
    departmentId?: string
  ): Promise<boolean> {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return false;

    submitting.value = true;
    try {
      await api.post(`/departments/${deptId}/absences`, data);
      toast.success("Absence registered successfully");
      return true;
    } catch (error: any) {
      console.error("Error creating absence:", error);
      toast.error(error.response?.data?.message || "Failed to register absence");
      return false;
    } finally {
      submitting.value = false;
    }
  }

  // Reset state
  function reset() {
    department.value = null;
    employees.value = [];
    calendarData.value = null;
    absences.value = [];
    requests.value = [];
    workLogs.value = [];
  }

  return {
    // State
    department,
    employees,
    calendarData,
    calendarDays,
    absences,
    requests,
    workLogs,
    loading,
    submitting,

    // Computed
    currentDepartmentId,
    isSupervisor,
    canManageDepartment,

    // Actions - Todos los empleados
    fetchDepartment,
    fetchEmployees,
    fetchCalendar,

    // Actions - Solo supervisores
    fetchDepartmentAbsences,
    fetchDepartmentRequests,
    fetchDepartmentWorkLogs,
    createDirectAbsence,

    // Utils
    reset,
  };
});
