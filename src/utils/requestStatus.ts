import i18n from "@/i18n";
import { formatApiDate, formatClockTime } from "./apiDates";
import { requestDateRange } from "./requestDates";

/** Shared look and wording of absence-request statuses, so every list shows them alike. */

const BADGE_CLASSES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  partial: "bg-indigo-100 text-indigo-800",
};

export function requestStatusClass(status: string | undefined): string {
  return BADGE_CLASSES[status ?? ""] ?? "bg-neutral-100 text-neutral-800";
}

export function requestStatusLabel(status: string | undefined): string {
  if (!status || !(status in BADGE_CLASSES)) return i18n.global.t("common.unknown");
  return i18n.global.t(`requests.status.${status}`);
}

interface RangeLike {
  startDate?: string | null;
  endDate?: string | null;
  isPartial?: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

/** "23 nov 2026", "23 nov 2026 - 27 nov 2026" or "23 nov 2026 (09:00 - 13:00)". */
export function formatDateRange(range: RangeLike | null | undefined): string {
  const start = formatApiDate(range?.startDate);
  if (!start) return "-";
  const end = formatApiDate(range?.endDate) || start;

  if (range?.isPartial && range.startTime && range.endTime) {
    const hours = `${formatClockTime(range.startTime)} - ${formatClockTime(range.endTime)}`;
    return start === end ? `${start} (${hours})` : `${start} - ${end} (${hours})`;
  }
  return start === end ? start : `${start} - ${end}`;
}

/** Overall dates of a request, from its own range or from its periods. */
export function formatRequestDates(
  request: (RangeLike & { periods?: RangeLike[] | null }) | null | undefined
): string {
  const range = requestDateRange(request);
  if (!range) return "-";

  // A single partial range keeps its hours; several periods only show the outer dates.
  const single =
    request?.periods && request.periods.length === 1 ? request.periods[0] : request?.periods?.length ? null : request;

  return formatDateRange({
    startDate: range.start,
    endDate: range.end,
    isPartial: single?.isPartial,
    startTime: single?.startTime,
    endTime: single?.endTime,
  });
}
