import axios from "axios";
import { convertKeysToCamelCase } from "../utils/caseConverter";
import { useToast } from "vue-toastification";
import { isReadOnlyRejection, resolveImpersonated401 } from "./impersonationErrors";

// Works outside components, which is where this interceptor runs.
const toast = useToast();

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
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
    const locale = localStorage.getItem("locale") || "en";
    config.headers["Accept-Language"] = locale;

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
      localStorage.removeItem("token");
      // Only redirect if not already on login page
      if (window.location.pathname !== "/login") {
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
