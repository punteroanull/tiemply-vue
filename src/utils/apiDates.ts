import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import i18n from "@/i18n";

/**
 * The API casts calendar dates (absence dates, work-log dates, period ranges) as Laravel
 * `date`, which serialises them as the UTC instant of midnight in the server timezone:
 * 23 Nov in Madrid arrives as "2026-11-22T23:00:00.000000Z". Reading that instant in the
 * browser's own timezone, or slicing its first ten characters, gives the wrong day. These
 * helpers recover the calendar day the server meant, and also accept a plain "yyyy-MM-dd".
 */
const BUSINESS_TIMEZONE: string = import.meta.env.VITE_API_TIMEZONE || "Europe/Madrid";

const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

let businessDayFormatter: Intl.DateTimeFormat | null = null;

function businessDay(instant: Date): string {
  if (!businessDayFormatter) {
    businessDayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  const parts = businessDayFormatter.formatToParts(instant);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

/** Calendar day of an API date as "yyyy-MM-dd", or null when it is empty or unparseable. */
export function apiDateToYmd(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : format(value, "yyyy-MM-dd");
  }
  if (PLAIN_DATE.test(value)) return value;
  // "2026-11-23 00:00:00": a wall-clock value with no zone, the date part is the day.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 10);

  const instant = new Date(value);
  return isNaN(instant.getTime()) ? null : businessDay(instant);
}

/** An API date as a Date at local midnight of that calendar day, safe for date-fns. */
export function parseApiDate(value: string | Date | null | undefined): Date | null {
  const ymd = apiDateToYmd(value);
  if (!ymd) return null;
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Today's calendar day in the server timezone, as "yyyy-MM-dd". */
export function businessToday(now: Date = new Date()): string {
  return businessDay(now);
}

/** date-fns locale matching the language currently selected in the app. */
export function dateFnsLocale() {
  return i18n.global.locale.value === "es" ? es : enUS;
}

/** Format an API calendar date in the app language. Returns "" when there is no date. */
export function formatApiDate(
  value: string | Date | null | undefined,
  pattern: string = "PP"
): string {
  const date = parseApiDate(value);
  return date ? format(date, pattern, { locale: dateFnsLocale() }) : "";
}

/** Format any Date in the app language. */
export function formatLocalized(date: Date, pattern: string): string {
  return format(date, pattern, { locale: dateFnsLocale() });
}

/** 24-hour clock time ("HH:mm") from a Date, an ISO timestamp, or an "HH:mm[:ss]" string. */
export function formatClockTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.slice(0, 5);
  }
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? "" : format(date, "HH:mm");
}

/** Minutes as "H:mm" (485 -> "8:05"). Fractions are rounded, negatives keep their sign. */
export function formatMinutesAsClock(minutes: number | null | undefined): string {
  const total = Math.round(Math.abs(minutes ?? 0));
  const sign = (minutes ?? 0) < 0 && total > 0 ? "-" : "";
  return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Decimal hours as "Xh Ym" (1.5 -> "1h 30m"), never rendering 60 minutes. */
export function formatHoursAsDuration(hours: number | null | undefined): string {
  const total = Math.round(Math.abs(hours ?? 0) * 60);
  const sign = (hours ?? 0) < 0 && total > 0 ? "-" : "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`;
}
