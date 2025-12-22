import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { mockApi } from "../mocks/api";

describe("Auth Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with null user and token from localStorage", () => {
      const store = useAuthStore();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.loading).toBe(false);
      expect(store.error).toBe("");
    });

    it("should initialize with token from localStorage if available", () => {
      localStorage.setItem("token", "test-token");

      const store = useAuthStore();

      expect(store.token).toBe("test-token");
    });
  });

  describe("Computed Properties", () => {
    it("should return false for isAuthenticated when no token", () => {
      const store = useAuthStore();

      expect(store.isAuthenticated).toBe(false);
    });

    it("should return true for isAuthenticated when token exists", () => {
      const store = useAuthStore();
      store.token = "test-token";

      expect(store.isAuthenticated).toBe(true);
    });

    it("should return correct user role information", () => {
      const store = useAuthStore();

      store.user = {
        id: "1",
        uuid: "uuid-1",
        name: "Test User",
        email: "test@example.com",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        role: {
          id: "1",
          uuid: "role-uuid-1",
          name: "Administrator",
          is_exempt: true,
          access_level: 100,
        },
      };

      expect(store.userRole?.name).toBe("Administrator");
      expect(store.isAdmin).toBe(true);
      expect(store.isManager).toBe(false);
      expect(store.isEmployee).toBe(false);
      expect(store.isExemptFromTimeTracking).toBe(true);
    });
  });

  describe("Login Action", () => {
    it("should successfully login with valid credentials", async () => {
      const store = useAuthStore();
      const mockLoginResponse = {
        data: {
          token: "test-token-123",
        },
      };
      // Backend returns snake_case, store converts to camelCase
      const mockUserResponse = {
        data: {
          id: "1",
          uuid: "uuid-1",
          name: "Test User",
          email: "test@example.com",
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
          employee_records: [{ id: "emp-1", active: true }],
        },
      };

      vi.mocked(mockApi.post).mockResolvedValue(mockLoginResponse);
      vi.mocked(mockApi.get).mockResolvedValue(mockUserResponse);

      const result = await store.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result).toBe(true);
      expect(store.token).toBe("test-token-123");
      expect(store.user?.email).toBe("test@example.com");
      // Verify snake_case was converted to camelCase
      expect(store.user?.employeeRecords).toBeDefined();
      expect(store.user?.employeeRecords?.[0]?.id).toBe("emp-1");
      expect(localStorage.getItem("token")).toBe("test-token-123");
      expect(mockApi.post).toHaveBeenCalledWith("/login", {
        email: "test@example.com",
        password: "password123",
      });
      expect(mockApi.get).toHaveBeenCalledWith("/me");
    });

    it("should handle login failure with error message", async () => {
      const store = useAuthStore();
      const mockError = {
        response: {
          data: {
            message: "Invalid credentials",
          },
        },
      };

      vi.mocked(mockApi.post).mockRejectedValue(mockError);

      const result = await store.login({
        email: "test@example.com",
        password: "wrong-password",
      });

      expect(result).toBe(false);
      expect(store.error).toBe("Invalid credentials");
      expect(store.token).toBeNull();
      expect(store.user).toBeNull();
    });
  });

  describe("Logout Action", () => {
    it("should clear user data and token on logout", async () => {
      const store = useAuthStore();

      store.token = "test-token";
      store.user = {
        id: "1",
        uuid: "uuid-1",
        name: "Test User",
        email: "test@example.com",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };
      localStorage.setItem("token", "test-token");

      vi.mocked(mockApi.post).mockResolvedValue({ data: {} });

      await store.logout();

      expect(store.token).toBeNull();
      expect(store.user).toBeNull();
      expect(localStorage.getItem("token")).toBeNull();
      expect(mockApi.post).toHaveBeenCalledWith("/logout");
    });
  });

  describe("Utility Methods", () => {
    it("should return correct user initials", () => {
      const store = useAuthStore();

      store.user = {
        id: "1",
        uuid: "uuid-1",
        name: "John Doe",
        email: "john@example.com",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      expect(store.getUserInitials()).toBe("JD");
    });

    it("should return correct display name with role", () => {
      const store = useAuthStore();

      store.user = {
        id: "1",
        uuid: "uuid-1",
        name: "John Doe",
        email: "john@example.com",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        role: {
          id: "1",
          uuid: "role-uuid-1",
          name: "Manager",
          is_exempt: false,
          access_level: 50,
        },
      };

      expect(store.getDisplayName()).toBe("John Doe (Manager)");
    });

    it("should correctly check if user has specific role", () => {
      const store = useAuthStore();

      store.user = {
        id: "1",
        uuid: "uuid-1",
        name: "Test User",
        email: "test@example.com",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        role: {
          id: "1",
          uuid: "role-uuid-1",
          name: "Employee",
          is_exempt: false,
          access_level: 10,
        },
      };

      expect(store.hasRole("Employee")).toBe(true);
      expect(store.hasRole("Administrator")).toBe(false);
    });

    it("should correctly check access level", () => {
      const store = useAuthStore();

      store.user = {
        id: "1",
        uuid: "uuid-1",
        name: "Test User",
        email: "test@example.com",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        role: {
          id: "1",
          uuid: "role-uuid-1",
          name: "Manager",
          is_exempt: false,
          access_level: 50,
        },
      };

      expect(store.hasAccessLevel(30)).toBe(true);
      expect(store.hasAccessLevel(50)).toBe(true);
      expect(store.hasAccessLevel(100)).toBe(false);
    });
  });
});
