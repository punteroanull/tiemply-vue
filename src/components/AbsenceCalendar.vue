<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addDays } from 'date-fns';
import { apiDateToYmd, formatLocalized, parseApiDate } from '../utils/apiDates';

const router = useRouter();
const { t } = useI18n();

interface AbsenceType {
  id: string;
  code: string;
  name: string;
}

interface Absence {
  id: string;
  date: string;
  absenceType?: AbsenceType;
  request?: {
    status: string;
  };
}

interface AbsenceRequestPeriod {
  startDate: string;
  endDate: string;
  status?: string;
}

interface AbsenceRequest {
  id: string;
  // Null on period-based requests, which carry their dates in `periods` instead.
  startDate: string | null;
  endDate: string | null;
  usesPeriods?: boolean;
  periods?: AbsenceRequestPeriod[];
  status: string;
  absenceType?: AbsenceType;
}

interface CalendarItem {
  date: string;
  type: 'absence' | 'request';
  data: Absence | AbsenceRequest;
  absenceType?: AbsenceType;
  status: 'approved' | 'pending';
}

const props = defineProps({
  absences: {
    type: Array as () => Absence[],
    default: () => []
  },
  requests: {
    type: Array as () => AbsenceRequest[],
    default: () => []
  },
  compact: {
    type: Boolean,
    default: false
  }
});

const currentDate = ref(new Date());
const currentMonth = computed(() => formatLocalized(currentDate.value, 'MMMM yyyy'));

// Calendar days
const calendarDays = computed(() => {
  const monthStart = startOfMonth(currentDate.value);
  const monthEnd = endOfMonth(currentDate.value);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: startDate, end: endDate });
});

// Week day headers, in the app language (the grid always starts on Monday)
const weekDays = computed(() =>
  calendarDays.value.slice(0, 7).map((day) => ({
    short: formatLocalized(day, 'EEEEEE'),
    long: formatLocalized(day, 'EEEE'),
  }))
);

/** A request the edit form can open: still pending and made of one plain date range. */
function isEditable(request: AbsenceRequest): boolean {
  return request.status === 'pending' && !request.usesPeriods && !request.periods?.length && !!request.startDate;
}

// Expand request date range to individual days
function expandRequestToDays(request: AbsenceRequest): CalendarItem[] {
  // A period-based request has no dates of its own; its periods carry them, and only the
  // ones still waiting for review are "pending" (approved ones already exist as absences).
  const ranges = request.startDate && request.endDate
    ? [{ startDate: request.startDate, endDate: request.endDate }]
    : (request.periods ?? []).filter((period) => !period.status || period.status === 'pending');

  return ranges.flatMap((range) => {
    const days: CalendarItem[] = [];
    // API dates are instants of the server's midnight: parseApiDate recovers the calendar
    // day meant, whatever the browser timezone.
    let current = parseApiDate(range.startDate);
    const end = parseApiDate(range.endDate) ?? current;
    if (!current || !end) return days;

    while (current <= end) {
      days.push({
        date: format(current, 'yyyy-MM-dd'),
        type: 'request',
        data: request,
        absenceType: request.absenceType,
        status: 'pending'
      });
      current = addDays(current, 1);
    }

    return days;
  });
}

// Calendar items (absences + pending requests) grouped by calendar day
const itemsByDay = computed(() => {
  const byDay = new Map<string, CalendarItem[]>();
  const add = (item: CalendarItem) => {
    const list = byDay.get(item.date);
    if (list) list.push(item);
    else byDay.set(item.date, [item]);
  };

  // Approved absences. The API sends the date as an instant, never as "yyyy-MM-dd":
  // comparing it raw against the day string matched nothing and no absence was drawn.
  props.absences.forEach((absence: Absence) => {
    const date = apiDateToYmd(absence.date);
    if (!date) return;
    add({
      date,
      type: 'absence',
      data: absence,
      absenceType: absence.absenceType,
      status: 'approved'
    });
  });

  // Requests still waiting for review (expanded to individual days)
  props.requests
    .filter((req: AbsenceRequest) => req.status === 'pending' || req.status === 'partial')
    .forEach((request: AbsenceRequest) => expandRequestToDays(request).forEach(add));

  return byDay;
});

