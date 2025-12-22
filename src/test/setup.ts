import { vi } from "vitest";

// Import and apply API mock globally
import "./mocks/api";

// Mock vue-toastification
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  clear: vi.fn(),
};

vi.mock("vue-toastification", () => ({
  useToast: () => mockToast,
  POSITION: {
    TOP_RIGHT: "top-right",
    TOP_LEFT: "top-left",
    BOTTOM_RIGHT: "bottom-right",
    BOTTOM_LEFT: "bottom-left",
    TOP_CENTER: "top-center",
    BOTTOM_CENTER: "bottom-center",
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(global.navigator, "onLine", {
  value: true,
  writable: true,
  configurable: true,
});

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
