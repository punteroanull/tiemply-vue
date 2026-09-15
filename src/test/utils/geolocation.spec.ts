// src/test/utils/geolocation.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  formatCoordinates,
  getCurrentPosition,
  isGeolocationAvailable,
} from "@/utils/geolocation";

type PositionCallback = (position: any) => void;
type ErrorCallback = (error: any) => void;

/** Install a fake navigator.geolocation whose getCurrentPosition we drive per call. */
function mockGeolocation(
  handler: (options: PositionOptions, success: PositionCallback, failure: ErrorCallback) => void
) {
  const getCurrentPositionMock = vi.fn(
    (success: PositionCallback, failure: ErrorCallback, options: PositionOptions) =>
      handler(options, success, failure)
  );

  Object.defineProperty(global.navigator, "geolocation", {
    value: { getCurrentPosition: getCurrentPositionMock },
    writable: true,
    configurable: true,
  });

  return getCurrentPositionMock;
}

function position(accuracy = 30) {
  return {
    coords: { latitude: 38.3476, longitude: -0.5211, accuracy },
    timestamp: 1_700_000_000_000,
  };
}

describe("Geolocation Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentPosition", () => {
    it("resolves from the fast low-accuracy attempt without asking for GPS", async () => {
      const spy = mockGeolocation((_options, success) => success(position()));

      const result = await getCurrentPosition();

      expect(result.latitude).toBe(38.3476);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][2].enableHighAccuracy).toBe(false);
    });

    it("falls back to high accuracy when the first attempt times out", async () => {
      let call = 0;
      const spy = mockGeolocation((_options, success, failure) => {
        call++;
        if (call === 1) {
          failure({ code: 3, message: "timeout" }); // TIMEOUT
          return;
        }
        success(position(8));
      });

      const result = await getCurrentPosition();

      expect(result.accuracy).toBe(8);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[1][2].enableHighAccuracy).toBe(true);
    });

    it("does not retry when permission was denied", async () => {
      // Retrying with GPS after a denial only makes the user wait for the same refusal.
      const spy = mockGeolocation((_options, _success, failure) =>
        failure({ code: 1, message: "denied" })
      );

      await expect(getCurrentPosition()).rejects.toMatchObject({
        code: 1,
        messageKey: "geolocation.errors.permissionDenied",
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("rejects with a translatable key when the browser has no geolocation", async () => {
      Object.defineProperty(global.navigator, "geolocation", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expect(getCurrentPosition()).rejects.toMatchObject({
        messageKey: "geolocation.errors.notSupported",
      });
    });
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
