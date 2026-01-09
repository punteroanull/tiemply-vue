import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";
// Note: snake_case to camelCase conversion is handled globally in api.ts interceptor

interface Role {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  is_exempt: boolean;
  access_level: number;
}

interface Company {
  id: string;
  uuid: string;
  name: string;
  tax_id?: string;
  contact_email?: string;
  contact_person?: string;
  address?: string;
  phone?: string;
  vacation_type: "business_days" | "calendar_days";
  max_vacation_days: number;
  logoPath?: string;
}

interface Department {
  id: string;
  uuid: string;
  companyId: string;
  supervisorId?: string;
  name: string;
  description?: string;
}

interface Employee {
  id: string;
  uuid: string;
  companyId: string;
  departmentId?: string;
  userId: string;
  contractStartTime?: string; // HH:mm format
  contractEndTime?: string; // HH:mm format
  remainingVacationDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  company?: Company;
  department?: Department;
}

interface User {
  id: string;
  uuid: string;
  name: string;
  email: string;
  identification_number?: string;
  birth_date?: string; // ISO date string
  phone?: string;
  address?: string;
  role_id?: string;
  registered_at?: string; // ISO datetime string
  email_verified_at?: string; // ISO datetime string
  created_at: string;
  updated_at: string;
  // Relations
  role?: Role;
  employeeRecords?: Employee[];
  companies?: Company[];
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export const useAuthStore = defineStore("auth", () => {
  const toast = useToast();

  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("token"));
  const loading = ref(false);
  const error = ref("");

  const isAuthenticated = computed(() => !!token.value);

  // Computed properties for user information
  const currentUser = computed(() => user.value);

  const currentEmployee = computed(() => {
    if (!user.value?.employeeRecords?.length) return null;
    // Return the first active employee record or the first one if no active records
    return (
      user.value.employeeRecords.find((emp) => emp.active) ||
      user.value.employeeRecords[0]
    );
  });

  const currentCompany = computed(() => {
    return currentEmployee.value?.company || null;
  });

  const currentDepartment = computed(() => {
    return currentEmployee.value?.department || null;
  });

  const currentDepartmentId = computed(() => {
    return (currentEmployee.value as any)?.departmentId || null;
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

  const isExemptFromTimeTracking = computed(
    () => userRole.value?.is_exempt || false
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

      // Backend uses ApiResponse trait: { success: true, data: { token, user } }
      // Axios response is in response.data, so actual data is in response.data.data
      let responseData;
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        responseData = response.data.data;
      } else {
        responseData = response.data;
      }

      if (responseData.token) {
        token.value = responseData.token;
        localStorage.setItem("token", responseData.token);

        // Always fetch full user data from /me to get employee_records and other relations
        await fetchCurrentUser();

        toast.success("Successfully logged in");
        return true;
      } else {
        error.value = "Invalid response from server";
        toast.error("Login failed");
        return false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Login failed";
      toast.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function register(data: RegisterData) {
    loading.value = true;
    error.value = "";

    try {
      const response = await api.post("/register", data);

      // Backend uses ApiResponse trait: { success: true, data: { token, user } }
      // Axios response is in response.data, so actual data is in response.data.data
      let responseData;
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        responseData = response.data.data;
      } else {
        responseData = response.data;
      }

      if (responseData.token) {
        token.value = responseData.token;
        localStorage.setItem("token", responseData.token);

        // Always fetch full user data from /me to get employee_records and other relations
        await fetchCurrentUser();

        toast.success("Registration successful");
        return true;
      } else {
        error.value = "Invalid response from server";
        toast.error("Registration failed");
        return false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Registration failed";
      toast.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return null;

    loading.value = true;

    try {
      const response = await api.get("/me");
      // Backend uses ApiResponse trait: { success: true, data: {...} }
      // Axios response is in response.data, so actual data is in response.data.data
      // Note: snake_case to camelCase conversion is handled by api.ts interceptor
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        user.value = response.data.data;
      } else {
        user.value = response.data;
      }
      return user.value;
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Token is invalid or expired
        logout();
      }
      error.value = "Failed to fetch user profile";
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateProfile(profileData: Partial<User>) {
    if (!user.value) return false;

    loading.value = true;
    error.value = "";

    try {
      const response = await api.put("/profile", profileData);

      // Backend uses ApiResponse trait: { success: true, data: {...} }
      // Axios response is in response.data, so actual data is in response.data.data
      // Note: snake_case to camelCase conversion is handled by api.ts interceptor
      let responseData;
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        responseData = response.data.data;
      } else {
        responseData = response.data;
      }

      if (responseData) {
        user.value = { ...user.value, ...responseData };
        toast.success("Profile updated successfully");
        return true;
      }

      return false;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to update profile";
      toast.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function changePassword(passwordData: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) {
    loading.value = true;
    error.value = "";

    try {
      await api.put("/change-password", passwordData);
      toast.success("Password changed successfully");
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to change password";
      toast.error(error.value);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await api.post("/logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      user.value = null;
      token.value = null;
      localStorage.removeItem("token");
      toast.info("Logged out successfully");
    }
  }

  function hasRole(roleName: string): boolean {
    return userRole.value?.name === roleName;
  }

  function hasAccessLevel(level: number): boolean {
    return (userRole.value?.access_level || 0) >= level;
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
  const locale = ref<string>(localStorage.getItem("locale") || "en");

  async function updateLocale(newLocale: string): Promise<boolean> {
    try {
      // Save to localStorage immediately for better UX
      localStorage.setItem("locale", newLocale);
      locale.value = newLocale;

      // If user is authenticated, save preference to backend
      if (token.value) {
        await api.put("/user/locale", { locale: newLocale });
      }

      return true;
    } catch (err) {
      console.error("Error updating locale:", err);
      return false;
    }
  }

  function loadUserLocale(): void {
    // Load locale from user data if available
    const userLocale = (user.value as any)?.locale;
    if (userLocale && ["es", "en"].includes(userLocale)) {
      locale.value = userLocale;
      localStorage.setItem("locale", userLocale);
    }
  }

  return {
    // State
    user,
    token,
    loading,
    error,

    // Computed
    isAuthenticated,
    currentUser,
    currentEmployee,
    currentCompany,
    currentDepartment,
    currentDepartmentId,
    companyLogoUrl,
    userRole,
    isAdmin,
    isManager,
    isEmployee,
    isSupervisor,
    isExemptFromTimeTracking,
    remainingVacationDays,
    workingHours,

    // Actions
    login,
    register,
    fetchCurrentUser,
    updateProfile,
    changePassword,
    logout,

    // Utility methods
    hasRole,
    hasAccessLevel,
    belongsToCompany,
    getEmployeeForCompany,
    getDisplayName,
    getUserInitials,
    getCompanyInitials,

    // Locale
    locale,
    updateLocale,
    loadUserLocale,
  };
});