// Get items for a specific day
function getItemsForDay(day: Date): CalendarItem[] {
  return itemsByDay.value.get(format(day, 'yyyy-MM-dd')) ?? [];
}

const maxDots = computed(() => (props.compact ? 2 : 3));

// Navigate to previous month
function previousMonth() {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() - 1;
  currentDate.value = new Date(year, month, 1);
}

// Navigate to next month
function nextMonth() {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  currentDate.value = new Date(year, month, 1);
}

// Navigate to current month
function resetToCurrentMonth() {
  currentDate.value = new Date();
}

// Get day class
function getDayClass(day: Date) {
  return {
    'bg-neutral-50': !isSameMonth(day, currentDate.value),
    'bg-primary-50 font-semibold': isToday(day),
  };
}

const typeColors: Record<string, { solid: string; outline: string }> = {
  vacation: { solid: 'bg-blue-500', outline: 'bg-blue-100 border-2 border-blue-500' },
  sick_leave: { solid: 'bg-red-500', outline: 'bg-red-100 border-2 border-red-500' },
  personal_leave: { solid: 'bg-purple-500', outline: 'bg-purple-100 border-2 border-purple-500' },
};
const otherColors = { solid: 'bg-neutral-500', outline: 'bg-neutral-100 border-2 border-neutral-500' };

// Get color classes for absence type
function getTypeColorClasses(code: string | undefined, isPending: boolean) {
  const colors = typeColors[code || ''] || otherColors;
  return isPending ? colors.outline : colors.solid;
}

function canEditItem(item: CalendarItem): boolean {
  return item.type === 'request' && isEditable(item.data as AbsenceRequest);
}

// Handle click on calendar item
function handleItemClick(item: CalendarItem) {
  if (canEditItem(item)) {
    router.push(`/requests/${(item.data as AbsenceRequest).id}/edit`);
  }
}

// Get tooltip text for item
function getItemTooltip(item: CalendarItem): string {
  const typeName = item.absenceType?.name || t('absences.absence');
  if (item.status === 'pending') {
    const label = `${typeName} - ${t('absences.pendingRequest')}`;
    return canEditItem(item) ? `${label} (${t('absences.clickToEdit')})` : label;
  }
  return `${typeName} - ${t('absences.approvedAbsence')}`;
}

