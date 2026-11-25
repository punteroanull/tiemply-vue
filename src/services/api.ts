import axios from "axios";
import { convertKeysToCamelCase } from "../utils/caseConverter";
import { useToast } from "vue-toastification";
import i18n from "../i18n";
import {
  isReadOnlyRejection,
  resolveImpersonated401,
  SESSION_EXPIRED_KEY,
} from "./impersonationErrors";

// Works outside components, which is where this interceptor runs.
const toast = useToast();

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  // Without a limit a stalled mobile connection leaves every spinner running forever.
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add a request interceptor to add the auth token and locale
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add Accept-Language header for i18n
    // The language on screen, so API messages match it even before one was ever saved.
    config.headers["Accept-Language"] = i18n.global.locale.value;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors and convert snake_case to camelCase
api.interceptors.response.use(
  (response) => {
    // Convert all response data from snake_case (Laravel) to camelCase (TypeScript)
    if (response.data) {
      response.data = convertKeysToCamelCase(response.data);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // While impersonating, a 401 means the impersonated token died. Restoring the
      // administrator here is what keeps their own session alive.
      const destination = resolveImpersonated401(import.meta.env.VITE_ADMIN_URL);

      if (destination) {
        window.location.href = destination;
        return Promise.reject(error);
      }

      // Unauthorized - clear token and redirect to login
      const hadSession = !!localStorage.getItem("token");
      localStorage.removeItem("token");
      // Only redirect if not already on login page
      if (window.location.pathname !== "/login") {
        // The reload wipes any toast, so the login page is told why the user landed there.
        if (hadSession) {
          sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
        }
        window.location.href = "/login";
      }
    }

    // Read-only impersonation: say so plainly instead of letting each store surface a
    // generic failure.
    if (status === 403 && isReadOnlyRejection(error.response?.data)) {
      toast.warning(error.response.data.message);
    }
    return Promise.reject(error);
  }
);

export default api;
