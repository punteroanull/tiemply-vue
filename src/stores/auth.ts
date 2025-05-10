import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";
import { useToast } from "vue-toastification";

interface User {
  id: string;
  uuid: string;
  name: string;
  email: string;
  role?: {
    id: number;
    name: string;
  };
  employee_records?: any[];
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

  async function login(credentials: LoginCredentials) {
    loading.value = true;
    error.value = "";

    try {
      const response = await api.post("/login", credentials);

      if (response.data.token) {
        token.value = response.data.token;
        localStorage.setItem("token", response.data.token);
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

      if (response.data.token) {
        token.value = response.data.token;
        localStorage.setItem("token", response.data.token);
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

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    fetchCurrentUser,
    logout,
  };
});
