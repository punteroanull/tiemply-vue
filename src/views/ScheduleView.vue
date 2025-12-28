<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { format, parseISO, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { useSchedulesStore } from "../stores/schedules";
import ScheduleBlock from "../components/ScheduleBlock.vue";
import NightShiftIndicator from "../components/NightShiftIndicator.vue";
import type { ScheduleType } from "../types";

const { t, locale } = useI18n();
const schedulesStore = useSchedulesStore();

const currentWeekStart = ref<Date>(
  startOfWeek(new Date(), { weekStartsOn: 1 })
);

const dateLocale = computed(() => (locale.value === "es" ? es : enUS));

const weekRangeDisplay = computed(() => {
  const start = currentWeekStart.value;
  const end = addWeeks(start, 1);
  return `${format(start, "MMM d", { locale: dateLocale.value })} - ${format(
    subWeeks(end, 0),
    "MMM d, yyyy",
    { locale: dateLocale.value }
  )}`;
});

const scheduleTypeBadgeClass = computed(() => {
  const schedule = schedulesStore.weeklySchedule?.schedule;
  if (!schedule) return "";

  const classes: Record<ScheduleType, string> = {
    normal: "bg-green-100 text-green-700",
    split: "bg-blue-100 text-blue-700",
    night: "bg-purple-100 text-purple-700",
    guard: "bg-orange-100 text-orange-700",
    rotating: "bg-yellow-100 text-yellow-700",
  };
  return classes[schedule.scheduleType] || "bg-neutral-100 text-neutral-700";
});

const scheduleTypeLabel = computed(() => {
  const schedule = schedulesStore.weeklySchedule?.schedule;
  if (!schedule) return "";
  return t(`schedule.scheduleTypes.${schedule.scheduleType}`);
});

const dayNames = computed(() => [
  { key: "1", name: locale.value === "es" ? "Lunes" : "Monday" },
  { key: "2", name: locale.value === "es" ? "Martes" : "Tuesday" },
  { key: "3", name: locale.value === "es" ? "Miercoles" : "Wednesday" },
  { key: "4", name: locale.value === "es" ? "Jueves" : "Thursday" },
  { key: "5", name: locale.value === "es" ? "Viernes" : "Friday" },
  { key: "6", name: locale.value === "es" ? "Sabado" : "Saturday" },
  { key: "7", name: locale.value === "es" ? "Domingo" : "Sunday" },
]);

function isToday(dayKey: string): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
  return dayKey === isoDayOfWeek.toString();
}

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

onMounted(async () => {
  await schedulesStore.fetchCurrentSchedule();
  await loadWeeklySchedule();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-6 md:flex md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-neutral-800">
          {{ t("schedule.title") }}
        </h1>
        <p class="text-neutral-500 mt-1">{{ weekRangeDisplay }}</p>
      </div>

      <!-- Week navigation -->
      <div class="flex items-center gap-2 mt-4 md:mt-0">
        <button
          @click="previousWeek"
          class="p-2 rounded-md hover:bg-neutral-100 transition-colors"
          :title="t('schedule.previousWeek')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="w-5 h-5"
          >
            <path
              fill-rule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <button
          @click="goToThisWeek"
          class="px-3 py-1.5 text-sm font-medium rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
        >
          {{ t("schedule.thisWeek") }}
        </button>
        <button
          @click="nextWeek"
          class="p-2 rounded-md hover:bg-neutral-100 transition-colors"
          :title="t('schedule.nextWeek')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="w-5 h-5"
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

    <!-- Loading state -->
    <div
      v-if="schedulesStore.loading"
      class="flex items-center justify-center py-12"
    >
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
      ></div>
    </div>

    <!-- No schedule assigned -->
    <div
      v-else-if="!schedulesStore.weeklySchedule"
      class="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-12 h-12 mx-auto text-neutral-400"
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
    <div v-else>
      <!-- Schedule type badge -->
      <div class="mb-4 flex items-center gap-3">
        <span
          :class="scheduleTypeBadgeClass"
          class="px-3 py-1 rounded-full text-sm font-medium"
        >
          {{ scheduleTypeLabel }}
        </span>
        <NightShiftIndicator
          v-if="schedulesStore.weeklySchedule?.schedule?.scheduleType === 'night'"
          :showLabel="true"
          size="md"
        />
        <span class="text-sm text-neutral-500">
          {{ schedulesStore.weeklySchedule?.schedule?.name }}
        </span>
      </div>

      <!-- Weekly grid -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3"
      >
        <div
          v-for="day in dayNames"
          :key="day.key"
          :class="[
            'bg-white rounded-lg border p-4 min-h-[140px]',
            isToday(day.key)
              ? 'border-primary-500 ring-2 ring-primary-100'
              : 'border-neutral-200',
          ]"
        >
          <div class="flex items-center justify-between mb-3">
            <h3
              :class="[
                'font-medium',
                isToday(day.key) ? 'text-primary-700' : 'text-neutral-700',
              ]"
            >
              {{ day.name }}
            </h3>
            <span
              v-if="isToday(day.key)"
              class="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded"
            >
              {{ locale === "es" ? "Hoy" : "Today" }}
            </span>
          </div>

          <!-- Schedule blocks -->
          <div
            v-if="
              schedulesStore.weeklySchedule?.days?.[day.key]?.blocks?.length
            "
            class="space-y-2"
          >
            <ScheduleBlock
              v-for="block in schedulesStore.weeklySchedule.days[day.key].blocks"
              :key="block.id"
              :block="block"
              :compact="true"
            />
          </div>
          <div v-else class="text-sm text-neutral-400 italic">
            {{ locale === "es" ? "Sin horario" : "No schedule" }}
          </div>

          <!-- Total hours -->
          <div
            v-if="schedulesStore.weeklySchedule?.days?.[day.key]?.totalHours"
            class="mt-3 pt-2 border-t border-neutral-100 text-xs text-neutral-500"
          >
            {{ schedulesStore.weeklySchedule.days[day.key].totalHours }}h
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
          {{ schedulesStore.weeklySchedule?.totalWeeklyHours || 0 }}h
        </span>
      </div>
    </div>
  </div>
</template>
