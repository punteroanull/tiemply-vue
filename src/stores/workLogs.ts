import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";

interface WorkLog {
  id: string;
  uuid: string;
  employeeId: string;
  date: string;
  time: string;
  type: "check_in" | "check_out";
  category?: string;
  pairedLogId?: string;
  notes?: string;
  formattedDuration?: string;
}

interface WorkLogPair {
  date: string;
  checkIn?: WorkLog;
  checkOut?: WorkLog;
  duration?: string;
  logs: WorkLog[];
}

interface WorkLogReport {
  days: WorkLogPair[];
  totalDuration: string;
  totalDays: number;
}

export const useWorkLogsStore = defineStore("workLogs", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  const dailyReport = ref<WorkLogReport | null>(null);
  const weeklyReport = ref<WorkLogReport | null>(null);
  const monthlyReport = ref<WorkLogReport | null>(null);

  //const activeReport = ref<WorkLogReport | null>(null);
  const loading = ref(false);

  async function fetchDailyReport(period?: string) {
    if (!authStore.user?.id) return;

    loading.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const url = period
        ? `/worklogs/daily-report/${employeeId}/${period}`
        : `/worklogs/daily-report/${employeeId}`;

      const response = await api.get(url);

      // Backend uses ApiResponse trait: { success: true, data: {...} }
      // Axios response is in response.data, so actual data is in response.data.data
      let apiData;
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        apiData = response.data.data;
      } else {
        apiData = response.data;
      }

      // Transform the API response into the expected format
      // Note: API response is now in camelCase (converted by api.ts interceptor)
      const transformedData = {
        days: [
          {
            date: apiData.date,
            checkIn: apiData.shift?.start || null,
            checkOut: apiData.shift?.end || null,
            duration: apiData.shift?.totalMinutes
              ? `${Math.abs(
                  Math.floor(apiData.shift.totalMinutes / 60)
                )}:${Math.abs(
                  Math.floor(apiData.shift.totalMinutes % 60)
                )}`
              : "0:00",
            logs:
              apiData.allLogs?.map((log: any) => ({
                id: log.id,
                uuid: log.uuid,
                employeeId: log.employeeId,
                date: log.date,
                time: log.time,
                type: log.type,
                category: log.category,
                pairedLogId: log.pairedLogId,
                notes: log.notes,
                formattedDuration: log.formattedDuration,
              })) || [],
          },
        ],
        totalDuration: apiData.totalWorkTime?.formatted || "0:00",
        totalDays: 1, // Assuming one day for daily report
      };

      dailyReport.value = transformedData;
      return dailyReport.value;
    } catch (error) {
      console.error("Error fetching daily report:", error);
      toast.error("Failed to fetch daily work log report");
    } finally {
      loading.value = false;
    }
  }

  async function fetchWeeklyReport(period?: string) {
    if (!authStore.user?.id) return;

    loading.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        toast.error("No se encontró un registro de empleado para tu usuario.");
        loading.value = false;
        return;
      }

      const url = period
        ? `/worklogs/weekly-report/${employeeId}/${period}`
        : `/worklogs/weekly-report/${employeeId}`;

      const response = await api.get(url);

      // Backend uses ApiResponse trait: { success: true, data: {...} }
      // Axios response is in response.data, so actual data is in response.data.data
      let apiData;
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        apiData = response.data.data;
      } else {
        apiData = response.data;
      }

      // Transform the API response into the expected format
      // Note: API response is now in camelCase (converted by api.ts interceptor)
      const transformedData = {
        days: apiData.days.map((day: any) => ({
          date: day.date,
          checkIn: day.shift?.startTime
            ? {
                time: day.shift.startTime,
                type: "check_in",
              }
            : null,
          checkOut: day.shift?.endTime
            ? {
                time: day.shift.endTime,
                type: "check_out",
              }
            : null,
          duration: day.workTime?.formatted || "0:00",
          status: day.status,
          isWeekend: day.isWeekend,
        })),
        totalDuration: apiData.summary?.workTime?.formatted || "0:00",
        totalDays: apiData.days?.length || 0,
      };

      weeklyReport.value = transformedData;
      return weeklyReport.value;
    } catch (error) {
      console.error("Error fetching weekly report:", error);
      toast.error("Failed to fetch weekly work log report");
    } finally {
      loading.value = false;
    }
  }

  async function fetchMonthlyReport(year?: number, month?: number) {
    if (!authStore.user?.id) return;

    loading.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      let url = `/worklogs/monthly-report/${employeeId}`;
      if (year && month) {
        url += `/${year}/${month}`;
      }

      const response = await api.get(url);

      // Backend uses ApiResponse trait: { success: true, data: {...} }
      // Axios response is in response.data, so actual data is in response.data.data
      let apiData;
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        apiData = response.data.data;
      } else {
        apiData = response.data;
      }

      // Transform the API response into the expected format
      // Note: API response is now in camelCase (converted by api.ts interceptor)
      const transformedData = {
        days: apiData.days.map((day: any) => ({
          date: day.date,
          checkIn: day.shift?.startTime
            ? {
                time: day.shift.startTime,
                type: "check_in",
              }
            : null,
          checkOut: day.shift?.endTime
            ? {
                time: day.shift.endTime,
                type: "check_out",
              }
            : null,
          duration: day.workMinutes
            ? `${Math.floor(day.workMinutes / 60)}:${String(day.workMinutes % 60).padStart(2, '0')}`
            : "0:00",
          status: day.status,
          isWeekend: day.isWeekend,
        })),
        totalDuration: apiData.summary?.workTime?.formatted || "0:00",
        totalDays: apiData.days?.length || 0,
      };

      monthlyReport.value = transformedData;
      return monthlyReport.value;
    } catch (error) {
      console.error("Error fetching monthly report:", error);
      toast.error("Failed to fetch monthly work log report");
    } finally {
      loading.value = false;
    }
  }

  return {
    dailyReport,
    weeklyReport,
    monthlyReport,
    loading,
    fetchDailyReport,
    fetchWeeklyReport,
    fetchMonthlyReport,
  };
});
