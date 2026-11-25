import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import i18n, { isSupportedLocale, savedLocale, setAppLocale } from "../i18n";
import { useToast } from "vue-toastification";
import { resetAllStores } from "./reset";
import {
  IMPERSONATING_KEY,
  ORIGINAL_TOKEN_KEY,
  TOKEN_KEY,
  resolveImpersonated401,
} from "../services/impersonationErrors";
import { apiErrorMessage, unwrap } from "../utils/apiResponse";

// Note: snake_case to camelCase conversion is handled globally in api.ts interceptor, so
// everything read from a response below is camelCase.

interface Role {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  isExempt?: boolean;
  accessLevel?: number;
}

interface Company {
  id: string;
  uuid?: string;
  name: string;
  taxId?: string;
  contactEmail?: string;
  contactPerson?: string;
  address?: string;
  phone?: string;
  vacationType?: "business_days" | "calendar_days";
  maxVacationDays?: number;
  vacationRequestAdvanceDays?: number;
  logoPath?: string;
  /** Plan features of the company, as slugs. Absent on an API that does not send them. */
  features?: string[];
}

/** A subscription feature the API gates routes behind. */
export type CompanyFeature =
  | "overtime"
  | "geolocation"
  | "export_reports"
  | "departments_advanced"
  | "employee_schedules"
  | "guard_shifts";

interface SupervisedDepartment {
  id: string;
  name: string;
  companyId: string;
}

interface Department {
  id: string;
  uuid?: string;
  companyId: string;
  supervisorId?: string;
  name: string;
  description?: string;
}

interface Employee {
  id: string;
  uuid?: string;
  companyId: string;
  departmentId?: string;
  userId: string;
  contractStartTime?: string; // HH:mm format
  contractEndTime?: string; // HH:mm format
  remainingVacationDays: number;
  active: boolean;
  isRemoteWorker?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Relations
  company?: Company;
  department?: Department;
}

/** Context of an administrator viewing the app as someone else. */
export interface Impersonation {
  sessionId: string;
  impersonatorName: string;
  impersonatorEmail: string;
  impersonatedName: string;
  impersonatedEmail: string;
  writesEnabled: boolean;
  expiresAt: string;
  returnUrl: string;
}

interface User {
  id: string;
  uuid?: string;
  name: string;
  email: string;
  identificationNumber?: string;
  birthDate?: string; // API calendar date, see utils/apiDates
  phone?: string;
  address?: string;
  locale?: string | null;
  roleId?: string;
  registeredAt?: string; // ISO datetime string
  emailVerifiedAt?: string; // ISO datetime string
  createdAt?: string;
  updatedAt?: string;
  impersonation?: Impersonation | null;
  // Relations
  role?: Role;
  employeeRecords?: Employee[];
  companies?: Company[];
  /** Every department this person supervises, their own or not. */
  supervisedDepartments?: SupervisedDepartment[];
}

interface LoginCredentials {
  email: string;
  password: string;
}

export interface ProfileData {
  name?: string;
  phone?: string | null;
  address?: string | null;
}

export interface PasswordChangeData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface PasswordResetData {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

/** Outcome of a form request: field errors come back keyed as the API names them. */
export interface FormResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

function formFailure(err: any, fallback: string): FormResult {
  const errors = err?.response?.data?.errors;
  const fieldErrors: Record<string, string> = {};
  if (errors && typeof errors === "object") {
    for (const [field, messages] of Object.entries(errors)) {
      const first = Array.isArray(messages) ? messages[0] : messages;
      if (typeof first === "string") fieldErrors[field] = first;
    }
  }
  return { ok: false, message: apiErrorMessage(err, fallback), fieldErrors };
}

const t = (key: string) => i18n.global.t(key);

export const useAuthStore = defineStore("auth", () => {
  const toast = useToast();

  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));

