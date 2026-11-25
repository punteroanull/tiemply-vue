// src/test/utils/requestDates.spec.ts
import { describe, it, expect } from "vitest";
import {
  checkVacationBalance,
  countRequestDays,
  earliestRequestDate,
  rangesOverlap,
  requestDateRange,
  sortPeriods,
} from "@/utils/requestDates";

// Midday UTC on 15 Oct 2026: the same calendar day in the server timezone (Europe/Madrid)
// and in whatever timezone the tests run in.
const now = new Date("2026-10-15T12:00:00Z");

describe("earliestRequestDate", () => {
  it("requires the notice days ahead for vacation", () => {
    expect(earliestRequestDate("vacation", 7, now)).toBe("2026-10-22");
  });

  it("lets vacation cover past days with a negative value", () => {
    expect(earliestRequestDate("vacation", -3, now)).toBe("2026-10-12");
  });

  it("starts today with no notice", () => {
    expect(earliestRequestDate("vacation", 0, now)).toBe("2026-10-15");
  });

  it("ignores the vacation setting for other types or none selected", () => {
    expect(earliestRequestDate("personal", 7, now)).toBe("2026-10-15");
    expect(earliestRequestDate("personal", -3, now)).toBe("2026-10-15");
    expect(earliestRequestDate(undefined, -3, now)).toBe("2026-10-15");
  });

  it("uses the server's calendar day, not the browser's", () => {
    // 23:30 UTC on the 15th is already the 16th in Madrid, and that is the "today" the
    // API validates against.
    const lateEvening = new Date("2026-10-15T23:30:00Z");

    expect(earliestRequestDate("personal", 0, lateEvening)).toBe("2026-10-16");
  });
});

describe("countRequestDays", () => {
  // 23 Nov 2026 is a Monday.
  it("counts every day of the range for calendar-day companies", () => {
    expect(countRequestDays("2026-11-23", "2026-11-29", false)).toBe(7);
  });

  it("counts only Monday to Friday for business-day companies", () => {
    expect(countRequestDays("2026-11-23", "2026-11-29", true)).toBe(5);
    expect(countRequestDays("2026-11-27", "2026-11-30", true)).toBe(2);
  });

  it("gives zero for a weekend in a business-day company", () => {
    expect(countRequestDays("2026-11-28", "2026-11-29", true)).toBe(0);
  });

  it("counts a single day as one", () => {
    expect(countRequestDays("2026-11-23", "2026-11-23", false)).toBe(1);
  });

  it("gives zero for an incomplete or inverted range", () => {
    expect(countRequestDays("", "2026-11-23", false)).toBe(0);
    expect(countRequestDays("2026-11-23", null, false)).toBe(0);
    expect(countRequestDays("2026-11-24", "2026-11-23", false)).toBe(0);
  });

  it("is not thrown off by a daylight-saving change inside the range", () => {
    // Clocks go back on 25 Oct 2026 in Europe; a millisecond difference would miscount.
    expect(countRequestDays("2026-10-24", "2026-10-26", false)).toBe(3);
  });
});

describe("checkVacationBalance", () => {
  it("accepts a request within the remaining days", () => {
    expect(checkVacationBalance(5, 5, false, null)).toEqual({ valid: true, excess: 0 });
  });

  it("rejects any excess when the company does not allow it", () => {
    expect(checkVacationBalance(7, 5, false, null)).toEqual({
      valid: false,
      reason: "excess_not_allowed",
      excess: 2,
    });
  });

  it("accepts excess up to the company's cap", () => {
    expect(checkVacationBalance(7, 5, true, 2)).toEqual({ valid: true, excess: 2 });
  });

  it("rejects excess beyond the cap", () => {
    expect(checkVacationBalance(8, 5, true, 2)).toEqual({
      valid: false,
      reason: "exceeds_max_excess",
      excess: 3,
    });
  });

  it("accepts any excess when the company sets no cap", () => {
    expect(checkVacationBalance(40, 5, true, null)).toEqual({ valid: true, excess: 35 });
  });
});

describe("requestDateRange", () => {
  it("uses the request's own dates when it has no periods", () => {
    expect(requestDateRange({ startDate: "2026-12-01", endDate: "2026-12-03" })).toEqual({
      start: "2026-12-01",
      end: "2026-12-03",
    });
  });

  it("spans the earliest start and latest end whatever order the periods come in", () => {
    const request = {
      startDate: null,
      endDate: null,
      periods: [
        { startDate: "2026-12-10", endDate: "2026-12-12" },
        { startDate: "2026-12-01", endDate: "2026-12-05" },
      ],
    };

    expect(requestDateRange(request)).toEqual({ start: "2026-12-01", end: "2026-12-12" });
  });

  it("reads the calendar day the server meant from an instant", () => {
    // Laravel serialises 23 Nov (Madrid) as 22 Nov 23:00 UTC.
    const request = {
      startDate: "2026-11-22T23:00:00.000000Z",
      endDate: "2026-11-26T23:00:00.000000Z",
    };

    expect(requestDateRange(request)).toEqual({ start: "2026-11-23", end: "2026-11-27" });
  });

  it("returns null when there are no dates at all", () => {
    expect(requestDateRange({ startDate: null, endDate: null, periods: [] })).toBeNull();
    expect(requestDateRange(null)).toBeNull();
  });
});

describe("sortPeriods", () => {
  it("orders periods by start date without touching the original array", () => {
    const periods = [
      { id: "b", startDate: "2026-12-10", endDate: "2026-12-12" },
      { id: "a", startDate: "2026-12-01", endDate: "2026-12-05" },
    ];

    expect(sortPeriods(periods).map((period) => period.id)).toEqual(["a", "b"]);
    expect(periods.map((period) => period.id)).toEqual(["b", "a"]);
  });

  it("treats a missing list as empty", () => {
    expect(sortPeriods(undefined)).toEqual([]);
  });
});

describe("rangesOverlap", () => {
  it("detects ranges sharing a day, including just the boundary", () => {
    expect(
      rangesOverlap(
        { startDate: "2026-12-01", endDate: "2026-12-05" },
        { startDate: "2026-12-05", endDate: "2026-12-08" }
      )
    ).toBe(true);
  });

  it("lets back-to-back ranges through", () => {
    expect(
      rangesOverlap(
        { startDate: "2026-12-01", endDate: "2026-12-05" },
        { startDate: "2026-12-06", endDate: "2026-12-08" }
      )
    ).toBe(false);
  });

  it("ignores ranges that are not complete yet", () => {
    expect(
      rangesOverlap({ startDate: "2026-12-01", endDate: "" }, { startDate: "2026-12-01", endDate: "2026-12-02" })
    ).toBe(false);
  });
});
