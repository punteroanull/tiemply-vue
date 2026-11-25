import { defineStore } from "pinia";
import { computed, ref, type Ref } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import i18n from "../i18n";
import { unwrap } from "../utils/apiResponse";
import { apiDateToYmd, formatMinutesAsClock } from "../utils/apiDates";

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
  nfcDeviceId?: string | null;
  nfcCardId?: string | null;
  source?: "web" | "mobile" | "nfc" | "manual";
}

interface WorkLogPair {
  /** Calendar day as "yyyy-MM-dd". */
  date: string;
  checkIn?: Pick<WorkLog, "time" | "type"> | null;
  checkOut?: Pick<WorkLog, "time" | "type"> | null;
  /** Net time worked, "H:mm". */
  duration?: string;
  /** Net minutes worked, to tell an empty day from a worked one. */
  workedMinutes: number;
  /** A shift was started and not ended yet. */
  inProgress?: boolean;
  status?: string;
  isWeekend?: boolean;
  logs?: WorkLog[];
}

interface WorkLogReport {
  days: WorkLogPair[];
  totalDuration: string;
  /** Days with a recorded shift in the period (not the number of days it spans). */
  totalDays: number;
  /** Whether the period has anything worth showing or exporting. */
  hasLogs: boolean;
  /** Weekly report: time expected by the contract or schedule, "H:mm". */
  expectedDuration?: string;
  /** Weekly report: worked versus expected, 0-100+. Null when nothing was expected. */
  progressPercent?: number | null;
}

type ReportKind = "daily" | "weekly" | "monthly";

function minutesOf(value: unknown): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) ? Math.round(minutes) : 0;
}

