// src/stores/workStatus.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import { format, formatDistance, parseISO, isValid } from "date-fns";

// Helper function to safely parse and validate a date string
function parseAndValidateDate(dateValue: string | Date | undefined | null): Date | null {
  if (!dateValue) return null;

  // Si ya es un objeto Date
  if (dateValue instanceof Date) {
    return isValid(dateValue) ? dateValue : null;
  }

  if (typeof dateValue !== 'string') {
    console.warn('parseAndValidateDate: received non-string value:', dateValue);
    return null;
  }

  try {
    // Intentar parsear como ISO
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) {
      return parsed;
    }

    // Fallback: intentar con new Date()
    const fallbackDate = new Date(dateValue);
    if (isValid(fallbackDate)) {
      return fallbackDate;
    }

    console.warn('parseAndValidateDate: could not parse date:', dateValue);
    return null;
  } catch (error) {
    console.warn('parseAndValidateDate: error parsing date:', dateValue, error);
    return null;
  }
}
import {
  getCurrentPosition,
  getAddressFromCoords,
  formatCoordinates,
  isGeolocationAvailable,
  type GeolocationData,
  type GeolocationError,
} from "../utils/geolocation";
import type {
  WorkLogCategory,
  WorkState,
  OvertimeRegistered,
} from '../types';

interface WorkStatus {
  checkedIn: boolean;
  currentCategory?: WorkLogCategory;
  currentState?: WorkState;
  lastCheckIn?: string;
  lastCheckOut?: string;
  currentDuration?: string;
}

interface CompanySettings {
  geolocationEnabled?: boolean;
  geolocationRequired?: boolean;
  geolocationRadius?: number;
  officeLatitude?: number;
  officeLongitude?: number;
  officeAddress?: string;
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
  const currentState = ref<WorkState>('not_working');
  const lastCategory = ref<WorkLogCategory | null>(null);

  // Night shift and overtime states
  const shiftDate = ref<string | null>(null);
  const isNightShift = ref(false);
  const effectiveHours = ref<number | null>(null);
  const lastOvertimeRegistered = ref<OvertimeRegistered | null>(null);

  // Geolocation states
  const gettingLocation = ref(false);
  const locationData = ref<GeolocationData | null>(null);
  const locationError = ref<GeolocationError | null>(null);
  const companySettings = ref<CompanySettings>({});

  const isCheckedIn = computed(() => status.value?.checkedIn || false);
  const isGeolocationEnabled = computed(
    () => companySettings.value.geolocationEnabled || false
  );
  const isGeolocationRequired = computed(
    () => companySettings.value.geolocationRequired || false
  );
  const isGeolocationAvailableComputed = computed(() =>
    isGeolocationAvailable()
  );

  const formattedLastCheckIn = computed(() => {
    try {
      const date = parseAndValidateDate(status.value?.lastCheckIn);
      if (!date) return "";
      return format(date, "h:mm a");
    } catch (error) {
      console.warn('formattedLastCheckIn: error formatting date:', error);
      return "";
    }
  });

  const formattedLastCheckOut = computed(() => {
    try {
      const date = parseAndValidateDate(status.value?.lastCheckOut);
      if (!date) return "";
      return format(date, "h:mm a");
    } catch (error) {
      console.warn('formattedLastCheckOut: error formatting date:', error);
      return "";
    }
  });

  const formattedCurrentDuration = computed(() => {
    return currentDuration.value || status.value?.currentDuration || "";
  });

  const formattedLocation = computed(() => {
    if (!locationData.value) return "";
    return formatCoordinates(
      locationData.value.latitude,
      locationData.value.longitude,
      locationData.value.accuracy
    );
  });

  const canStartShift = computed(() => currentState.value === 'not_working');
  const canEndShift = computed(() => currentState.value === 'working');
  const canStartBreak = computed(() => currentState.value === 'working');
  const canEndBreak = computed(() => currentState.value === 'on_break');
  const canStartOffsite = computed(() => currentState.value === 'working');
  const canEndOffsite = computed(() => currentState.value === 'offsite');