  /**
   * Impersonation context, refreshed from /me so it survives a page reload.
   * The parked administrator token lives under a separate key, since "token" is always
   * the one in use and is cleared on logout and on a 401.
   */
  const impersonation = ref<Impersonation | null>(null);
  const loading = ref(false);
  const error = ref("");

  /**
   * /me failed for a reason other than an invalid token (offline, 5xx, timeout). The
   * session is still there, so the shell shows a retry screen instead of waiting forever.
   */
  const userLoadFailed = ref(false);

  /**
   * The browser is being sent to another site (the admin panel). Whoever reacts to the
   * session ending must not start a navigation of their own on top of that one.
   */
  const leavingApp = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  const isImpersonating = computed(() => !!impersonation.value);
  const canWriteWhileImpersonating = computed(
    () => !impersonation.value || impersonation.value.writesEnabled
  );

  // Computed properties for user information
  const currentUser = computed(() => user.value);

  /**
   * The employee record the whole app works with: the first active one, or the first one
   * when none is active. Every store and view must go through this (never
   * `employeeRecords[0]`), otherwise a user with an old inactive record sees the data of
   * the wrong employment.
   */
  const currentEmployee = computed(() => {
    if (!user.value?.employeeRecords?.length) return null;
    return (
      user.value.employeeRecords.find((emp) => emp.active) ||
      user.value.employeeRecords[0]
    );
  });

  const currentEmployeeId = computed(() => currentEmployee.value?.id ?? null);

  const currentCompany = computed(() => {
    return currentEmployee.value?.company || null;
  });

  const currentCompanyId = computed(
    () => currentEmployee.value?.companyId ?? currentCompany.value?.id ?? null
  );

  const currentDepartment = computed(() => {
    return currentEmployee.value?.department || null;
  });

  const currentDepartmentId = computed(() => {
    return currentEmployee.value?.departmentId || null;
  });

  const companyLogoUrl = computed(() => {
    const logoPath = currentCompany.value?.logoPath;
    if (!logoPath) return null;

    // Construir URL: {API_BASE}/storage/{logo_path}
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
    const baseUrl = apiUrl.replace(/\/api$/, ""); // Quitar /api del final
    return `${baseUrl}/storage/${logoPath}`;
  });

  const userRole = computed(() => user.value?.role || null);

  const isAdmin = computed(() => userRole.value?.name === "Administrator");
  const isManager = computed(() => userRole.value?.name === "Manager");
  const isEmployee = computed(() => userRole.value?.name === "Employee");

  const isSupervisor = computed(() => {
    const deptId = currentDepartmentId.value;
    const employeeId = currentEmployee.value?.id;
    if (!deptId || !employeeId) return false;
    return currentDepartment.value?.supervisorId === employeeId;
  });

  /**
   * Supervises at least one department of the current company, including one they do not
   * belong to. `isSupervisor` only covers their own department.
   */
  const supervisesAnyDepartment = computed(() => {
    if (isSupervisor.value) return true;
    const companyId = currentCompanyId.value;
    return (user.value?.supervisedDepartments ?? []).some(
      (dept) => !companyId || dept.companyId === companyId
    );
  });

  /**
   * Whether the company plan includes a feature. An API that does not list the features
   * yet gets the benefit of the doubt: its 403 is still handled where the data loads.
   */
  function hasFeature(feature: CompanyFeature): boolean {
    const features = currentCompany.value?.features;
    return Array.isArray(features) ? features.includes(feature) : true;
  }

  const isExemptFromTimeTracking = computed(
    () => userRole.value?.isExempt || false
  );

  const remainingVacationDays = computed(
    () => currentEmployee.value?.remainingVacationDays || 0
  );

  const workingHours = computed(() => {
    if (
      !currentEmployee.value?.contractStartTime ||
      !currentEmployee.value?.contractEndTime
    ) {
      return null;
    }
    return {
      start: currentEmployee.value.contractStartTime,
      end: currentEmployee.value.contractEndTime,
    };
  });

