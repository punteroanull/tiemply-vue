import { vi } from "vitest";

// Create a mock axios instance
export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  request: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
      eject: vi.fn(),
      clear: vi.fn(),
    },
    response: {
      use: vi.fn(),
      eject: vi.fn(),
      clear: vi.fn(),
    },
  },
  defaults: {
    headers: {
      common: {},
    },
  },
};

// This mock is applied globally via vi.mock hoisting
vi.mock("@/services/api", () => ({
  default: mockApi,
}));