/** Minutes behind an "HH:mm" total, for the days the API only sends formatted. */
function minutesFromClock(formatted: unknown): number {
  if (typeof formatted !== "string") return 0;
  const match = formatted.match(/^(\d+):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

export const useWorkLogsStore = defineStore("workLogs", () => {
  const toast = useToast();
  const authStore = useAuthStore();
  const t = (key: string) => (i18n.global.t as any)(key) as string;

  const dailyReport = ref<WorkLogReport | null>(null);
  const weeklyReport = ref<WorkLogReport | null>(null);
  const monthlyReport = ref<WorkLogReport | null>(null);

  const reports: Record<ReportKind, Ref<WorkLogReport | null>> = {
    daily: dailyReport,
    weekly: weeklyReport,
    monthly: monthlyReport,
  };

  // Which report failed to load, so a failure is not shown as "no work logs".
  const errors = ref<Record<ReportKind, boolean>>({ daily: false, weekly: false, monthly: false });

  // Stepping quickly through dates fires overlapping requests. Only the answer to the
  // latest one per report may be shown, and `loading` stays on until all have settled.
  const latestRequest: Record<ReportKind, number> = { daily: 0, weekly: 0, monthly: 0 };
  const pendingRequests = ref(0);
  const loading = computed(() => pendingRequests.value > 0);
  const exporting = ref(false);

  function getEmployeeId(): string | null {
    return authStore.currentEmployee?.id || null;
  }

  async function load(
    kind: ReportKind,
    url: (employeeId: string) => string,
    transform: (apiData: any) => WorkLogReport
  ): Promise<WorkLogReport | null> {
    if (!authStore.user?.id) return null;

    const employeeId = getEmployeeId();
    if (!employeeId) {
      toast.error(t("workLogs.noEmployee"));
      return null;
    }

    const requestId = ++latestRequest[kind];
    pendingRequests.value++;

    try {
      const response = await api.get(url(employeeId));
      const report = transform(unwrap<any>(response));

      if (requestId !== latestRequest[kind]) return null;

      reports[kind].value = report;
      errors.value[kind] = false;
      return report;
    } catch (error) {
      if (requestId !== latestRequest[kind]) return null;

      // Never leave the previous period's numbers under the new period's heading.
      reports[kind].value = null;
      errors.value[kind] = true;
      toast.error(t("workLogs.fetchError"));
      return null;
    } finally {
      pendingRequests.value = Math.max(0, pendingRequests.value - 1);
    }
  }

  function fetchDailyReport(period?: string) {
    return load(
      "daily",
      (employeeId) =>
        period
          ? `/worklogs/daily-report/${employeeId}/${period}`
          : `/worklogs/daily-report/${employeeId}`,
      (apiData) => {
        const logs: WorkLog[] = (apiData.allLogs || []).map((log: any) => ({
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
          nfcDeviceId: log.nfcDeviceId,
          nfcCardId: log.nfcCardId,
          source: log.source,
        }));

        // Net time (breaks excluded), the same figure as the day's total: the gross
        // start-to-end span next to it made the two numbers on screen disagree.
        const workedMinutes =
          apiData.totalWorkTime?.minutes !== undefined
            ? minutesOf(apiData.totalWorkTime.minutes)
            : minutesFromClock(apiData.totalWorkTime?.formatted);
        const duration = formatMinutesAsClock(workedMinutes);
        const hasShift = Boolean(apiData.shift?.start || apiData.shift?.end);

        return {
          days: [
            {
              date: apiDateToYmd(apiData.date) ?? apiData.date,
              checkIn: apiData.shift?.start || null,
              checkOut: apiData.shift?.end || null,
              duration,
              workedMinutes,
              inProgress: Boolean(apiData.shift?.start && !apiData.shift?.end),
              logs,
            },
          ],
          totalDuration: duration,
          totalDays: hasShift ? 1 : 0,
          hasLogs: hasShift || logs.length > 0,
        };
      }
    );
  }

  function transformDay(day: any, workedMinutes: number, duration: string): WorkLogPair {
    return {
      date: apiDateToYmd(day.date) ?? day.date,
      checkIn: day.shift?.startTime ? { time: day.shift.startTime, type: "check_in" } : null,
      checkOut: day.shift?.endTime ? { time: day.shift.endTime, type: "check_out" } : null,
      duration,
      workedMinutes,
      inProgress: Boolean(day.shift?.startTime && !day.shift?.endTime),
      status: day.status,
      isWeekend: day.isWeekend,
    };
  }

  function summarise(apiData: any, days: WorkLogPair[]): WorkLogReport {
    const summary = apiData.summary || {};
    const withShift = days.filter((day) => day.checkIn || day.checkOut).length;

    return {
      days,
      totalDuration: summary.workTime?.formatted || "0:00",
      // The API counts completed and unfinished days apart; both are days worked.
      totalDays:
        summary.daysWorked !== undefined
          ? Number(summary.daysWorked || 0) + Number(summary.daysIncomplete || 0)
          : withShift,
      hasLogs: withShift > 0,
    };
  }

  function fetchWeeklyReport(period?: string) {
    return load(
      "weekly",
      (employeeId) =>
        period
          ? `/worklogs/weekly-report/${employeeId}/${period}`
          : `/worklogs/weekly-report/${employeeId}`,
      (apiData) => {
        const days = (apiData.days || []).map((day: any) => {
          const workedMinutes =
            day.workTime?.minutes !== undefined
              ? minutesOf(day.workTime.minutes)
              : minutesFromClock(day.workTime?.formatted);
          return transformDay(
            day,
            workedMinutes,
            day.workTime?.formatted || formatMinutesAsClock(workedMinutes)
          );
        });

        const report = summarise(apiData, days);
        const expectedMinutes = minutesOf(apiData.summary?.expectedWorkTime?.minutes);

        return {
          ...report,
          expectedDuration: apiData.summary?.expectedWorkTime?.formatted,
          progressPercent:
            apiData.summary?.productivity !== undefined &&
            (expectedMinutes > 0 || apiData.summary?.expectedWorkTime?.minutes === undefined)
              ? Number(apiData.summary.productivity)
              : null,
        };
      }
    );
  }

  function fetchMonthlyReport(year?: number, month?: number) {
    return load(
      "monthly",
      (employeeId) =>
        year && month
          ? `/worklogs/monthly-report/${employeeId}/${year}/${month}`
          : `/worklogs/monthly-report/${employeeId}`,
      (apiData) => {
        const days = (apiData.days || []).map((day: any) => {
          // The API sends fractional minutes here (times carry seconds).
          const workedMinutes = minutesOf(day.workMinutes);
          return transformDay(day, workedMinutes, formatMinutesAsClock(workedMinutes));
        });

        return summarise(apiData, days);
      }
    );
  }

  // Helper function to download blob as file
  function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async function exportPdf(path: (employeeId: string) => string, filename: string): Promise<boolean> {
    if (!authStore.user?.id) return false;

    const employeeId = getEmployeeId();
    if (!employeeId) {
      toast.error(t("workLogs.noEmployee"));
      return false;
    }

    exporting.value = true;

    try {
      const response = await api.get(path(employeeId), { responseType: "blob" });

      downloadBlob(new Blob([response.data], { type: "application/pdf" }), filename);

      toast.success(t("workLogs.exportSuccess"));
      return true;
    } catch (error: any) {
      // The PDF routes sit behind the export_reports plan feature.
      toast.error(
        error?.response?.status === 403
          ? t("workLogs.exportNotAvailable")
          : t("workLogs.exportError")
      );
      return false;
    } finally {
      exporting.value = false;
    }
  }

  function exportDailyPdf(period: string): Promise<boolean> {
    return exportPdf(
      (employeeId) => `/worklogs/daily-report/${employeeId}/${period}/pdf`,
      `daily_report_${period}.pdf`
    );
  }

  function exportWeeklyPdf(period: string): Promise<boolean> {
    return exportPdf(
      (employeeId) => `/worklogs/weekly-report/${employeeId}/${period}/pdf`,
      `weekly_report_${period}.pdf`
    );
  }

  function exportMonthlyPdf(year: number, month: number): Promise<boolean> {
    const monthStr = String(month).padStart(2, "0");
    return exportPdf(
      (employeeId) => `/worklogs/monthly-report/${employeeId}/${year}/${month}/pdf`,
      `monthly_report_${year}-${monthStr}.pdf`
    );
  }

  /** Drop everything cached for the current identity. */
  function reset() {
    dailyReport.value = null;
    weeklyReport.value = null;
    monthlyReport.value = null;
    errors.value = { daily: false, weekly: false, monthly: false };
    // Answers still on their way belong to the previous identity.
    latestRequest.daily++;
    latestRequest.weekly++;
    latestRequest.monthly++;
    exporting.value = false;
  }

  return {
    reset,
    dailyReport,
    weeklyReport,
    monthlyReport,
    errors,
    loading,
    exporting,
    fetchDailyReport,
    fetchWeeklyReport,
    fetchMonthlyReport,
    exportDailyPdf,
    exportWeeklyPdf,
    exportMonthlyPdf,
  };
});
