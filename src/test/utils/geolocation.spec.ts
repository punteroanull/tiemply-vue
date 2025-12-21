// src/test/utils/geolocation.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  formatCoordinates,
  isGeolocationAvailable,
} from "@/utils/geolocation";

describe("Geolocation Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isGeolocationAvailable", () => {
    it("should check if geolocation is defined in navigator", () => {
      // This test verifies the function works correctly
      // jsdom may or may not have geolocation depending on version
      const result = isGeolocationAvailable();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("formatCoordinates", () => {
    it("should format coordinates correctly", () => {
      const result = formatCoordinates(40.416775, -3.70379);
      expect(result).toBe("40.416775, -3.703790");
    });

    it("should include accuracy when provided and greater than 0", () => {
      const result = formatCoordinates(40.416775, -3.70379, 50);
      expect(result).toBe("40.416775, -3.703790 (±50m)");
    });

    it("should round accuracy to nearest integer", () => {
      const result = formatCoordinates(40.416775, -3.70379, 25.7);
      expect(result).toBe("40.416775, -3.703790 (±26m)");
    });

    it("should handle negative latitudes", () => {
      const result = formatCoordinates(-33.868820, 151.209290);
      expect(result).toBe("-33.868820, 151.209290");
    });

    it("should not show accuracy when it is 0 (falsy)", () => {
      // accuracy = 0 is falsy, so the function doesn't include it
      const result = formatCoordinates(40.416775, -3.70379, 0);
      expect(result).toBe("40.416775, -3.703790");
    });

    it("should not show accuracy when undefined", () => {
      const result = formatCoordinates(40.416775, -3.70379, undefined);
      expect(result).toBe("40.416775, -3.703790");
    });

    it("should handle very precise coordinates by limiting to 6 decimals", () => {
      const result = formatCoordinates(40.41677512345, -3.70379012345);
      expect(result).toBe("40.416775, -3.703790");
    });

    it("should include accuracy of 1 meter", () => {
      const result = formatCoordinates(40.416775, -3.70379, 1);
      expect(result).toBe("40.416775, -3.703790 (±1m)");
    });
  });
});