/** What a day holds, in words, for screen readers (the dots alone say nothing). */
function getDaySummary(day: Date): string {
  return getItemsForDay(day).map(getItemTooltip).join(', ');
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-subtle overflow-hidden">
    <div class="flex justify-between items-center p-4 border-b border-neutral-200">
      <button
        type="button"
        @click="previousMonth"
        class="p-2.5 rounded-full hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        :aria-label="$t('absences.previousMonth')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>

      <div class="text-center">
        <h2
          class="capitalize"
          :class="compact ? 'text-sm font-medium text-neutral-800' : 'text-lg font-medium text-neutral-800'"
          aria-live="polite"
        >{{ currentMonth }}</h2>
        <button type="button" @click="resetToCurrentMonth" class="text-xs text-primary-600 hover:text-primary-700 mt-1">
          {{ $t('common.today') }}
        </button>
      </div>

      <button
        type="button"
        @click="nextMonth"
        class="p-2.5 rounded-full hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        :aria-label="$t('absences.nextMonth')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div class="overflow-x-auto">
      <div class="grid grid-cols-7 min-w-full">
        <!-- Week days header -->
        <div
          v-for="day in weekDays"
          :key="day.long"
          class="py-2 text-center text-xs font-medium text-neutral-500 border-b border-neutral-200 capitalize"
        >
          <span aria-hidden="true">{{ day.short }}</span>
          <span class="sr-only">{{ day.long }}</span>
        </div>

        <!-- Calendar days -->
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          :class="[
            'border-b border-r border-neutral-200 p-1 relative',
            compact ? 'h-12' : 'h-24',
            getDayClass(day)
          ]"
        >
          <div
            :class="[
              'text-right p-1',
              compact ? 'text-xs' : 'text-sm',
              { 'text-neutral-400': !isSameMonth(day, currentDate) }
            ]"
          >
            {{ format(day, 'd') }}
          </div>
          <span v-if="getItemsForDay(day).length" class="sr-only">{{ getDaySummary(day) }}</span>

          <!-- Absence/Request indicators -->
          <div :class="['absolute left-1 right-1 flex flex-wrap items-center gap-1', compact ? 'bottom-0.5' : 'bottom-1']">
            <template v-for="(item, i) in getItemsForDay(day).slice(0, maxDots)" :key="i">
              <!-- Only a request the edit form can open is a control; the rest is a mark -->
              <button
                v-if="canEditItem(item)"
                type="button"
                class="relative rounded-full transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 before:absolute before:-inset-2 before:content-['']"
                :class="[
                  compact ? 'h-2 w-2' : 'h-3 w-3',
                  getTypeColorClasses(item.absenceType?.code, true)
                ]"
                :title="getItemTooltip(item)"
                :aria-label="getItemTooltip(item)"
                @click="handleItemClick(item)"
              ></button>
              <span
                v-else
                class="rounded-full"
                :class="[
                  compact ? 'h-2 w-2' : 'h-3 w-3',
                  getTypeColorClasses(item.absenceType?.code, item.status === 'pending')
                ]"
                :title="getItemTooltip(item)"
                aria-hidden="true"
              ></span>
            </template>
            <div
              v-if="getItemsForDay(day).length > maxDots"
              :class="['text-neutral-500', compact ? 'text-[10px]' : 'text-xs']"
              aria-hidden="true"
            >
              +{{ getItemsForDay(day).length - maxDots }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend: colour is the type, a hollow dot is a request still pending -->
    <div
      class="border-t border-neutral-200 bg-neutral-50 flex flex-wrap"
      :class="compact ? 'p-2 justify-center gap-x-3 gap-y-1' : 'p-3 gap-x-4 gap-y-2'"
    >
      <div class="flex items-center">
        <span class="rounded-full bg-blue-500 mr-1.5" :class="compact ? 'h-2 w-2' : 'h-3 w-3'" aria-hidden="true"></span>
        <span :class="compact ? 'text-[10px] text-neutral-500' : 'text-xs text-neutral-600'">{{ $t('absences.legendVacation') }}</span>
      </div>
      <div class="flex items-center">
        <span class="rounded-full bg-red-500 mr-1.5" :class="compact ? 'h-2 w-2' : 'h-3 w-3'" aria-hidden="true"></span>
        <span :class="compact ? 'text-[10px] text-neutral-500' : 'text-xs text-neutral-600'">{{ $t('absences.legendSick') }}</span>
      </div>
      <div class="flex items-center">
        <span class="rounded-full bg-purple-500 mr-1.5" :class="compact ? 'h-2 w-2' : 'h-3 w-3'" aria-hidden="true"></span>
        <span :class="compact ? 'text-[10px] text-neutral-500' : 'text-xs text-neutral-600'">{{ $t('absences.legendPersonal') }}</span>
      </div>
      <div class="flex items-center">
        <span class="rounded-full bg-neutral-500 mr-1.5" :class="compact ? 'h-2 w-2' : 'h-3 w-3'" aria-hidden="true"></span>
        <span :class="compact ? 'text-[10px] text-neutral-500' : 'text-xs text-neutral-600'">{{ $t('absences.legendOther') }}</span>
      </div>
      <div class="flex items-center">
        <span
          class="rounded-full bg-neutral-100 border-neutral-500 mr-1.5"
          :class="compact ? 'h-2 w-2 border' : 'h-3 w-3 border-2'"
          aria-hidden="true"
        ></span>
        <span :class="compact ? 'text-[10px] text-neutral-500' : 'text-xs text-neutral-600'">{{ $t('absences.pendingRequest') }}</span>
      </div>
    </div>
  </div>
</template>
