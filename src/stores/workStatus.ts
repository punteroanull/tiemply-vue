// src/stores/workStatus.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "./auth";
import i18n from "../i18n";
import { unwrap, apiErrorMessage } from "../utils/apiResponse";
import {
  formatApiDate,
  formatClockTime,
  formatMinutesAsClock,
} from "../utils/apiDates";
import {
  getCurrentPosition,
  formatCoordinates,
  isGeolocationAvailable,
  type GeolocationData,
  type GeolocationError,
} from "../utils/geolocation";
import {
  getPendingActions,
  savePendingAction,
  syncPendingActions,
} from "../utils/offlineManager";
import type { WorkLogCategory, WorkState } from "../types";

export type ClockInCategory = "shift_start" | "break_end" | "offsite_end";
export type ClockOutCategory = "shift_end" | "break_start" | "offsite_start";

/**
 * Why a clock action did not go through. The offline queue needs the difference: a
 * `network` or `location` failure is worth retrying later, a `rejected` one is final.
 */
export type ActionFailure = "busy" | "auth" | "location" | "network" | "rejected";

export interface ActionResult {
  ok: boolean;
  reason?: ActionFailure;
  message?: string;
}

interface WorkStatus {
  checkedIn: boolean;
  currentCategory?: WorkLogCategory;
  currentState?: WorkState;
  lastCheckIn?: string;
  lastCheckOut?: string;
  /** When the shift in progress started, regardless of the breaks taken since. */
  shiftStartedAt?: string;
  /** Time of the latest entry of any kind: when the current break or outing began. */
  lastActivityAt?: string;
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

const CLOCK_IN_CATEGORIES: WorkLogCategory[] = ["shift_start", "break_end", "offsite_end"];

function isClockIn(category: WorkLogCategory): category is ClockInCategory {
  return CLOCK_IN_CATEGORIES.includes(category);
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value as string);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

function stateAfter(category: WorkLogCategory | undefined | null): WorkState {
  switch (category) {
    case "shift_start":
    case "break_end":
    case "offsite_end":
      return "working";
    case "break_start":
      return "on_break";
    case "offsite_start":
      return "offsite";
    default:
      return "not_working";
  }
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

export const useWorkStatusStore = defineStore("workStatus", () => {
  const toast = useToast();
  const authStore = useAuthStore();

  // The store lives outside the component tree, so it uses the global i18n instance rather
  // than useI18n().
  const t = (key: string, params?: Record<string, unknown>, plural?: number) =>
    plural === undefined
      ? (i18n.global.t as any)(key, params ?? {})
      : (i18n.global.t as any)(key, params ?? {}, plural);

  const status = ref<WorkStatus | null>(null);
  const loading = ref(false);
  const statusError = ref(false);
  const checkingIn = ref(false);
  const checkingOut = ref(false);
  const refreshInterval = ref<number | null>(null);
  const durationUpdateInterval = ref<number | null>(null);
  const currentDuration = ref<string>("");
  const currentState = ref<WorkState>("not_working");
  const lastCategory = ref<WorkLogCategory | null>(null);

  // Night shift
  const shiftDate = ref<string | null>(null);
  const isNightShift = ref(false);

  // Offline queue and the "end shift" confirmation shared by every entry point
  const pendingCount = ref(0);
  const confirmingEndShift = ref(false);

  // Geolocation states
  const gettingLocation = ref(false);
  const locationData = ref<GeolocationData | null>(null);
  const locationError = ref<GeolocationError | null>(null);
  const companySettings = ref<CompanySettings>({});

  const isBusy = computed(() => checkingIn.value || checkingOut.value);
  const isCheckedIn = computed(() => status.value?.checkedIn || false);

  /** False until the company settings arrived: geolocation rules are unknown before that. */
  const settingsLoaded = computed(
    () => companySettings.value?.geolocationEnabled !== undefined
  );

  // The API skips every geolocation rule for remote workers, so the app must not block
  // them for lacking a position either.
  const isRemoteWorker = computed(
    () => Boolean(authStore.currentEmployee?.isRemoteWorker)
  );

  const isGeolocationEnabled = computed(
    () => companySettings.value?.geolocationEnabled || false
  );
  const isGeolocationRequired = computed(
    () => (companySettings.value?.geolocationRequired || false) && !isRemoteWorker.value
  );
  const isGeolocationAvailableComputed = computed(() => isGeolocationAvailable());

  /** Start of the shift in progress ("HH:mm"). */
  const formattedLastCheckIn = computed(() =>
    formatClockTime(status.value?.shiftStartedAt ?? status.value?.lastCheckIn)
  );

  /** Time of the last exit: end of shift, or start of the current break or outing. */
  const formattedLastCheckOut = computed(() =>
    formatClockTime(
      status.value?.lastCheckOut ??
        (currentState.value === "working" ? undefined : status.value?.lastActivityAt)
    )
  );

  const formattedCurrentDuration = computed(() => currentDuration.value || "");

  /** Shift date in the app language, only when it differs from the calendar day. */
  const formattedShiftDate = computed(() =>
    isNightShift.value && shiftDate.value ? formatApiDate(shiftDate.value, "PPP") : ""
  );

  const formattedLocation = computed(() => {
    if (!locationData.value) return "";
    return formatCoordinates(
      locationData.value.latitude,
      locationData.value.longitude,
      locationData.value.accuracy
    );
  });

  const canStartShift = computed(() => currentState.value === "not_working");
  const canEndShift = computed(() => currentState.value === "working");
  const canStartBreak = computed(() => currentState.value === "working");
  const canEndBreak = computed(() => currentState.value === "on_break");
  const canStartOffsite = computed(() => currentState.value === "working");
  const canEndOffsite = computed(() => currentState.value === "offsite");

  const stateLabel = computed(() => {
    switch (currentState.value) {
      case "working":
        return t("workStatus.working");
      case "on_break":
        return t("workStatus.onBreak");
      case "offsite":
        return t("workStatus.offsite");
      default:
        return t("workStatus.notWorking");
    }
  });

  const stateColor = computed(() => {
    switch (currentState.value) {
      case "working":
        return "green";
      case "on_break":
        return "amber";
      case "offsite":
        return "blue";
      default:
        return "gray";
    }
  });

  function getEmployeeId(): string | null {
    return authStore.currentEmployee?.id || null;
  }

  async function fetchCompanySettings() {
    const employeeId = getEmployeeId();
    if (!employeeId) return;

    try {
      const response = await api.get(`/employees/${employeeId}/company-settings`);
      const settings = unwrap<CompanySettings>(response);
      if (settings && typeof settings === "object") {
        companySettings.value = settings;
      }
    } catch (error) {
      // Left unknown on purpose: assuming "geolocation off" would send a clock action without
      // a position to a company that requires one. The next action asks for them again.
      console.warn("Could not fetch company settings:", error);
    }
  }

  async function getCurrentLocation(): Promise<GeolocationData | null> {
    // The company does not use geolocation: no location, and nothing to tell the user.
    if (!isGeolocationEnabled.value) {
      return null;
    }

    // The browser has no geolocation API at all (an insecure context, typically).
    if (!isGeolocationAvailableComputed.value) {
      locationError.value = {
        code: 0,
        messageKey: "geolocation.errors.notSupported",
        message: "Geolocation is not supported by this browser.",
      };

      if (isGeolocationRequired.value) {
        toast.error(t("geolocation.errors.notSupported"));
      }

      return null;
    }

    gettingLocation.value = true;
    locationError.value = null;

    try {
      const location = await getCurrentPosition();

      // The position goes to the Tiemply API and nowhere else: no street-address lookup
      // through an outside service.
      locationData.value = location;
      return location;
    } catch (error) {
      const geoError = error as GeolocationError;
      locationError.value = geoError;

      const reason = t(geoError.messageKey ?? "geolocation.errors.unknown");

      if (isGeolocationRequired.value) {
        toast.error(t("geolocation.errors.requiredIntro", { reason }));
      } else {
        toast.warning(t("geolocation.errors.optionalIntro", { reason }));
      }

      return null;
    } finally {
      gettingLocation.value = false;
    }
  }

  /** Clear the last location failure and try again. */
  async function retryLocation(): Promise<GeolocationData | null> {
    locationError.value = null;

    return getCurrentLocation();
  }

  /**
   * Put the store in the state a clock action leaves behind, without asking the server.
   * Used right after a successful request and for entries waiting in the offline queue.
   */
  function applyLocalState(category: WorkLogCategory, at: Date = new Date()) {
    const iso = at.toISOString();
    const state = stateAfter(category);
    const previous = status.value;
    const clockIn = isClockIn(category);

    currentState.value = state;
    lastCategory.value = category;

    status.value = {
      checkedIn: clockIn,
      currentCategory: category,
      currentState: state,
      lastCheckIn: clockIn ? iso : previous?.lastCheckIn,
      lastCheckOut: clockIn ? undefined : iso,
      shiftStartedAt:
        category === "shift_start"
          ? iso
          : category === "shift_end"
          ? undefined
          : previous?.shiftStartedAt,
      lastActivityAt: iso,
      currentDuration: "",
    };

    if (category === "shift_end") {
      isNightShift.value = false;
      shiftDate.value = null;
    }

    syncTimers();
  }

  /** Show entries still waiting in the offline queue on top of what the server knows. */
  function applyPendingQueue() {
    const employeeId = getEmployeeId();
    const pending = employeeId ? getPendingActions(employeeId) : [];
    pendingCount.value = pending.length;

    for (const action of pending) {
      const category = action.data?.category as WorkLogCategory | undefined;
      if (category) {
        applyLocalState(category, new Date(action.timestamp));
      }
    }
  }

  /**
   * Load the current state from the server.
   *
   * `silent` is for background refreshes: a failed poll must not interrupt the user, least
   * of all once a minute while they have no signal.
   */
  async function fetchStatus(options: { silent?: boolean } = {}): Promise<boolean> {
    const employeeId = getEmployeeId();
    if (!authStore.user?.id || !employeeId) return false;

    if (!options.silent) loading.value = true;

    try {
      const response = await api.get(`/worklogs/status/${employeeId}`);
      const apiData = unwrap<any>(response);
      if (!apiData || typeof apiData !== "object") {
        throw new Error("Unexpected status response");
      }

      const category = (apiData.category || undefined) as WorkLogCategory | undefined;
      const workState = stateAfter(category);
      const lastActivityAt = toIso(apiData.lastActivity?.time);
      const checkedIn = apiData.status === "in";

      lastCategory.value = category || null;
      currentState.value = workState;

      status.value = {
        checkedIn,
        currentCategory: category,
        currentState: workState,
        lastCheckIn: checkedIn ? lastActivityAt : undefined,
        lastCheckOut: checkedIn ? undefined : lastActivityAt,
        shiftStartedAt:
          workState === "not_working"
            ? undefined
            : toIso(apiData.shiftStartedAt) ??
              (category === "shift_start" ? lastActivityAt : undefined),
        lastActivityAt,
        currentDuration: "",
      };

      if (apiData.isNightShift !== undefined) {
        isNightShift.value = Boolean(apiData.isNightShift) && workState !== "not_working";
      }
      if (apiData.shiftDate !== undefined) {
        shiftDate.value = workState === "not_working" ? null : apiData.shiftDate;
      }

      statusError.value = false;
      applyPendingQueue();
      syncTimers();
      return true;
    } catch (error) {
      statusError.value = true;
      // Without a server answer the queue is all there is: keep showing what the user did.
      applyPendingQueue();
      if (!options.silent && isOnline()) {
        toast.error(t("workStatus.toasts.statusError"));
      }
      return false;
    } finally {
      if (!options.silent) loading.value = false;
    }
  }

  function updateCurrentDuration() {
    const current = status.value;
    if (!current || currentState.value === "not_working") {
      currentDuration.value = "";
      return;
    }

    // While working the clock runs from the start of the shift; on a break or away from the
    // office it shows how long that has lasted.
    const sinceIso =
      currentState.value === "working"
        ? current.shiftStartedAt ?? current.lastActivityAt
        : current.lastActivityAt;
    const since = sinceIso ? new Date(sinceIso) : null;

    if (!since || isNaN(since.getTime()) || since.getTime() > Date.now()) {
      currentDuration.value = "";
      return;
    }

    currentDuration.value = formatMinutesAsClock(
      Math.floor((Date.now() - since.getTime()) / 60000)
    );
  }

  /**
   * Record a clock action on the server.
   *
   * `quiet` suppresses the toasts: the offline queue reports its own summary instead of one
   * message per replayed entry.
   */
  async function submit(
    category: WorkLogCategory,
    options: { notes?: string; quiet?: boolean; occurredAt?: number } = {}
  ): Promise<ActionResult> {
    // A double tap, or the queue replaying while the user presses a button, must not send
    // the same entry twice.
    if (isBusy.value) return { ok: false, reason: "busy" };

    const employeeId = getEmployeeId();
    if (!authStore.user?.id || !employeeId) {
      if (!options.quiet) toast.error(t("workStatus.toasts.noEmployee"));
      return { ok: false, reason: "auth" };
    }

    const clockIn = isClockIn(category);
    const flag = clockIn ? checkingIn : checkingOut;
    flag.value = true;

    try {
      if (!settingsLoaded.value) {
        await fetchCompanySettings();
      }

      let location: GeolocationData | null = null;
      if (isGeolocationEnabled.value) {
        location = await getCurrentLocation();

        // getCurrentLocation() already explained the specific cause; the generic message
        // only covers a path that returned null without recording one.
        if (isGeolocationRequired.value && !location) {
          if (!locationError.value && !options.quiet) {
            toast.error(
              t(clockIn ? "geolocation.errors.abortedCheckIn" : "geolocation.errors.abortedCheckOut")
            );
          }
          return { ok: false, reason: "location" };
        }
      }

      const payload: Record<string, unknown> = {
        employee_id: employeeId,
        category,
        notes: options.notes || t(`workStatus.notes.${category}`),
      };

      // Only for entries replayed from the offline queue: the moment the person acted,
      // which the API uses instead of the time the request arrives.
      if (options.occurredAt && Number.isFinite(options.occurredAt)) {
        payload.occurred_at = new Date(options.occurredAt).toISOString();
      }

      if (location) {
        payload.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        };
      }

      const response = await api.post(
        clockIn ? "/worklogs/check-in" : "/worklogs/check-out",
        payload
      );

      if (response?.data?.success === false) {
        const message = response.data?.message || t("workStatus.toasts.actionFailed");
        if (!options.quiet) toast.error(message);
        return { ok: false, reason: "rejected", message };
      }

      const recorded = unwrap<any>(response);

      // The request went through: reflect it now, then confirm with the server. If that
      // second request fails the entry is still recorded, so the state stays as applied.
      applyLocalState(category);

      if (recorded && typeof recorded === "object" && category !== "shift_end") {
        if (recorded.isNightShift !== undefined) {
          isNightShift.value = Boolean(recorded.isNightShift);
        }
        if (recorded.shiftDate) {
          shiftDate.value = recorded.shiftDate;
        }
      }

      const confirmed = await fetchStatus({ silent: true });

      if (confirmed && category === "shift_end" && currentState.value !== "not_working") {
        const message = t("messages.checkoutNotRecorded");
        if (!options.quiet) toast.warning(message);
        return { ok: false, reason: "rejected", message };
      }

      if (!options.quiet) toast.success(t(`workStatus.toasts.${category}`));

      if (category === "shift_end") {
        locationData.value = null;
        locationError.value = null;
      }

      return { ok: true };
    } catch (error: any) {
      const statusCode: number | undefined = error?.response?.status;

      if (!statusCode) {
        if (!options.quiet) toast.error(t("workStatus.toasts.actionFailed"));
        return { ok: false, reason: "network" };
      }

      const message = apiErrorMessage(error, t("workStatus.toasts.actionFailed"));

      if (!options.quiet) {
        toast.error(
          // Refusals that carry their own explanation: invalid data, a deactivated
          // employee record, or another entry of the same person still being recorded.
          statusCode === 422 || statusCode === 403 || statusCode === 409
            ? message
            : t("workStatus.toasts.serverError", { status: statusCode, message })
        );
      }

      // A server fault, an expired session or another entry in progress (409) says
      // nothing about this entry itself: it can be sent again.
      const retryable =
        statusCode >= 500 ||
        statusCode === 401 ||
        statusCode === 408 ||
        statusCode === 409 ||
        statusCode === 429;
      return { ok: false, reason: retryable ? "network" : "rejected", message };
    } finally {
      flag.value = false;
    }
  }

  async function checkIn(category: ClockInCategory = "shift_start") {
    return (await submit(category)).ok;
  }

  async function checkOut(category: ClockOutCategory = "shift_end") {
    return (await submit(category)).ok;
  }

  /** Replay an entry from the offline queue. See utils/offlineManager. */
  function submitQueuedAction(category: WorkLogCategory, notes?: string, occurredAt?: number) {
    return submit(category, { notes, quiet: true, occurredAt });
  }

  /** Keep an entry made without connection, and show it as done. */
  function queueOffline(category: WorkLogCategory): boolean {
    const employeeId = getEmployeeId();
    if (!employeeId) {
      toast.error(t("workStatus.toasts.noEmployee"));
      return false;
    }

    const timestamp = Date.now();
    savePendingAction({
      type: isClockIn(category) ? "check-in" : "check-out",
      timestamp,
      employeeId,
      data: { category, notes: t(`workStatus.notes.${category}`) },
    });

    applyLocalState(category, new Date(timestamp));
    pendingCount.value = getPendingActions(employeeId).length;
    toast.info(t("workStatus.toasts.savedOffline"));
    return true;
  }

  /** Run a clock action now, or queue it when there is no connection. */
  async function performAction(category: WorkLogCategory): Promise<boolean> {
    if (isBusy.value || gettingLocation.value) return false;

    if (!isOnline()) {
      return queueOffline(category);
    }

    return (await submit(category)).ok;
  }

  /**
   * Entry point for every button. Ending the shift cannot be undone by the employee, so
   * it waits for an explicit confirmation; everything else runs straight away.
   */
  async function requestAction(category: WorkLogCategory): Promise<boolean> {
    if (category === "shift_end") {
      confirmingEndShift.value = true;
      return false;
    }

    return performAction(category);
  }

  async function confirmEndShift(): Promise<boolean> {
    confirmingEndShift.value = false;
    return performAction("shift_end");
  }

  function cancelEndShift() {
    confirmingEndShift.value = false;
  }

  async function startBreak() {
    return await checkOut("break_start");
  }

  async function endBreak() {
    return await checkIn("break_end");
  }

  async function startOffsite() {
    return await checkOut("offsite_start");
  }

  async function endOffsite() {
    return await checkIn("offsite_end");
  }

  async function endShift() {
    return await checkOut("shift_end");
  }

  async function startShift() {
    return await checkIn("shift_start");
  }

  function stopRefreshInterval() {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
  }

  function stopDurationUpdateInterval() {
    if (durationUpdateInterval.value) {
      clearInterval(durationUpdateInterval.value);
      durationUpdateInterval.value = null;
    }
    currentDuration.value = "";
  }

  /** Run the refresh and elapsed-time timers exactly while a shift is in progress. */
  function syncTimers() {
    if (currentState.value === "not_working") {
      stopRefreshInterval();
      stopDurationUpdateInterval();
      return;
    }

    updateCurrentDuration();

    if (typeof window === "undefined") return;

    if (!refreshInterval.value) {
      refreshInterval.value = window.setInterval(() => {
        // Nothing to ask for without a connection.
        if (isOnline()) fetchStatus({ silent: true });
      }, 60000);
    }

    if (!durationUpdateInterval.value) {
      durationUpdateInterval.value = window.setInterval(updateCurrentDuration, 30000);
    }
  }

  async function initialize() {
    await fetchCompanySettings();
    await fetchStatus();

    // The session and the company rules are known now, which is what a queued entry needs.
    if (pendingCount.value > 0 && isOnline()) {
      void syncPendingActions();
    }

    return () => {
      stopRefreshInterval();
      stopDurationUpdateInterval();
    };
  }

  function setOfflineCheckIn(category: ClockInCategory = "shift_start") {
    applyLocalState(category);
  }

  function setOfflineCheckOut(category: ClockOutCategory = "shift_end") {
    applyLocalState(category);
  }

  /** Re-read how many entries are waiting in the offline queue. */
  function refreshPendingCount() {
    const employeeId = getEmployeeId();
    pendingCount.value = employeeId ? getPendingActions(employeeId).length : 0;
  }

  /**
   * Drop everything cached for the current identity.
   *
   * Called when the signed-in user changes: without it, entering or leaving an
   * impersonation carries the previous person's shift state and company settings over.
   */
  function reset() {
    stopRefreshInterval();
    stopDurationUpdateInterval();
    status.value = null;
    loading.value = false;
    statusError.value = false;
    checkingIn.value = false;
    checkingOut.value = false;
    currentDuration.value = "";
    currentState.value = "not_working";
    lastCategory.value = null;
    shiftDate.value = null;
    isNightShift.value = false;
    pendingCount.value = 0;
    confirmingEndShift.value = false;
    gettingLocation.value = false;
    locationData.value = null;
    locationError.value = null;
    companySettings.value = {};
  }

  return {
    reset,
    status,
    loading,
    statusError,
    checkingIn,
    checkingOut,
    isBusy,
    isCheckedIn,
    formattedLastCheckIn,
    formattedLastCheckOut,
    formattedCurrentDuration,

    currentState,
    lastCategory,

    // Night shift
    shiftDate,
    isNightShift,
    formattedShiftDate,

    // Offline queue and confirmation
    pendingCount,
    confirmingEndShift,

    // Geolocation
    gettingLocation,
    locationData,
    locationError,
    companySettings,
    settingsLoaded,
    isRemoteWorker,
    isGeolocationEnabled,
    isGeolocationRequired,
    isGeolocationAvailable: isGeolocationAvailableComputed,
    formattedLocation,

    canStartShift,
    canEndShift,
    canStartBreak,
    canEndBreak,
    canStartOffsite,
    canEndOffsite,
    stateLabel,
    stateColor,

    fetchStatus,
    checkIn,
    checkOut,
    initialize,
    getEmployeeId,
    setOfflineCheckIn,
    setOfflineCheckOut,
    refreshPendingCount,

    requestAction,
    performAction,
    confirmEndShift,
    cancelEndShift,
    submitQueuedAction,

    startBreak,
    endBreak,
    startOffsite,
    endOffsite,
    endShift,
    startShift,

    fetchCompanySettings,
    getCurrentLocation,
    retryLocation,
  };
});
