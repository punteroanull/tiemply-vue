// src/stores/workStatus.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import { format, formatDistance, parseISO } from "date-fns";
import {
  getCurrentPosition,
  getAddressFromCoords,
  formatCoordinates,
  isGeolocationAvailable,
  type GeolocationData,
  type GeolocationError,
} from "../utils/geolocation";

interface WorkStatus {
  checked_in: boolean;
  last_check_in?: string;
  last_check_out?: string;
  current_duration?: string;
}

interface CompanySettings {
  geolocation_enabled?: boolean;
  geolocation_required?: boolean;
  geolocation_radius?: number;
  office_latitude?: number;
  office_longitude?: number;
  office_address?: string;
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

  // Geolocation states
  const gettingLocation = ref(false);
  const locationData = ref<GeolocationData | null>(null);
  const locationError = ref<GeolocationError | null>(null);
  const companySettings = ref<CompanySettings>({});

  const isCheckedIn = computed(() => status.value?.checked_in || false);
  const isGeolocationEnabled = computed(
    () => companySettings.value.geolocation_enabled || false
  );
  const isGeolocationRequired = computed(
    () => companySettings.value.geolocation_required || false
  );
  const isGeolocationAvailableComputed = computed(() =>
    isGeolocationAvailable()
  );

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

  const formattedLocation = computed(() => {
    if (!locationData.value) return "";
    return formatCoordinates(
      locationData.value.latitude,
      locationData.value.longitude,
      locationData.value.accuracy
    );
  });

  async function fetchCompanySettings() {
    try {
      const employeeId = authStore.user?.employee_records?.[0]?.id;
      if (!employeeId) return;

      const response = await api.get(
        `/employees/${employeeId}/company-settings`
      );
      companySettings.value = response.data;
    } catch (error) {
      console.warn("Could not fetch company settings:", error);
      companySettings.value = { geolocation_enabled: false };
    }
  }

  async function getCurrentLocation(): Promise<GeolocationData | null> {
    if (!isGeolocationEnabled.value || !isGeolocationAvailableComputed.value) {
      return null;
    }

    gettingLocation.value = true;
    locationError.value = null;

    try {
      const location = await getCurrentPosition();
      locationData.value = location;

      // Intentar obtener la dirección (opcional)
      try {
        const address = await getAddressFromCoords(
          location.latitude,
          location.longitude
        );
        if (address) {
          locationData.value.address = address;
        }
      } catch (addressError) {
        console.warn("Could not get address:", addressError);
      }

      return location;
    } catch (error) {
      locationError.value = error as GeolocationError;

      if (isGeolocationRequired.value) {
        toast.error(
          `Location is required: ${(error as GeolocationError).message}`
        );
        return null;
      } else {
        toast.warning(
          `Could not get location: ${
            (error as GeolocationError).message
          }. Proceeding without location.`
        );
        return null;
      }
    } finally {
      gettingLocation.value = false;
    }
  }

