import { addDays, format, isWeekend } from "date-fns";
import { apiDateToYmd, businessToday, parseApiDate } from "./apiDates";

/**
 * Earliest start date ("yyyy-MM-dd") of an absence request, as the API enforces it: for
 * vacation, today plus the company's `vacation_request_advance_days` (positive = days of
 * notice, negative = days in the past, e.g. -5 lets the employee cover a day already
 * missed); any other type starts today at the earliest.
 *
 * "Today" is the server's calendar day, not the browser's: late in the evening west of the
 * server the two differ and the API would reject a date the picker allowed.
 */
export function earliestRequestDate(
  typeCode: string | undefined,
  vacationAdvanceDays: number,
  now: Date = new Date()
): string {
  const days = typeCode === "vacation" ? vacationAdvanceDays : 0;
  const today = parseApiDate(businessToday(now)) as Date;
  return format(addDays(today, days), "yyyy-MM-dd");
}

/**
 * Days a date range consumes, as the API counts them (`calculateDaysForPeriod`): every day
 * of the range, or only Monday to Friday when the company counts business days. Returns 0
 * for an incomplete or inverted range.
 */
export function countRequestDays(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  businessDaysOnly: boolean
): number {
  const start = parseApiDate(startDate);
  const end = parseApiDate(endDate);
  if (!start || !end || start > end) return 0;

  let days = 0;
  for (let day = start; day <= end; day = addDays(day, 1)) {
    if (!businessDaysOnly || !isWeekend(day)) days++;
  }
  return days;
}

export type VacationCheck =
  | { valid: true; excess: number }
  | { valid: false; reason: "excess_not_allowed" | "exceeds_max_excess"; excess: number };

/**
 * Whether a vacation request fits the balance, as the API decides it
 * (`Company::validateRequestedDays`): within the remaining days it is always fine; beyond
 * them only when the company allows excess, and then up to `maxExcessDays` (null = no cap).
 */
export function checkVacationBalance(
  daysRequested: number,
  remainingDays: number,
  allowExcess: boolean,
  maxExcessDays: number | null | undefined
): VacationCheck {
  if (daysRequested <= remainingDays) return { valid: true, excess: 0 };

  const excess = daysRequested - remainingDays;
  if (!allowExcess) return { valid: false, reason: "excess_not_allowed", excess };
  if (maxExcessDays != null && excess > maxExcessDays) {
    return { valid: false, reason: "exceeds_max_excess", excess };
  }
  return { valid: true, excess };
}

interface DateRange {
  startDate?: string | null;
  endDate?: string | null;
}

/** Periods in chronological order. The API returns them unordered (UUID keys). */
export function sortPeriods<T extends DateRange>(periods: T[] | null | undefined): T[] {
  return [...(periods ?? [])].sort((a, b) =>
    (apiDateToYmd(a.startDate) ?? "").localeCompare(apiDateToYmd(b.startDate) ?? "")
  );
}

/**
 * First and last day ("yyyy-MM-dd") an absence request covers. A period-based request has
 * no dates of its own, so the range runs from its earliest period start to its latest
 * period end, whatever order the periods arrive in. Null when it has no dates at all.
 */
export function requestDateRange(
  request: (DateRange & { periods?: DateRange[] | null }) | null | undefined
): { start: string; end: string } | null {
  if (!request) return null;

  const ranges: DateRange[] =
    request.periods && request.periods.length > 0 ? request.periods : [request];

  const starts = ranges
    .map((range) => apiDateToYmd(range.startDate))
    .filter((value): value is string => !!value)
    .sort();
  const ends = ranges
    .map((range) => apiDateToYmd(range.endDate) ?? apiDateToYmd(range.startDate))
    .filter((value): value is string => !!value)
    .sort();

  if (starts.length === 0) return null;
  return { start: starts[0], end: ends[ends.length - 1] ?? starts[0] };
}

/** True when two inclusive "yyyy-MM-dd" ranges share at least one day. */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  const aStart = apiDateToYmd(a.startDate);
  const aEnd = apiDateToYmd(a.endDate);
  const bStart = apiDateToYmd(b.startDate);
  const bEnd = apiDateToYmd(b.endDate);
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
}
