import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { format } from "date-fns";
import api from "../services/api";
import i18n from "../i18n";
import { useAuthStore } from "./auth";
import { unwrap } from "../utils/apiResponse";
import { apiDateToYmd } from "../utils/apiDates";
import { isFeatureUnavailable } from "../utils/featureGate";
import type {
  CurrentScheduleResponse,
  EmployeeSchedule,
  LegacySchedule,
  WeeklyScheduleResponse,
  WeeklyScheduleDay,
  ScheduleType,
} from "../types";

const TYPE_COLORS: Record<ScheduleType, string> = {
  normal: "green",
  split: "blue",
  night: "purple",
  guard: "orange",
  rotating: "yellow",
  flexible: "teal",
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The weekly endpoint returns `days` as an array of seven entries starting on Monday,
 * each carrying its own date. Days are always looked up by that date, never by position.
 */
function normalizeWeekly(raw: any): WeeklyScheduleResponse | null {
  if (!raw || typeof raw !== "object") return null;

  const rawDays: any[] = Array.isArray(raw.days) ? raw.days : Object.values(raw.days ?? {});
  const days: WeeklyScheduleDay[] = rawDays
    .map((day) => ({
      date: apiDateToYmd(day?.date) ?? "",
      dayOfWeek: toNumber(day?.dayOfWeek),
      dayName: day?.dayName ?? "",
      isWorkingDay: Boolean(day?.isWorkingDay),
      isFlexible: Boolean(day?.isFlexible),
      totalHours: toNumber(day?.totalHours),
      blocks: Array.isArray(day?.blocks) ? day.blocks : Object.values(day?.blocks ?? {}),
    }))
    .filter((day) => day.date !== "")
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    weekStart: apiDateToYmd(raw.weekStart) ?? "",
    weekEnd: apiDateToYmd(raw.weekEnd) ?? "",
    days,
    totalWeeklyHours: toNumber(raw.totalWeeklyHours),
    isFlexible: Boolean(raw.isFlexible),
    flexible: raw.flexible ?? null,
    flexibleProgress: raw.flexibleProgress ?? null,
  };
}

export const useSchedulesStore = defineStore("schedules", () => {
  const authStore = useAuthStore();

  // State
  const currentSchedule = ref<CurrentScheduleResponse | null>(null);
  const weeklySchedule = ref<WeeklyScheduleResponse | null>(null);
  /** Weekly schedule request in flight. */
  const loading = ref(false);
  const loadingCurrent = ref(false);
  /** The weekly schedule could not be loaded (not the same as having no schedule). */
  const error = ref(false);
  /** The company plan does not include schedules (feature-gated 403). */
  const featureUnavailable = ref(false);

  // Only the latest weekly request may write: next/previous clicked quickly must not let
  // a slow older week replace the one on screen.
  let weeklyRequestId = 0;

  // Computed
  /** The schedule record, when the employee has one (any type, flexible included). */
  const assignedSchedule = computed((): EmployeeSchedule | null => {
    const current = currentSchedule.value;
    if (!current || current.type !== "flexible" || !current.schedule) return null;
    return current.schedule as EmployeeSchedule;
  });

  /** Contract times, when the employee has no schedule record but has contract hours. */
  const legacySchedule = computed((): LegacySchedule | null => {
    const current = currentSchedule.value;
    if (!current || current.type !== "legacy" || !current.schedule) return null;
    return current.schedule as LegacySchedule;
  });

  const scheduleType = computed(
    (): ScheduleType | null =>
      currentSchedule.value?.scheduleType ?? assignedSchedule.value?.scheduleType ?? null
  );

  const scheduleName = computed(() => assignedSchedule.value?.name ?? "");

  const isLegacy = computed(() => legacySchedule.value !== null);

  /** Hours-based schedule: a minimum per week or month, with no timetable. */
  const isFlexible = computed(
    () => Boolean(currentSchedule.value?.isFlexible) || Boolean(weeklySchedule.value?.isFlexible)
  );

  const isNightShift = computed(() => scheduleType.value === "night");
  const isSplitShift = computed(() => scheduleType.value === "split");
  const isGuardShift = computed(() => scheduleType.value === "guard");
  const isRotatingShift = computed(() => scheduleType.value === "rotating");

  const scheduleTypeBadge = computed(() => {
    const type = scheduleType.value;
    if (!type) return null;
    return {
      label: i18n.global.t(`schedule.scheduleTypes.${type}`),
      color: TYPE_COLORS[type] ?? "neutral",
    };
  });

  /**
   * Today's entry of the loaded week, or null when the loaded week does not contain today
   * or the schedule has no timetable to show for a day (flexible or contract hours).
   */
  const todaySchedule = computed((): WeeklyScheduleDay | null => {
    const today = format(new Date(), "yyyy-MM-dd");
    const day = weeklySchedule.value?.days.find((d) => d.date === today) ?? null;
    if (!day) return null;
    // Without blocks there is nothing to list unless it is simply a day off.
    if (day.blocks.length === 0 && (day.isFlexible || day.totalHours > 0)) return null;
    return day;
  });

  const hasSchedule = computed(
    () => assignedSchedule.value !== null || legacySchedule.value !== null
  );

  // Actions
  async function fetchCurrentSchedule(): Promise<void> {
    const employeeId = authStore.currentEmployee?.id;
    if (!employeeId) return;

    loadingCurrent.value = true;
    try {
      const response = await api.get(`/employees/${employeeId}/schedules/current`);
      currentSchedule.value = unwrap<CurrentScheduleResponse>(response) ?? null;
    } catch (err) {
      // Quiet on purpose: the employee may simply have no schedule.
      if (isFeatureUnavailable(err)) featureUnavailable.value = true;
      currentSchedule.value = null;
    } finally {
      loadingCurrent.value = false;
    }
  }

  async function fetchWeeklySchedule(weekStart?: string): Promise<void> {
    const employeeId = authStore.currentEmployee?.id;
    if (!employeeId) return;

    const id = ++weeklyRequestId;
    loading.value = true;
    error.value = false;
    try {
      const url = weekStart
        ? `/employees/${employeeId}/schedules/weekly/${weekStart}`
        : `/employees/${employeeId}/schedules/weekly`;

      const response = await api.get(url);
      if (id !== weeklyRequestId) return;
      weeklySchedule.value = normalizeWeekly(unwrap(response));
      featureUnavailable.value = false;
    } catch (err) {
      if (id !== weeklyRequestId) return;
      weeklySchedule.value = null;
      if (isFeatureUnavailable(err)) {
        featureUnavailable.value = true;
      } else {
        console.error("Error fetching weekly schedule:", err);
        error.value = true;
      }
    } finally {
      if (id === weeklyRequestId) loading.value = false;
    }
  }

  async function fetchScheduleForDate(date: string): Promise<EmployeeSchedule | null> {
    const employeeId = authStore.currentEmployee?.id;
    if (!employeeId) return null;

    try {
      const response = await api.get(`/employees/${employeeId}/schedules/for-date/${date}`);
      return unwrap<EmployeeSchedule>(response) ?? null;
    } catch {
      return null;
    }
  }

  function reset(): void {
    weeklyRequestId++;
    currentSchedule.value = null;
    weeklySchedule.value = null;
    loading.value = false;
    loadingCurrent.value = false;
    error.value = false;
    featureUnavailable.value = false;
  }

  return {
    // State
    currentSchedule,
    weeklySchedule,
    loading,
    loadingCurrent,
    error,
    featureUnavailable,

    // Computed
    assignedSchedule,
    legacySchedule,
    scheduleType,
    scheduleName,
    isLegacy,
    isFlexible,
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
