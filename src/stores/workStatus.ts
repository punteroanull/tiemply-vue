import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import { format, formatDistance, parseISO } from "date-fns";

interface WorkStatus {
  checked_in: boolean;
  last_check_in?: string;
  last_check_out?: string;
  current_duration?: string;
}

export const useWorkStatusStore = defineStore("workStatus", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  const status = ref<WorkStatus | null>(null);
  const loading = ref(false);
  const checkingIn = ref(false);
  const checkingOut = ref(false);
  const refreshInterval = ref<number | null>(null);
  const durationUpdateInterval = ref<number | null>(null);
  const currentDuration = ref<string>("");

  const isCheckedIn = computed(() => status.value?.checked_in || false);

  const formattedLastCheckIn = computed(() => {
    if (!status.value?.last_check_in) return "";
    return format(new Date(status.value.last_check_in), "h:mm a");
  });

  const formattedLastCheckOut = computed(() => {
    if (!status.value?.last_check_out) return "";
    return format(new Date(status.value.last_check_out), "h:mm a");
  });

  const formattedCurrentDuration = computed(() => {
    return currentDuration.value || status.value?.current_duration || "";
  });

  async function fetchStatus() {
    if (!authStore.user?.id) return;

    loading.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.get(`/worklogs/status/${employeeId}`);
      status.value = response.data;

      // Update current duration if checked in
      if (status.value?.checked_in && status.value?.last_check_in) {
        updateCurrentDuration();
      }
    } catch (error: any) {
      console.error("Error fetching work status:", error);
      toast.error("Failed to fetch your current work status");
    } finally {
      loading.value = false;
    }
  }

  function updateCurrentDuration() {
    if (!status.value?.checked_in || !status.value?.last_check_in) {
      currentDuration.value = "";
      return;
    }

    const checkInTime = parseISO(status.value.last_check_in);
    const now = new Date();

    // Format like "2h 15m" or "45m" if less than an hour
    currentDuration.value = formatDistance(checkInTime, now, {
      addSuffix: false,
    });
  }

  async function checkIn() {
    if (!authStore.user?.id) return false;

    checkingIn.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.post("/worklogs/check-in", {
        employee_id: employeeId,
        notes: "Checked in via WorkTracker app",
      });

      await fetchStatus();
      toast.success("You have successfully checked in");
      startRefreshInterval();
      startDurationUpdateInterval();
      return true;
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error("Failed to check in. Please try again.");
      return false;
    } finally {
      checkingIn.value = false;
    }
  }

  async function checkOut() {
    if (!authStore.user?.id) return false;

    checkingOut.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.post("/worklogs/check-out", {
        employee_id: employeeId,
        notes: "Checked out via WorkTracker app",
      });

      await fetchStatus();
      toast.success("You have successfully checked out");
      stopRefreshInterval();
      stopDurationUpdateInterval();
      return true;
    } catch (error: any) {
      console.error("Check-out error:", error);
      toast.error("Failed to check out. Please try again.");
      return false;
    } finally {
      checkingOut.value = false;
    }
  }

  function startRefreshInterval() {
    // Clear any existing interval
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
    }

    // Refresh status every minute when checked in
    refreshInterval.value = window.setInterval(() => {
      fetchStatus();
    }, 60000); // 60 seconds
  }

  function stopRefreshInterval() {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
  }

  function startDurationUpdateInterval() {
    // Clear any existing interval
    if (durationUpdateInterval.value) {
      clearInterval(durationUpdateInterval.value);
    }

    // Update duration every 30 seconds
    updateCurrentDuration();
    durationUpdateInterval.value = window.setInterval(() => {
      updateCurrentDuration();
    }, 30000); // 30 seconds
  }

  function stopDurationUpdateInterval() {
    if (durationUpdateInterval.value) {
      clearInterval(durationUpdateInterval.value);
      durationUpdateInterval.value = null;
    }
    currentDuration.value = "";
  }

  // Initialize status and interval if needed
  function initialize() {
    fetchStatus().then(() => {
      if (status.value?.checked_in) {
        startRefreshInterval();
        startDurationUpdateInterval();
      }
    });

    // Clean up on unload
    return () => {
      stopRefreshInterval();
      stopDurationUpdateInterval();
    };
  }

  return {
    status,
    loading,
    checkingIn,
    checkingOut,
    isCheckedIn,
    formattedLastCheckIn,
    formattedLastCheckOut,
    formattedCurrentDuration,
    fetchStatus,
    checkIn,
    checkOut,
    initialize,
  };
});
