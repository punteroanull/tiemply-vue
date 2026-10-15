import { addDays, format } from "date-fns";

/**
 * Earliest start date ("yyyy-MM-dd") of an absence request, as the API enforces it: for
 * vacation, today plus the company's `vacation_request_advance_days` (positive = days of
 * notice, negative = days in the past, e.g. -5 lets the employee cover a day already
 * missed); any other type starts today at the earliest.
 */
export function earliestRequestDate(
  typeCode: string | undefined,
  vacationAdvanceDays: number,
  today: Date = new Date()
): string {
  const days = typeCode === "vacation" ? vacationAdvanceDays : 0;
  return format(addDays(today, days), "yyyy-MM-dd");
}
