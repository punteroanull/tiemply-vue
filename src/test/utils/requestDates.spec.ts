// src/test/utils/requestDates.spec.ts
import { describe, it, expect } from "vitest";
import { earliestRequestDate } from "@/utils/requestDates";

const today = new Date(2026, 9, 15); // 15 Oct 2026, local time

describe("earliestRequestDate", () => {
  it("requires the notice days ahead for vacation", () => {
    expect(earliestRequestDate("vacation", 7, today)).toBe("2026-10-22");
  });

  it("lets vacation cover past days with a negative value", () => {
    expect(earliestRequestDate("vacation", -3, today)).toBe("2026-10-12");
  });

  it("starts today with no notice", () => {
    expect(earliestRequestDate("vacation", 0, today)).toBe("2026-10-15");
  });

  it("ignores the vacation setting for other types or none selected", () => {
    expect(earliestRequestDate("personal", 7, today)).toBe("2026-10-15");
    expect(earliestRequestDate("personal", -3, today)).toBe("2026-10-15");
    expect(earliestRequestDate(undefined, -3, today)).toBe("2026-10-15");
  });
});