  const stateLabel = computed(() => {
    switch (currentState.value) {
      case 'working': return 'Working';
      case 'on_break': return 'On Break';
      case 'offsite': return 'Offsite';
      default: return 'Not Working';
    }
  });

  const stateColor = computed(() => {
    switch (currentState.value) {
      case 'working': return 'green';
      case 'on_break': return 'amber';
      case 'offsite': return 'blue';
      default: return 'gray';
    }
  });

  async function fetchCompanySettings() {
    try {
      const employeeId = authStore.user?.employeeRecords?.[0]?.id;
      if (!employeeId) return;

      const response = await api.get(
        `/employees/${employeeId}/company-settings`
      );
      // Backend uses ApiResponse trait: { success: true, data: {...} }
      // Axios response is in response.data, so actual data is in response.data.data
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        companySettings.value = response.data.data;
      } else {
        companySettings.value = response.data;
      }
    } catch (error) {
      console.warn("Could not fetch company settings:", error);
      companySettings.value = { geolocationEnabled: false };
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
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      const response = await api.get(`/worklogs/status/${employeeId}`);
      // Backend uses ApiResponse trait: { success: true, data: { employee, status, category, lastActivity } }
      // Axios response is in response.data, so actual data is in response.data.data
      // Note: API response is now in camelCase (converted by api.ts interceptor)
      let apiData;
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        apiData = response.data.data;
      } else {
        apiData = response.data;
      }

      // Determinar el estado actual basado en la categoria
      let workState: WorkState = 'not_working';
      const category = apiData.category as WorkLogCategory | undefined;

      if (apiData.status === 'in') {
        switch (category) {
          case 'break_start':
            workState = 'on_break';
            break;
          case 'offsite_start':
            workState = 'offsite';
            break;
          default:
            workState = 'working';
        }
      } else if (apiData.status === 'out') {
        // Cuando está en checkout, verificar si es break u offsite activo
        switch (category) {
          case 'break_start':
            workState = 'on_break';
            break;
          case 'offsite_start':
            workState = 'offsite';
            break;
          default:
            workState = 'not_working';
        }
      }

      lastCategory.value = category || null;
      currentState.value = workState;

      // Validar y normalizar el tiempo de lastActivity
      let lastActivityTime: string | undefined;
      if (apiData.lastActivity?.time) {
        try {
          const parsedTime = parseAndValidateDate(apiData.lastActivity.time);
          if (parsedTime && isValid(parsedTime)) {
            lastActivityTime = parsedTime.toISOString();
          }
        } catch (parseError) {
          console.warn('fetchStatus: error parsing lastActivity.time:', apiData.lastActivity.time, parseError);
          lastActivityTime = undefined;
        }
      }

      status.value = {
        checkedIn: apiData.status === 'in',
        currentCategory: category,
        currentState: workState,
        lastCheckIn: apiData.status === 'in' ? lastActivityTime : undefined,
        lastCheckOut: apiData.status === 'out' ? lastActivityTime : undefined,
        currentDuration: '',
      };

      if (status.value.checkedIn && status.value.lastCheckIn) {
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
    try {
      if (!status.value?.checkedIn || !status.value?.lastCheckIn) {
        currentDuration.value = "";
        return;
      }

      const checkInTime = parseAndValidateDate(status.value.lastCheckIn);
      if (!checkInTime || !isValid(checkInTime)) {
        console.warn('updateCurrentDuration: invalid checkInTime from:', status.value.lastCheckIn);
        currentDuration.value = "";
        return;
      }

      const now = new Date();
      if (!isValid(now)) {
        currentDuration.value = "";
        return;
      }

      // Validar que checkInTime no sea futuro
      if (checkInTime.getTime() > now.getTime()) {
        currentDuration.value = "";
        return;
      }

      // Double-check que ambas fechas son válidas antes de formatDistance
      if (isNaN(checkInTime.getTime()) || isNaN(now.getTime())) {
        currentDuration.value = "";
        return;
      }

      currentDuration.value = formatDistance(now, checkInTime, {
        addSuffix: false,
      });
    } catch (error) {
      console.warn('updateCurrentDuration: error calculating duration:', error);
      currentDuration.value = "";
    }
  }

