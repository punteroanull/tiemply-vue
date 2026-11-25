import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import i18n from "../i18n";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import { apiErrorMessage, unwrap, unwrapList } from "../utils/apiResponse";

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
  hasClockedInToday?: boolean;
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

interface DepartmentRequestPeriod {
  id: string;
  startDate: string;
  endDate: string;
  isPartial: boolean;
  startTime?: string;
  endTime?: string;
  status: "pending" | "approved" | "rejected";
  daysCount: number;
  rejectionReason?: string;
}

interface DepartmentRequest {
  id: string;
  employeeId: string;
  absenceTypeId: string;
  // Null on period-based requests, which carry their dates in `periods` instead.
  startDate: string | null;
  endDate: string | null;
  daysCount: number;
  isPartial: boolean;
  usesPeriods?: boolean;
  periods?: DepartmentRequestPeriod[];
  status: "pending" | "approved" | "rejected" | "partial";
  notes?: string;
  rejectionReason?: string;
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
  const t = i18n.global.t;

  // State
  const department = ref<Department | null>(null);
  const employees = ref<DepartmentEmployee[]>([]);
  const calendarData = ref<CalendarResponse | null>(null);
  const absences = ref<DepartmentAbsence[]>([]);
  const requests = ref<DepartmentRequest[]>([]);
  const workLogs = ref<DepartmentWorkLog[]>([]);

  const loading = ref(false);
  const calendarLoading = ref(false);
  const submitting = ref(false);

  // A failed fetch must not look like "there is nothing": views show a retry instead.
  const departmentError = ref(false);
  const absencesError = ref(false);
  const requestsError = ref(false);
  const workLogsError = ref(false);

  /** False once the API refuses the team calendar (not allowed, or not in the plan). */
  const calendarAvailable = ref(true);

  // Several fetches overlap (the layout loads the department while a view loads its
  // list), so `loading` only clears when the last one finishes.
  let pendingFetches = 0;

  async function tracked<T>(work: () => Promise<T>): Promise<T> {
    pendingFetches++;
    loading.value = true;
    try {
      return await work();
    } finally {
      pendingFetches--;
      if (pendingFetches === 0) loading.value = false;
    }
  }

  // Filters fire requests in quick succession; only the answer to the latest one counts.
  const latest = { absences: 0, requests: 0, workLogs: 0, calendar: 0 };

  // Computed: Department ID del empleado actual
  const currentDepartmentId = computed(() => {
    return authStore.currentDepartmentId;
  });

  // Computed: Verificar si el usuario es supervisor del departamento
  const isSupervisor = computed(() => {
    if (!department.value || !authStore.currentEmployee) return false;
    return department.value.supervisorId === authStore.currentEmployee.id;
  });

  // Computed: Puede gestionar departamento (supervisor, manager o admin).
  // `authStore.isSupervisor` comes from /me and is known before the department has been
  // fetched; relying on the fetched department alone bounced supervisors off the
  // department pages on reload.
  const canManageDepartment = computed(() => {
    return (
      isSupervisor.value ||
      authStore.isSupervisor ||
      authStore.isManager ||
      authStore.isAdmin
    );
  });

  // Computed: Días del calendario
  const calendarDays = computed(() => {
    return calendarData.value?.calendar || [];
  });

  // ===== MÉTODOS PARA TODOS LOS EMPLEADOS =====

