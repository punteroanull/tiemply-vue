import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";

interface WorkLog {
  id: string;
  uuid: string;
  employee_id: string;
  date: string;
  time: string;
  type: "check_in" | "check_out";
  category?: string;
  paired_log_id?: string;
  notes?: string;
  formatted_duration?: string;
}

interface WorkLogPair {
  date: string;
  check_in?: WorkLog;
  check_out?: WorkLog;
  duration?: string;
}

interface WorkLogReport {
  days: WorkLogPair[];
  total_duration: string;
  total_days: number;
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
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const url = period
        ? `/worklogs/daily-report/${employeeId}/${period}`
        : `/worklogs/daily-report/${employeeId}`;

      console.log("Fetching daily report from URL:", url);
      const response = await api.get(url);

      // Transform the API response into the expected format
      const transformedData = {
        days: [
          {
            date: response.data.date,
            check_in: response.data.shift?.start || null,
            check_out: response.data.shift?.end || null,
            duration: response.data.shift?.total_minutes
              ? `${Math.floor(response.data.shift.total_minutes / 60)}:${
                  response.data.shift.total_minutes % 60
                }`
              : "0:00",
          },
        ],
        total_duration: response.data.total_work_time?.formatted || "0:00",
        total_days: 1, // Assuming one day for daily report
      };

      dailyReport.value = transformedData;
      console.log("Transformed Daily Report:", dailyReport.value);
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
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const url = period
        ? `/worklogs/weekly-report/${employeeId}/${period}`
        : `/worklogs/weekly-report/${employeeId}`;

      console.log("Fetching weekly report from URL:", url);
      const response = await api.get(url);

      // Transform the API response into the expected format
      const transformedData = {
        days: response.data.days.map((day: any) => ({
          date: day.date,
          check_in: day.shift?.start_time
            ? {
                time: day.shift.start_time,
                type: "check_in",
              }
            : null,
          check_out: day.shift?.end_time
            ? {
                time: day.shift.end_time,
                type: "check_out",
              }
            : null,
          duration: day.work_time?.formatted || "0:00",
          status: day.status,
          is_weekend: day.is_weekend,
        })),
        total_duration: response.data.summary.work_time?.formatted || "0:00",
        total_days: response.data.days.length,
      };

      weeklyReport.value = transformedData;
      console.log("Transformed Weekly Report:", weeklyReport.value);
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
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      let url = `/worklogs/monthly-report/${employeeId}`;
      if (year && month) {
        url += `/${year}/${month}`;
      }

      console.log("Fetching monthly report from URL:", url);
      const response = await api.get(url);

      // Transform the API response into the expected format
      const transformedData = {
        days: response.data.days.map((day: any) => ({
          date: day.date,
          check_in: day.shift?.start_time
            ? {
                time: day.shift.start_time,
                type: "check_in",
              }
            : null,
          check_out: day.shift?.end_time
            ? {
                time: day.shift.end_time,
                type: "check_out",
              }
            : null,
          duration: day.work_minutes
            ? `${Math.floor(day.work_minutes / 60)}:${day.work_minutes % 60}`
            : "0:00",
          status: day.status,
          is_weekend: day.is_weekend,
        })),
        total_duration: response.data.summary.work_time?.formatted || "0:00",
        total_days: response.data.days.length,
      };

      monthlyReport.value = transformedData;
      console.log("Transformed Monthly Report:", monthlyReport.value);
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