  function getCategoryNote(category: WorkLogCategory): string {
    const notes: Record<WorkLogCategory, string> = {
      shift_start: 'Started shift via Tiemply app',
      shift_end: 'Ended shift via Tiemply app',
      break_start: 'Started break via Tiemply app',
      break_end: 'Returned from break via Tiemply app',
      offsite_start: 'Left office (offsite) via Tiemply app',
      offsite_end: 'Returned to office via Tiemply app',
    };
    return notes[category];
  }

  async function checkIn(category: 'shift_start' | 'break_end' | 'offsite_end' = 'shift_start') {
    if (!authStore.user?.id) return false;

    checkingIn.value = true;

    try {
      const employeeId = authStore.user.employeeRecords?.[0]?.id;
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
        category: category,
        notes: getCategoryNote(category),
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

      // Extract data from response
      let responseData: any = null;
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        responseData = response.data.data;
      } else {
        responseData = response.data;
      }

      // Handle night shift data
      if (responseData?.shiftDate) {
        shiftDate.value = responseData.shiftDate;
      }
      if (responseData?.isNightShift !== undefined) {
        isNightShift.value = responseData.isNightShift;
      }
      if (responseData?.effectiveHours !== undefined) {
        effectiveHours.value = responseData.effectiveHours;
      }

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

  async function checkOut(category: 'shift_end' | 'break_start' | 'offsite_start' = 'shift_end') {
    if (!authStore.user?.id) return false;

    const employeeId = authStore.user.employeeRecords?.[0]?.id;
    console.log('[CheckOut] Starting checkout', { category, userId: authStore.user?.id, employeeId });

    checkingOut.value = true;

    try {
      if (!employeeId) {
        throw new Error("Employee record not found");
      }

      // Obtener ubicación si está habilitada
      let location: GeolocationData | null = null;
      if (isGeolocationEnabled.value) {
        console.log('[CheckOut] Geolocation enabled, attempting to get location...');
        location = await getCurrentLocation();
        console.log('[CheckOut] Geolocation result:', location ? { lat: location.latitude, lng: location.longitude, accuracy: location.accuracy } : 'null');

        // Si la geolocalización es requerida y no se pudo obtener, abortar con mensaje de error
        if (isGeolocationRequired.value && !location) {
          console.error('[CheckOut] ABORTED: Geolocation required but not available');
          toast.error('Location is required for check-out but could not be obtained.');
          return false;
        }
      }

      // Preparar datos para el check-out
      const checkOutData: any = {
        employee_id: employeeId,
        category: category,
        notes: getCategoryNote(category),
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

      console.log('[CheckOut] Sending request to server:', checkOutData);
      const response = await api.post("/worklogs/check-out", checkOutData);
      console.log('[CheckOut] Server response (raw):', response);
      console.log('[CheckOut] Server response (data):', response.data);

      // Extract data from response
      let responseData: any = null;
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        responseData = response.data.data;
      } else {
        responseData = response.data;
      }

      // Handle night shift data
      if (responseData?.shiftDate) {
        shiftDate.value = responseData.shiftDate;
      }
      if (responseData?.isNightShift !== undefined) {
        isNightShift.value = responseData.isNightShift;
      }
      if (responseData?.effectiveHours !== undefined) {
        effectiveHours.value = responseData.effectiveHours;
      }

      // Handle overtime registered
      if (responseData?.overtimeRegistered) {
        lastOvertimeRegistered.value = responseData.overtimeRegistered;
        toast.info(responseData.overtimeRegistered.message);
      }

      // Guardar estado previo para validación
      const wasCheckedIn = status.value?.checkedIn;
      console.log('[CheckOut] State before fetchStatus:', { checkedIn: wasCheckedIn, category: status.value?.currentCategory });

      await fetchStatus();

      console.log('[CheckOut] State after fetchStatus:', { checkedIn: status.value?.checkedIn, category: status.value?.currentCategory });

      // Validar consistencia: si era shift_end, el usuario debería estar deslogueado
      if (category === 'shift_end' && status.value?.checkedIn === true) {
        console.error('[CheckOut] INCONSISTENCY DETECTED: Server returned OK but status still shows checked-in');
        toast.warning('Check-out may not have been recorded. Please verify in your work logs.');
        // NO limpiar locationData - mantener datos para posible reintento
        return false;
      }

      let successMessage = "You have successfully checked out";
      if (location) {
        successMessage += ` at ${formattedLocation.value}`;
      }

      toast.success(successMessage);
      stopRefreshInterval();
      stopDurationUpdateInterval();

      // Limpiar datos de ubicación solo si el checkout fue exitoso y consistente
      locationData.value = null;
      locationError.value = null;

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
        console.error("Check-out error:", error);
        toast.error("Failed to check out. Please try again.");
      }
      return false;
    } finally {
      checkingOut.value = false;
    }
  }