  async function fetchStatus() {
    if (!authStore.user?.id) return;

    loading.value = true;

    try {
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.get(`/worklogs/status/${employeeId}`);
      const data = response.data;

      status.value = {
        checked_in: data.status === "in",
        last_check_in:
          data.status === "in" ? data.last_activity?.time : undefined,
        last_check_out:
          data.status === "out" ? data.last_activity?.time : undefined,
        current_duration: "",
      };

      if (status.value.checked_in && status.value.last_check_in) {
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

    currentDuration.value = formatDistance(checkInTime, now, {
      addSuffix: false,
    });
  }

  async function checkIn() {
    if (!authStore.user?.id) return false;

    checkingIn.value = true;

    try {
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      // Obtener ubicación si está habilitada
      let location: GeolocationData | null = null;
      if (isGeolocationEnabled.value) {
        location = await getCurrentLocation();

        // Si la geolocalización es requerida y no se pudo obtener, abortar
        if (isGeolocationRequired.value && !location) {
          return false;
        }
      }

      // Preparar datos para el check-in
      const checkInData: any = {
        employee_id: employeeId,
        notes: "Checked in via Tiemply app",
      };

      // Añadir datos de ubicación si están disponibles
      if (location) {
        checkInData.location = JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
          address: location.address,
        });
      }

      const response = await api.post("/worklogs/check-in", checkInData);

      await fetchStatus();

      let successMessage = "You have successfully checked in";
      if (location) {
        successMessage += ` at ${formattedLocation.value}`;
      }

      toast.success(successMessage);
      startRefreshInterval();
      startDurationUpdateInterval();
      return true;
    } catch (error: any) {
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage =
          error.response.data?.message || "An error occurred";

        if (statusCode === 422) {
          toast.error(errorMessage);
        } else {
          toast.error(`Error ${statusCode}: ${errorMessage}`);
        }
      } else {
        console.error("Check-in error:", error);
        toast.error("Failed to check in. Please try again.");
      }
      return false;
    } finally {
      checkingIn.value = false;
    }
  }

  async function checkOut() {
    if (!authStore.user?.id) return false;

    checkingOut.value = true;

    try {
      const employeeId = authStore.user.employee_records?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      // Obtener ubicación si está habilitada
      let location: GeolocationData | null = null;
      if (isGeolocationEnabled.value) {
        location = await getCurrentLocation();

        // Si la geolocalización es requerida y no se pudo obtener, abortar
        if (isGeolocationRequired.value && !location) {
          return false;
        }
      }

      // Preparar datos para el check-out
      const checkOutData: any = {
        employee_id: employeeId,
        category: "shift_end",
        notes: "Checked out via Tiemply app",
      };

      // Añadir datos de ubicación si están disponibles
      if (location) {
        checkOutData.location = JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
          address: location.address,
        });
      }

      const response = await api.post("/worklogs/check-out", checkOutData);

      await fetchStatus();

      let successMessage = "You have successfully checked out";
      if (location) {
        successMessage += ` at ${formattedLocation.value}`;
      }

      toast.success(successMessage);
      stopRefreshInterval();
      stopDurationUpdateInterval();

      // Limpiar datos de ubicación después del check-out
      locationData.value = null;
      locationError.value = null;

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
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
    }

    refreshInterval.value = window.setInterval(() => {
      fetchStatus();
    }, 60000);
  }

  function stopRefreshInterval() {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
  }

  function startDurationUpdateInterval() {
    if (durationUpdateInterval.value) {
      clearInterval(durationUpdateInterval.value);
    }

    updateCurrentDuration();
    durationUpdateInterval.value = window.setInterval(() => {
      updateCurrentDuration();
    }, 30000);
  }

  function stopDurationUpdateInterval() {
    if (durationUpdateInterval.value) {
      clearInterval(durationUpdateInterval.value);
      durationUpdateInterval.value = null;
    }
    currentDuration.value = "";
  }

  async function initialize() {
    // Obtener configuración de la empresa
    await fetchCompanySettings();

    // Obtener estado actual
    await fetchStatus();

    if (status.value?.checked_in) {
      startRefreshInterval();
      startDurationUpdateInterval();
    }

    return () => {
      stopRefreshInterval();
      stopDurationUpdateInterval();
    };
  }

  function getEmployeeId() {
    return authStore.user?.employee_records?.[0]?.id || null;
  }

  function setOfflineCheckIn() {
    status.value = {
      ...status.value,
      checked_in: true,
      last_check_in: new Date().toISOString(),
    };
    startDurationUpdateInterval();
  }

  function setOfflineCheckOut() {
    status.value = {
      ...status.value,
      checked_in: false,
      last_check_out: new Date().toISOString(),
    };
    stopDurationUpdateInterval();
  }

  return {
    // Estado existente
    status,
    loading,
    checkingIn,
    checkingOut,
    isCheckedIn,
    formattedLastCheckIn,
    formattedLastCheckOut,
    formattedCurrentDuration,

    // Estado de geolocalización
    gettingLocation,
    locationData,
    locationError,
    companySettings,
    isGeolocationEnabled,
    isGeolocationRequired,
    isGeolocationAvailable: isGeolocationAvailableComputed,
    formattedLocation,

    // Métodos existentes
    fetchStatus,
    checkIn,
    checkOut,
    initialize,
    getEmployeeId,
    setOfflineCheckIn,
    setOfflineCheckOut,

    // Métodos de geolocalización
    fetchCompanySettings,
    getCurrentLocation,
  };
});
