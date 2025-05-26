import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";

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
}

interface Employee {
  id: string;
  uuid: string;
  company_id: string;
  user_id: string;
  contract_start_time?: string; // HH:mm format
  contract_end_time?: string; // HH:mm format
  remaining_vacation_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  company?: Company;
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
  employee_records?: Employee[];
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
    if (!user.value?.employee_records?.length) return null;
    // Return the first active employee record or the first one if no active records
    return (
      user.value.employee_records.find((emp) => emp.active) ||
      user.value.employee_records[0]
    );
  });

  const currentCompany = computed(() => {
    return currentEmployee.value?.company || null;
  });

  const userRole = computed(() => user.value?.role || null);

  const isAdmin = computed(() => userRole.value?.name === "Administrator");
  const isManager = computed(() => userRole.value?.name === "Manager");
  const isEmployee = computed(() => userRole.value?.name === "Employee");

  const isExemptFromTimeTracking = computed(
    () => userRole.value?.is_exempt || false
  );

  const remainingVacationDays = computed(
    () => currentEmployee.value?.remaining_vacation_days || 0
  );

  const workingHours = computed(() => {
    if (
      !currentEmployee.value?.contract_start_time ||
      !currentEmployee.value?.contract_end_time
    ) {
      return null;
    }
    return {
      start: currentEmployee.value.contract_start_time,
      end: currentEmployee.value.contract_end_time,
    };
  });

  async function login(credentials: LoginCredentials) {
    loading.value = true;
    error.value = "";

    try {
      const response = await api.post("/login", credentials);

      if (response.data.token) {
        token.value = response.data.token;
        localStorage.setItem("token", response.data.token);

        // If user data is returned in login response, use it
        if (response.data.user) {
          user.value = response.data.user;
        } else {
          // Otherwise fetch user data
          await fetchCurrentUser();
        }

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

      if (response.data.token) {
        token.value = response.data.token;
        localStorage.setItem("token", response.data.token);

        // If user data is returned in register response, use it
        if (response.data.user) {
          user.value = response.data.user;
        } else {
          // Otherwise fetch user data
          await fetchCurrentUser();
        }

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
      user.value = response.data;
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

      if (response.data) {
        user.value = { ...user.value, ...response.data };
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
    if (!user.value?.employee_records) return false;
    return user.value.employee_records.some(
      (emp) => emp.company_id === companyId
    );
  }

  function getEmployeeForCompany(companyId: string): Employee | null {
    if (!user.value?.employee_records) return null;
    return (
      user.value.employee_records.find((emp) => emp.company_id === companyId) ||
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
    userRole,
    isAdmin,
    isManager,
    isEmployee,
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
  };
});