  async function fetchDepartment(departmentId?: string) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    return tracked(async () => {
      try {
        const response = await api.get(`/departments/${deptId}`);
        department.value = unwrap<Department>(response);
        departmentError.value = false;
      } catch (error) {
        departmentError.value = true;
        toast.error(apiErrorMessage(error, t("department.errors.fetchDepartment")));
      }
    });
  }

  /**
   * Members of the department. The dedicated endpoint (which also says who clocked in
   * today) is only open to whoever manages the department; everyone else gets the member
   * list that already comes with the department itself.
   */
  async function fetchEmployees(departmentId?: string) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    if (!canManageDepartment.value) {
      if (!department.value) await fetchDepartment(deptId);
      employees.value = department.value?.employees ?? [];
      return;
    }

    return tracked(async () => {
      try {
        const response = await api.get(`/departments/${deptId}/employees`);
        employees.value = unwrapList<DepartmentEmployee>(response);
      } catch (error: any) {
        if (error?.response?.status === 403) {
          // Manages another department, not this one: fall back to the plain list.
          employees.value = department.value?.employees ?? [];
          return;
        }
        toast.error(apiErrorMessage(error, t("department.errors.fetchEmployees")));
      }
    });
  }

  /**
   * Team absence calendar. Only for whoever manages the department, and only on plans
   * that include it: a 403 just means "no calendar here", not an error to shout about.
   * It has its own loading flag so changing month does not blank the whole page.
   */
  async function fetchCalendar(year: number, month: number, departmentId?: string) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId || !canManageDepartment.value) {
      calendarData.value = null;
      return;
    }

    const requestId = ++latest.calendar;
    calendarLoading.value = true;
    try {
      const response = await api.get(`/departments/${deptId}/calendar`, {
        params: { year, month },
      });
      if (requestId !== latest.calendar) return;
      calendarData.value = unwrap<CalendarResponse>(response);
      calendarAvailable.value = true;
    } catch (error: any) {
      if (requestId !== latest.calendar) return;
      calendarData.value = null;
      if (error?.response?.status === 403) {
        calendarAvailable.value = false;
        return;
      }
      toast.error(apiErrorMessage(error, t("department.errors.fetchCalendar")));
    } finally {
      if (requestId === latest.calendar) calendarLoading.value = false;
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

    const requestId = ++latest.absences;
    return tracked(async () => {
      try {
        const params: Record<string, string> = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await api.get(`/departments/${deptId}/absences`, { params });
        if (requestId !== latest.absences) return;
        absences.value = unwrapList<DepartmentAbsence>(response);
        absencesError.value = false;
      } catch (error) {
        if (requestId !== latest.absences) return;
        absences.value = [];
        absencesError.value = true;
        toast.error(apiErrorMessage(error, t("department.errors.fetchAbsences")));
      }
    });
  }

  async function fetchDepartmentRequests(
    departmentId?: string,
    status?: string
  ) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    const requestId = ++latest.requests;
    return tracked(async () => {
      try {
        // The API filters by pending, approved or rejected only.
        const filterable = ["pending", "approved", "rejected"];
        const params = status && filterable.includes(status) ? { status } : {};

        const response = await api.get(`/departments/${deptId}/absence-requests`, { params });
        if (requestId !== latest.requests) return;
        requests.value = unwrapList<DepartmentRequest>(response);
        requestsError.value = false;
      } catch (error) {
        if (requestId !== latest.requests) return;
        requests.value = [];
        requestsError.value = true;
        toast.error(apiErrorMessage(error, t("department.errors.fetchRequests")));
      }
    });
  }

  async function fetchDepartmentWorkLogs(
    departmentId?: string,
    startDate?: string,
    endDate?: string
  ) {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) return;

    const requestId = ++latest.workLogs;
    return tracked(async () => {
      try {
        const params: Record<string, string> = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await api.get(`/departments/${deptId}/work-logs`, { params });
        if (requestId !== latest.workLogs) return;
        workLogs.value = unwrapList<DepartmentWorkLog>(response);
        workLogsError.value = false;
      } catch (error) {
        if (requestId !== latest.workLogs) return;
        workLogs.value = [];
        workLogsError.value = true;
        toast.error(apiErrorMessage(error, t("department.errors.fetchWorkLogs")));
      }
    });
  }

  async function createDirectAbsence(
    data: CreateAbsenceData,
    departmentId?: string
  ): Promise<boolean> {
    const deptId = departmentId || currentDepartmentId.value;
    if (!deptId) {
      toast.error(t("department.noDepartment"));
      return false;
    }

    submitting.value = true;
    try {
      await api.post(`/departments/${deptId}/absences`, data);
      toast.success(t("department.absenceCreated"));
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error, t("department.absenceCreateError")));
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
    departmentError.value = false;
    absencesError.value = false;
    requestsError.value = false;
    workLogsError.value = false;
    calendarAvailable.value = true;
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
    calendarLoading,
    submitting,
    departmentError,
    absencesError,
    requestsError,
    workLogsError,
    calendarAvailable,

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
