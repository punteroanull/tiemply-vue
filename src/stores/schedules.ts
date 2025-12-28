import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import type {
  EmployeeSchedule,
  WeeklyScheduleResponse,
  WeeklyScheduleDay,
  ScheduleType,
} from "../types";

export const useSchedulesStore = defineStore("schedules", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  // State
  const currentSchedule = ref<EmployeeSchedule | null>(null);
  const weeklySchedule = ref<WeeklyScheduleResponse | null>(null);
  const loading = ref(false);

  // Helper function to extract data from API response
  function extractData<T>(response: any): T {
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      return response.data.data;
    }
    return response.data;
  }

  // Computed
  const isNightShift = computed(() =>
    currentSchedule.value?.scheduleType === "night"
  );

  const isSplitShift = computed(() =>
    currentSchedule.value?.scheduleType === "split"
  );

  const isGuardShift = computed(() =>
    currentSchedule.value?.scheduleType === "guard"
  );

  const isRotatingShift = computed(() =>
    currentSchedule.value?.scheduleType === "rotating"
  );

  const scheduleTypeBadge = computed(() => {
    const types: Record<ScheduleType, { label: string; color: string }> = {
      normal: { label: "Normal", color: "green" },
      split: { label: "Jornada Partida", color: "blue" },
      night: { label: "Nocturno", color: "purple" },
      guard: { label: "Guardia", color: "orange" },
      rotating: { label: "Rotativo", color: "yellow" },
    };
    return types[currentSchedule.value?.scheduleType || "normal"];
  });

  const todaySchedule = computed((): WeeklyScheduleDay | null => {
    if (!weeklySchedule.value?.days) return null;

    // Get current day of week (1 = Monday, 7 = Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Convert JS day (0=Sunday) to ISO day (1=Monday, 7=Sunday)
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    return weeklySchedule.value.days[isoDayOfWeek.toString()] || null;
  });

  const hasSchedule = computed(() => currentSchedule.value !== null);

  // Actions
  async function fetchCurrentSchedule(): Promise<void> {
    const employeeId = authStore.user?.employeeRecords?.[0]?.id;
    if (!employeeId) return;

    loading.value = true;
    try {
      const response = await api.get(`/employees/${employeeId}/schedules/current`);
      currentSchedule.value = extractData<EmployeeSchedule>(response);
    } catch (error: any) {
      console.warn("Could not fetch current schedule:", error);
      // No toast - employee may not have an assigned schedule
      currentSchedule.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchWeeklySchedule(weekStart?: string): Promise<void> {
    const employeeId = authStore.user?.employeeRecords?.[0]?.id;
    if (!employeeId) return;

    loading.value = true;
    try {
      const url = weekStart
        ? `/employees/${employeeId}/schedules/weekly/${weekStart}`
        : `/employees/${employeeId}/schedules/weekly`;

      const response = await api.get(url);
      weeklySchedule.value = extractData<WeeklyScheduleResponse>(response);
    } catch (error: any) {
      console.error("Error fetching weekly schedule:", error);
      toast.error("Failed to fetch weekly schedule");
      weeklySchedule.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchScheduleForDate(date: string): Promise<EmployeeSchedule | null> {
    const employeeId = authStore.user?.employeeRecords?.[0]?.id;
    if (!employeeId) return null;

    try {
      const response = await api.get(`/employees/${employeeId}/schedules/for-date/${date}`);
      return extractData<EmployeeSchedule>(response);
    } catch (error: any) {
      console.warn("Could not fetch schedule for date:", error);
      return null;
    }
  }

  function reset(): void {
    currentSchedule.value = null;
    weeklySchedule.value = null;
  }

  return {
    // State
    currentSchedule,
    weeklySchedule,
    loading,

    // Computed
    isNightShift,
    isSplitShift,
    isGuardShift,
    isRotatingShift,
    scheduleTypeBadge,
    todaySchedule,
    hasSchedule,

    // Actions
    fetchCurrentSchedule,
    fetchWeeklySchedule,
    fetchScheduleForDate,
    reset,
  };
});