  async function startBreak() {
    return await checkOut('break_start');
  }

  async function endBreak() {
    return await checkIn('break_end');
  }

  async function startOffsite() {
    return await checkOut('offsite_start');
  }

  async function endOffsite() {
    return await checkIn('offsite_end');
  }

  async function endShift() {
    return await checkOut('shift_end');
  }

  async function startShift() {
    return await checkIn('shift_start');
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

    if (status.value?.checkedIn) {
      startRefreshInterval();
      startDurationUpdateInterval();
    }

    return () => {
      stopRefreshInterval();
      stopDurationUpdateInterval();
    };
  }

  function getEmployeeId() {
    return authStore.user?.employeeRecords?.[0]?.id || null;
  }

  function setOfflineCheckIn(category: 'shift_start' | 'break_end' | 'offsite_end' = 'shift_start') {
    let workState: WorkState = 'working';
    if (category === 'break_end') workState = 'working';
    if (category === 'offsite_end') workState = 'working';

    currentState.value = workState;
    lastCategory.value = category;

    status.value = {
      ...status.value,
      checkedIn: true,
      currentCategory: category,
      currentState: workState,
      lastCheckIn: new Date().toISOString(),
    };
    startDurationUpdateInterval();
  }

  function setOfflineCheckOut(category: 'shift_end' | 'break_start' | 'offsite_start' = 'shift_end') {
    let workState: WorkState = 'not_working';
    if (category === 'break_start') workState = 'on_break';
    if (category === 'offsite_start') workState = 'offsite';

    currentState.value = workState;
    lastCategory.value = category;

    status.value = {
      ...status.value,
      checkedIn: category !== 'shift_end',
      currentCategory: category,
      currentState: workState,
      lastCheckOut: new Date().toISOString(),
    };

    if (category === 'shift_end') {
      stopDurationUpdateInterval();
    }
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

    // Nuevos estados
    currentState,
    lastCategory,

    // Night shift and overtime states
    shiftDate,
    isNightShift,
    effectiveHours,
    lastOvertimeRegistered,

    // Estado de geolocalización
    gettingLocation,
    locationData,
    locationError,
    companySettings,
    isGeolocationEnabled,
    isGeolocationRequired,
    isGeolocationAvailable: isGeolocationAvailableComputed,
    formattedLocation,

    // Nuevos computed
    canStartShift,
    canEndShift,
    canStartBreak,
    canEndBreak,
    canStartOffsite,
    canEndOffsite,
    stateLabel,
    stateColor,

    // Métodos existentes
    fetchStatus,
    checkIn,
    checkOut,
    initialize,
    getEmployeeId,
    setOfflineCheckIn,
    setOfflineCheckOut,

    // Nuevos metodos
    startBreak,
    endBreak,
    startOffsite,
    endOffsite,
    endShift,
    startShift,

    // Métodos de geolocalización
    fetchCompanySettings,
    getCurrentLocation,
  };
});
