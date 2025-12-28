<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, addDays } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useAbsencesStore } from '../stores/absences';

const router = useRouter();
const { t, locale } = useI18n();
const absencesStore = useAbsencesStore();

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

interface AbsenceRequest {
  id: string;
  startDate: string;
  endDate: string;
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
const dateLocale = computed(() => locale.value === 'es' ? es : enUS);
const currentMonth = computed(() => format(currentDate.value, 'MMMM yyyy', { locale: dateLocale.value }));

// Calendar days
const calendarDays = computed(() => {
  const monthStart = startOfMonth(currentDate.value);
  const monthEnd = endOfMonth(currentDate.value);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: startDate, end: endDate });
});

// Week days (localized)
const weekDays = computed(() => {
  if (locale.value === 'es') {
    return ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  }
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
});

// Expand request date range to individual days
function expandRequestToDays(request: AbsenceRequest): CalendarItem[] {
  const days: CalendarItem[] = [];
  let current = parseISO(request.startDate);
  const end = parseISO(request.endDate);

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
}

// Combined calendar items (absences + pending requests)
const calendarItems = computed(() => {
  const items: CalendarItem[] = [];

  // Add approved absences
  props.absences.forEach((absence: Absence) => {
    items.push({
      date: absence.date,
      type: 'absence',
      data: absence,
      absenceType: absence.absenceType,
      status: 'approved'
    });
  });

  // Add pending requests (expanded to individual days)
  props.requests
    .filter((req: AbsenceRequest) => req.status === 'pending')
    .forEach((request: AbsenceRequest) => {
      expandRequestToDays(request).forEach(day => {
        items.push(day);
      });
    });

  return items;
});

// Get items for a specific day
function getItemsForDay(day: Date): CalendarItem[] {
  const dayStr = format(day, 'yyyy-MM-dd');
  return calendarItems.value.filter(item => item.date === dayStr);
}

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

// Check if day has items
function hasItems(day: Date) {
  return getItemsForDay(day).length > 0;
}

// Get color classes for absence type
function getTypeColorClasses(code: string | undefined, isPending: boolean) {
  const baseColors: Record<string, { solid: string; outline: string }> = {
    vacation: { solid: 'bg-blue-500', outline: 'bg-blue-100 border-2 border-blue-500' },
    sick_leave: { solid: 'bg-red-500', outline: 'bg-red-100 border-2 border-red-500' },
    personal_leave: { solid: 'bg-purple-500', outline: 'bg-purple-100 border-2 border-purple-500' },
  };

  const colors = baseColors[code || ''] || { solid: 'bg-neutral-500', outline: 'bg-neutral-100 border-2 border-neutral-500' };
  return isPending ? colors.outline : colors.solid;
}

// Handle click on calendar item
function handleItemClick(item: CalendarItem) {
  if (item.status === 'pending' && item.type === 'request') {
    const request = item.data as AbsenceRequest;
    router.push(`/requests/${request.id}/edit`);
  }
}

// Get tooltip text for item
function getItemTooltip(item: CalendarItem): string {
  const typeName = item.absenceType?.name || t('absences.absence');
  if (item.status === 'pending') {
    return `${typeName} - ${t('absences.pendingRequest')} (${t('absences.clickToEdit')})`;
  }
  return `${typeName} - ${t('absences.approvedAbsence')}`;
}

onMounted(() => {
  if (absencesStore.absences.length === 0) {
    absencesStore.fetchAbsences();
  }
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-subtle overflow-hidden">
    <div class="flex justify-between items-center p-4 border-b border-neutral-200">
      <button @click="previousMonth" class="p-2 rounded-full hover:bg-neutral-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>

      <div class="text-center">
        <h2 :class="compact ? 'text-sm font-medium text-neutral-800' : 'text-lg font-medium text-neutral-800'">{{ currentMonth }}</h2>
        <button @click="resetToCurrentMonth" class="text-xs text-primary-600 hover:text-primary-700 mt-1">
          {{ $t('workLogs.today') }}
        </button>
      </div>

      <button @click="nextMonth" class="p-2 rounded-full hover:bg-neutral-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div class="overflow-x-auto">
      <div class="grid grid-cols-7 min-w-full">
        <!-- Week days header -->
        <div
          v-for="day in weekDays"
          :key="day"
          :class="[
            'py-2 text-center font-medium text-neutral-500 border-b border-neutral-200',
            compact ? 'text-xs' : 'text-xs'
          ]"
        >
          {{ day }}
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

          <!-- Absence/Request indicators -->
          <div :class="['absolute left-1 right-1 flex flex-wrap gap-1', compact ? 'bottom-0.5' : 'bottom-1']">
            <button
              v-for="(item, i) in getItemsForDay(day).slice(0, compact ? 2 : 3)"
              :key="i"
              :class="[
                'rounded-full transition-transform hover:scale-110',
                compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5',
                getTypeColorClasses(item.absenceType?.code, item.status === 'pending'),
                item.status === 'pending' ? 'cursor-pointer' : 'cursor-default'
              ]"
              :title="getItemTooltip(item)"
              @click="handleItemClick(item)"
            ></button>
            <div
              v-if="getItemsForDay(day).length > (compact ? 2 : 3)"
              :class="['text-neutral-500', compact ? 'text-[10px]' : 'text-xs']"
            >
              +{{ getItemsForDay(day).length - (compact ? 2 : 3) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div v-if="!compact" class="p-3 border-t border-neutral-200 bg-neutral-50 flex flex-wrap gap-4">
      <div class="flex items-center">
        <div class="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
        <span class="text-xs text-neutral-600">{{ $t('absences.approvedAbsence') }}</span>
      </div>
      <div class="flex items-center">
        <div class="h-3 w-3 rounded-full bg-blue-100 border-2 border-blue-500 mr-2"></div>
        <span class="text-xs text-neutral-600">{{ $t('absences.pendingRequest') }}</span>
      </div>
    </div>

    <!-- Compact legend -->
    <div v-else class="p-2 border-t border-neutral-200 bg-neutral-50 flex justify-center gap-3">
      <div class="flex items-center">
        <div class="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
        <span class="text-[10px] text-neutral-500">{{ $t('requests.approved') }}</span>
      </div>
      <div class="flex items-center">
        <div class="h-2 w-2 rounded-full bg-blue-100 border border-blue-500 mr-1"></div>
        <span class="text-[10px] text-neutral-500">{{ $t('requests.pending') }}</span>
      </div>
    </div>
  </div>
</template>