  async function login(credentials: LoginCredentials) {
    loading.value = true;
    error.value = "";

    try {
      const response = await api.post("/login", credentials);
      const payload = unwrap<{ token?: string }>(response);

      if (!payload?.token) {
        error.value = t("messages.invalidResponse");
        toast.error(t("messages.loginFailed"));
        return false;
      }

      token.value = payload.token;
      localStorage.setItem(TOKEN_KEY, payload.token);

      // Signing in as someone else in the same tab used to carry the previous user's
      // cached data over.
      await resetAllStores();

      // Always fetch full user data from /me to get employee_records and other relations.
      // If that fails the shell offers a retry (see userLoadFailed), the login itself held.
      await fetchCurrentUser();

      toast.success(t("messages.loginSuccess"));
      return true;
    } catch (err: any) {
      error.value = apiErrorMessage(err, t("messages.loginFailed"));
      toast.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /** Update the person's own contact details. Email and role are not theirs to change. */
  async function updateProfile(data: ProfileData): Promise<FormResult> {
    try {
      const response = await api.put("/me", data);
      const updated = unwrap<Partial<User> | null>(response);
      const pick = (field: "phone" | "address") =>
        (updated && field in updated ? updated[field] : data[field]) ?? undefined;

      if (user.value) {
        // The answer may be the bare user, without the relations /me carries.
        user.value = {
          ...user.value,
          name: updated?.name ?? data.name ?? user.value.name,
          phone: pick("phone"),
          address: pick("address"),
        };
      }

      toast.success(t("messages.profileUpdated"));
      return { ok: true };
    } catch (err: any) {
      return formFailure(err, t("messages.profileUpdateFailed"));
    }
  }

  /** Change the password. The API signs the other devices out; this one stays in. */
  async function changePassword(data: PasswordChangeData): Promise<FormResult> {
    try {
      await api.put("/me/password", data);
      toast.success(t("messages.passwordChanged"));
      return { ok: true };
    } catch (err: any) {
      return formFailure(err, t("messages.passwordChangeFailed"));
    }
  }

  /**
   * Ask for a reset link. The API answers the same whether or not the address has an
   * account, so the caller shows one neutral confirmation either way.
   */
  async function requestPasswordReset(email: string): Promise<FormResult> {
    try {
      await api.post("/password/forgot", { email });
      return { ok: true };
    } catch (err: any) {
      return formFailure(err, t("auth.reset.requestFailed"));
    }
  }

  async function resetPassword(data: PasswordResetData): Promise<FormResult> {
    try {
      await api.post("/password/reset", data);
      return { ok: true };
    } catch (err: any) {
      return formFailure(err, t("auth.reset.failed"));
    }
  }

  // One /me per token at a time: the router guard and the shell both ask on a cold load.
  let pendingUser: { token: string; promise: Promise<User | null> } | null = null;

  function fetchCurrentUser(): Promise<User | null> {
    const current = token.value;
    if (!current) return Promise.resolve(null);

    if (pendingUser?.token === current) return pendingUser.promise;

    const promise = loadCurrentUser(current).finally(() => {
      if (pendingUser?.promise === promise) pendingUser = null;
    });
    pendingUser = { token: current, promise };
    return promise;
  }

  async function loadCurrentUser(usedToken: string): Promise<User | null> {
    loading.value = true;
    userLoadFailed.value = false;

    try {
      const response = await api.get("/me");

      // The identity changed while this was in flight: the answer is about someone else.
      if (token.value !== usedToken) return user.value;

      user.value = unwrap<User>(response);

      // /me is the only thing that survives a reload, so the banner state comes from it.
      syncImpersonation(user.value?.impersonation ?? null);
      applyUserLocale();

      return user.value;
    } catch (err: any) {
      if (token.value !== usedToken) return user.value;

      error.value = t("messages.fetchError");

      if (err.response?.status === 401) {
        return handleUnauthorized(usedToken);
      }

      userLoadFailed.value = true;
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * The token used for /me is dead.
   *
   * The axios interceptor has normally dealt with it already: it restored the parked
   * administrator token if this was an impersonation, or cleared the token otherwise, and
   * started a navigation. This only brings the store in line with what is in storage. It
   * must never call logout() or stopImpersonation(): by now "token" may hold the
   * administrator's own restored token, and both of those would revoke or delete it.
   */
  async function handleUnauthorized(deadToken: string): Promise<User | null> {
    // Still the dead token in storage: the interceptor did not run (it does not in unit
    // tests), so do its job here. Both steps are idempotent.
    if (localStorage.getItem(TOKEN_KEY) === deadToken) {
      if (resolveImpersonated401(import.meta.env.VITE_ADMIN_URL) === null) {
        localStorage.removeItem(TOKEN_KEY);
      }
    }

    user.value = null;
    impersonation.value = null;
    token.value = localStorage.getItem(TOKEN_KEY);

    await resetAllStores();

    // An administrator's own session was restored: load it.
    return token.value ? loadCurrentUser(token.value) : null;
  }

  function clearSession() {
    user.value = null;
    token.value = null;
    impersonation.value = null;
    userLoadFailed.value = false;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ORIGINAL_TOKEN_KEY);
    localStorage.removeItem(IMPERSONATING_KEY);
  }

  async function logout() {
    try {
      if (token.value) {
        await api.post("/logout");
      }
    } catch (error) {
      // Already expired or offline: the local sign-out below is what matters.
      console.warn("Logout request failed:", error);
    } finally {
      clearSession();

      // SIGN-OUT CLEANUP — the single place where per-identity state is dropped when the
      // session ends. Anything that must not outlive the signed-in person (cached store
      // data, and the offline action queue once it is scoped per employee) is cleared
      // from here.
      await resetAllStores();

      toast.info(t("messages.logoutSuccess"));
    }
  }

  function hasRole(roleName: string): boolean {
    return userRole.value?.name === roleName;
  }

  function hasAccessLevel(level: number): boolean {
    return (userRole.value?.accessLevel || 0) >= level;
  }

  function belongsToCompany(companyId: string): boolean {
    if (!user.value?.employeeRecords) return false;
    return user.value.employeeRecords.some(
      (emp) => emp.companyId === companyId
    );
  }

  function getEmployeeForCompany(companyId: string): Employee | null {
    if (!user.value?.employeeRecords) return null;
    return (
      user.value.employeeRecords.find((emp) => emp.companyId === companyId) ||
      null
    );
  }

  // Utility function to format user's full name and role
  function getDisplayName(): string {
    if (!user.value) return "";
    const roleName = userRole.value?.name ? ` (${userRole.value.name})` : "";
    return `${user.value.name}${roleName}`;
  }

  // Utility function to get user initials for avatars
  function getUserInitials(): string {
    if (!user.value?.name) return "";
    return user.value.name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }

  // Utility function to get company initials for logo fallback
  function getCompanyInitials(): string {
    const name = currentCompany.value?.name;
    if (!name) return "";
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }

  // Locale management

  /** The user picked a language: apply it, remember it here and save it to their account. */
  async function updateLocale(newLocale: string): Promise<boolean> {
    if (!setAppLocale(newLocale, { persist: true })) return false;

    try {
      if (token.value) {
        await api.put("/user/locale", { locale: newLocale });
      }
      return true;
    } catch (err) {
      console.error("Error updating locale:", err);
      return false;
    }
  }

  /**
   * Use the language saved in the account when this device has no choice of its own, so
   * a new phone or a cleared browser starts in the language the person picked before.
   * A choice made on this device always wins.
   */
  function applyUserLocale(): void {
    const preferred = user.value?.locale;
    if (savedLocale() || !isSupportedLocale(preferred)) return;

    // An administrator looking at someone else's account keeps their own device setting.
    setAppLocale(preferred, { persist: !impersonation.value });
  }

  function syncImpersonation(context: Impersonation | null) {
    impersonation.value = context;

    if (context) {
      localStorage.setItem(IMPERSONATING_KEY, "1");
    } else {
      localStorage.removeItem(IMPERSONATING_KEY);
    }
  }

  /**
   * Exchange the single-use handoff code coming from the admin panel for a token.
   */
  async function redeemImpersonation(code: string): Promise<boolean> {
    try {
      const response = await api.post("/impersonation/redeem", { code });
      const data = unwrap<{ token?: string; impersonation?: Impersonation | null }>(response);

      if (!data?.token) {
        toast.error(t("messages.impersonationLinkInvalid"));
        return false;
      }

      // Park the administrator's own session if they had one in this browser.
      if (token.value && localStorage.getItem(IMPERSONATING_KEY) !== "1") {
        localStorage.setItem(ORIGINAL_TOKEN_KEY, token.value);
      }

      token.value = data.token;
      localStorage.setItem(TOKEN_KEY, data.token);
      user.value = null;
      syncImpersonation(data.impersonation ?? null);

      await resetAllStores();
      await fetchCurrentUser();

      return true;
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t("messages.impersonationLinkInvalid")));
      return false;
    }
  }

  /**
   * Hand the session back to the administrator.
   *
   * Returns them to their own session if they had one in this browser, and to the admin
   * panel otherwise, which is the usual case: platform administrators rarely have an
   * employee record, and the app would be empty for them.
   */
  async function stopImpersonation(options: { silent?: boolean } = {}): Promise<void> {
    const returnUrl = impersonation.value?.returnUrl;
    // Read before the request: if it comes back 401 the interceptor consumes the parked
    // token, and reading it afterwards made this take the "no session of my own" branch
    // and delete the administrator token the interceptor had just restored.
    const original = localStorage.getItem(ORIGINAL_TOKEN_KEY);

    try {
      await api.post("/impersonation/stop");
    } catch (err) {
      // The token may already be gone (expired or revoked): finish locally anyway.
      console.warn("Could not close the impersonation server-side:", err);
    }

    impersonation.value = null;
    localStorage.removeItem(IMPERSONATING_KEY);
    localStorage.removeItem(ORIGINAL_TOKEN_KEY);

    await resetAllStores();

    if (original) {
      token.value = original;
      localStorage.setItem(TOKEN_KEY, original);
      user.value = null;
      await fetchCurrentUser();

      if (!options.silent) {
        toast.info(t("messages.backToOwnAccount"));
      }

      return;
    }

    // Flag first: clearing the token below makes the shell want to show the login page,
    // and that must not race the navigation to the admin panel.
    leavingApp.value = true;

    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);

    window.location.href = returnUrl ?? import.meta.env.VITE_ADMIN_URL ?? "/login";
  }

  return {
    impersonation,
    isImpersonating,
    canWriteWhileImpersonating,
    redeemImpersonation,
    stopImpersonation,
    // State
    user,
    token,
    loading,
    error,
    userLoadFailed,
    leavingApp,

    // Computed
    isAuthenticated,
    currentUser,
    currentEmployee,
    currentEmployeeId,
    currentCompany,
    currentCompanyId,
    currentDepartment,
    currentDepartmentId,
    companyLogoUrl,
    userRole,
    isAdmin,
    isManager,
    isEmployee,
    isSupervisor,
    supervisesAnyDepartment,
    isExemptFromTimeTracking,
    remainingVacationDays,
    workingHours,

    // Actions
    login,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    fetchCurrentUser,
    logout,

    // Utility methods
    hasFeature,
    hasRole,
    hasAccessLevel,
    belongsToCompany,
    getEmployeeForCompany,
    getDisplayName,
    getUserInitials,
    getCompanyInitials,

    // Locale
    updateLocale,
  };
});
