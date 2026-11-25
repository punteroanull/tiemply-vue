<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { format, addDays, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { useSchedulesStore } from "../stores/schedules";
import ScheduleBlock from "../components/ScheduleBlock.vue";
import NightShiftIndicator from "../components/NightShiftIndicator.vue";
import ErrorState from "../components/ErrorState.vue";
import {
  formatApiDate,
  formatClockTime,
  formatHoursAsDuration,
  formatLocalized,
  formatMinutesAsClock,
} from "../utils/apiDates";
import type { ScheduleType } from "../types";

const { t } = useI18n();
const schedulesStore = useSchedulesStore();

const currentWeekStart = ref<Date>(
  startOfWeek(new Date(), { weekStartsOn: 1 })
);

// Monday to Sunday: seven days, so the end is six days after the start.
const weekRangeDisplay = computed(() => {
  const start = currentWeekStart.value;
  const end = addDays(start, 6);
  return `${formatLocalized(start, "d MMM")} – ${formatLocalized(end, "d MMM yyyy")}`;
});

const weekly = computed(() => schedulesStore.weeklySchedule);

const todayYmd = computed(() => format(new Date(), "yyyy-MM-dd"));

// Each cell is the day the API returned, identified by its own date.
const days = computed(() =>
  (weekly.value?.days ?? []).map((day) => ({
    ...day,
    name: formatApiDate(day.date, "EEEE"),
    shortDate: formatApiDate(day.date, "d MMM"),
    isToday: day.date === todayYmd.value,
  }))
);

const hasBlocks = computed(() => days.value.some((day) => day.blocks.length > 0));

/**
 * What the week looks like:
 * - flexible: a minimum of hours per period, no timetable
 * - grid: blocks per day
 * - contract: no schedule record, the contract's start/end times apply
 * - none: nothing assigned
 */
const mode = computed((): "flexible" | "grid" | "contract" | "none" => {
  if (!weekly.value) return "none";
  if (weekly.value.isFlexible) return "flexible";
  if (hasBlocks.value) return "grid";
  if (schedulesStore.assignedSchedule) return "grid";
  if (schedulesStore.legacySchedule || days.value.some((day) => day.totalHours > 0)) {
    return "contract";
  }
  return "none";
});

const scheduleTypeBadgeClass = computed(() => {
  const type = schedulesStore.scheduleType;
  if (!type) return "";

  const classes: Record<ScheduleType, string> = {
    normal: "bg-green-100 text-green-800",
    split: "bg-blue-100 text-blue-800",
    night: "bg-purple-100 text-purple-800",
    guard: "bg-orange-100 text-orange-800",
    rotating: "bg-yellow-100 text-yellow-800",
    flexible: "bg-teal-100 text-teal-800",
  };
  return classes[type] || "bg-neutral-100 text-neutral-700";
});

const scheduleTypeLabel = computed(() => schedulesStore.scheduleTypeBadge?.label ?? "");

// Contract times of an employee without a schedule record.
const contractHours = computed(() => {
  const legacy = schedulesStore.legacySchedule;
  const start = formatClockTime(legacy?.contractStartTime);
  const end = formatClockTime(legacy?.contractEndTime);
  const daily = legacy?.totalHours ?? days.value.find((day) => day.totalHours > 0)?.totalHours ?? 0;
  return {
    range: start && end ? `${start} - ${end}` : "",
    daily: daily > 0 ? formatHoursAsDuration(daily) : "",
  };
});

const flexible = computed(() => {
  const progress = weekly.value?.flexibleProgress ?? schedulesStore.currentSchedule?.progress ?? null;
  const requiredHours = Number(
    weekly.value?.flexible?.requiredHours ?? progress?.requiredHours ?? 0
  );
  const period = weekly.value?.flexible?.hoursPeriod ?? progress?.period ?? "week";
  const requiredMinutes = Number(progress?.requiredMinutes ?? requiredHours * 60);
  const workedMinutes = Number(progress?.workedMinutes ?? 0);
  const percentage =
    requiredMinutes > 0
      ? Math.max(0, Math.min(100, Math.round((workedMinutes / requiredMinutes) * 100)))
      : 0;

  return {
    required: t(
      period === "month" ? "schedule.requiredHoursMonth" : "schedule.requiredHoursWeek",
      { hours: formatHoursAsDuration(requiredHours) }
    ),
    hasProgress: progress !== null,
    periodLabel: progress
      ? t("schedule.flexiblePeriod", {
          start: formatApiDate(progress.periodStart, "d MMM"),
          end: formatApiDate(progress.periodEnd, "d MMM yyyy"),
        })
      : "",
    worked: `${formatMinutesAsClock(workedMinutes)} h`,
    requiredClock: `${formatMinutesAsClock(requiredMinutes)} h`,
    remaining: `${formatMinutesAsClock(Math.max(0, requiredMinutes - workedMinutes))} h`,
    percentage,
  };
});

async function previousWeek() {
  currentWeekStart.value = subWeeks(currentWeekStart.value, 1);
  await loadWeeklySchedule();
}

async function nextWeek() {
  currentWeekStart.value = addWeeks(currentWeekStart.value, 1);
  await loadWeeklySchedule();
}

async function goToThisWeek() {
  currentWeekStart.value = startOfWeek(new Date(), { weekStartsOn: 1 });
  await loadWeeklySchedule();
}

async function loadWeeklySchedule() {
  const weekStartStr = format(currentWeekStart.value, "yyyy-MM-dd");
  await schedulesStore.fetchWeeklySchedule(weekStartStr);
}

async function loadAll() {
  // The current schedule gives the type and name; the week gives the days.
  await Promise.all([schedulesStore.fetchCurrentSchedule(), loadWeeklySchedule()]);
}

onMounted(loadAll);
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-6 md:flex md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-neutral-800">
          {{ t("schedule.title") }}
        </h1>
        <p class="text-neutral-500 mt-1" aria-live="polite">{{ weekRangeDisplay }}</p>
      </div>

      <!-- Week navigation -->
      <div
        v-if="!schedulesStore.featureUnavailable"
        class="flex items-center gap-2 mt-4 md:mt-0"
        role="group"
        :aria-label="t('schedule.weekNavigation')"
      >
        <button
          type="button"
          @click="previousWeek"
          class="h-11 w-11 flex items-center justify-center rounded-md hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :title="t('schedule.previousWeek')"
          :aria-label="t('schedule.previousWeek')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="w-5 h-5"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <button
          type="button"
          @click="goToThisWeek"
          class="h-11 px-3 text-sm font-medium rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {{ t("schedule.thisWeek") }}
        </button>
        <button
          type="button"
          @click="nextWeek"
          class="h-11 w-11 flex items-center justify-center rounded-md hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :title="t('schedule.nextWeek')"
          :aria-label="t('schedule.nextWeek')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="w-5 h-5"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Not included in the company plan -->
    <div
      v-if="schedulesStore.featureUnavailable"
      class="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center"
    >
      <h3 class="text-lg font-medium text-neutral-900">
        {{ t("schedule.notAvailableOnPlan") }}
      </h3>
      <p class="mt-2 text-neutral-500">
        {{ t("schedule.notAvailableOnPlanDescription") }}
      </p>
    </div>

    <!-- First load: afterwards the week stays on screen while another one is fetched -->
    <div
      v-else-if="schedulesStore.loading && !weekly"
      class="flex items-center justify-center py-12"
      role="status"
    >
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
        aria-hidden="true"
      ></div>
      <span class="sr-only">{{ t("common.loading") }}</span>
    </div>

    <!-- Failed to load: not the same as having no schedule -->
    <ErrorState
      v-else-if="schedulesStore.error"
      :retrying="schedulesStore.loading"
      @retry="loadAll"
    />

    <!-- No schedule assigned -->
    <div
      v-else-if="mode === 'none'"
      class="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-12 h-12 mx-auto text-neutral-400"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-neutral-900">
        {{ t("schedule.noSchedule") }}
      </h3>
      <p class="mt-2 text-neutral-500">
        {{ t("schedule.noScheduleDescription") }}
      </p>
    </div>

    <!-- Schedule content -->
    <div
      v-else
      :class="{ 'opacity-60 pointer-events-none': schedulesStore.loading }"
      :aria-busy="schedulesStore.loading"
    >
      <!-- Schedule type and name, when the employee has a schedule record -->
      <div
        v-if="scheduleTypeLabel || schedulesStore.scheduleName"
        class="mb-4 flex flex-wrap items-center gap-3"
      >
        <span
          v-if="scheduleTypeLabel"
          :class="scheduleTypeBadgeClass"
          class="px-3 py-1 rounded-full text-sm font-medium"
        >
          {{ scheduleTypeLabel }}
        </span>
        <NightShiftIndicator
          v-if="schedulesStore.isNightShift"
          :showLabel="true"
          size="md"
        />
        <span v-if="schedulesStore.scheduleName" class="text-sm text-neutral-500">
          {{ schedulesStore.scheduleName }}
        </span>
      </div>

      <!-- Flexible: hours to complete in the period, no timetable -->
      <div
        v-if="mode === 'flexible'"
        class="bg-white rounded-lg border border-neutral-200 p-6"
      >
        <h2 class="text-lg font-medium text-neutral-800">
          {{ t("schedule.scheduleTypes.flexible") }}
        </h2>
        <p class="mt-1 text-neutral-500">{{ t("schedule.flexibleDescription") }}</p>
        <p class="mt-4 text-2xl font-semibold text-primary-600">{{ flexible.required }}</p>

        <div v-if="flexible.hasProgress" class="mt-6">
          <p class="text-sm text-neutral-500">{{ flexible.periodLabel }}</p>
          <div class="mt-2 flex items-center justify-between text-sm">
            <span class="text-neutral-700">
              {{ t("schedule.flexibleWorked") }}:
              <span class="font-medium">{{ flexible.worked }}</span> / {{ flexible.requiredClock }}
            </span>
            <span class="text-neutral-500">
              {{ t("schedule.flexibleRemaining") }}: {{ flexible.remaining }}
            </span>
          </div>
          <div
            class="mt-2 w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden"
            role="progressbar"
            :aria-label="t('schedule.flexibleWorked')"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="flexible.percentage"
            :aria-valuetext="`${flexible.worked} / ${flexible.requiredClock}`"
          >
            <div
              class="h-2.5 rounded-full bg-primary-500 transition-all duration-300"
              :style="{ width: `${flexible.percentage}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Contract hours: no per-day schedule to draw -->
      <div
        v-else-if="mode === 'contract'"
        class="bg-white rounded-lg border border-neutral-200 p-6"
      >
        <h2 class="text-lg font-medium text-neutral-800">
          {{ t("schedule.contractSchedule") }}
        </h2>
        <p class="mt-1 text-neutral-500">{{ t("schedule.contractScheduleDescription") }}</p>
        <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-if="contractHours.range">
            <dt class="text-sm text-neutral-500">{{ t("schedule.contractHours") }}</dt>
            <dd class="text-2xl font-semibold text-primary-600">{{ contractHours.range }}</dd>
          </div>
          <div v-if="contractHours.daily">
            <dt class="text-sm text-neutral-500">{{ t("schedule.dailyHours") }}</dt>
            <dd class="text-2xl font-semibold text-neutral-800">{{ contractHours.daily }}</dd>
          </div>
        </dl>
      </div>

      <template v-else>
        <!-- Weekly grid -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3"
        >
          <div
            v-for="day in days"
            :key="day.date"
            :class="[
              'bg-white rounded-lg border p-4 min-h-[140px]',
              day.isToday
                ? 'border-primary-500 ring-2 ring-primary-100'
                : 'border-neutral-200',
            ]"
            :aria-current="day.isToday ? 'date' : undefined"
          >
            <div class="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3
                  :class="[
                    'font-medium capitalize',
                    day.isToday ? 'text-primary-700' : 'text-neutral-700',
                  ]"
                >
                  {{ day.name }}
                </h3>
                <p class="text-xs text-neutral-500">{{ day.shortDate }}</p>
              </div>
              <span
                v-if="day.isToday"
                class="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded"
              >
                {{ t("common.today") }}
              </span>
            </div>

            <!-- Schedule blocks -->
            <div v-if="day.blocks.length" class="space-y-2">
              <ScheduleBlock
                v-for="block in day.blocks"
                :key="block.id"
                :block="block"
                :compact="true"
              />
            </div>
            <div v-else class="text-sm text-neutral-500 italic">
              {{ t("schedule.restDay") }}
            </div>

            <!-- Total hours -->
            <div
              v-if="day.totalHours > 0"
              class="mt-3 pt-2 border-t border-neutral-100 text-xs text-neutral-500"
            >
              {{ formatHoursAsDuration(day.totalHours) }}
            </div>
          </div>
        </div>

        <!-- Weekly total -->
        <div
          class="mt-6 bg-white rounded-lg border border-neutral-200 p-4 flex items-center justify-between"
        >
          <span class="text-neutral-600 font-medium">
            {{ t("schedule.totalWeeklyHours") }}
          </span>
          <span class="text-2xl font-semibold text-primary-600">
            {{ formatHoursAsDuration(weekly?.totalWeeklyHours ?? 0) }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
