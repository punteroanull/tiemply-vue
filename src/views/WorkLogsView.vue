<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useWorkLogsStore } from "../stores/workLogs";
import SourceBadge from "../components/SourceBadge.vue";
import {
  parse,
  format,
  parseISO,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { enUS, es } from "date-fns/locale";

const { locale } = useI18n();

const workLogsStore = useWorkLogsStore();
const activeTab = ref("daily");

const isLoading = computed(() => workLogsStore.loading);
const isExporting = computed(() => workLogsStore.exporting);

// Date selection
const selectedDate = ref(new Date());
const selectedWeek = ref(new Date());
const selectedMonth = ref(new Date());

// Date locale
const dateLocale = computed(() => locale.value === "es" ? es : enUS);

// Format date for display
const formattedSelectedDate = computed(() =>
  format(selectedDate.value, "MMMM d, yyyy", { locale: dateLocale.value })
);
const formattedSelectedWeek = computed(() => {
  const start = startOfWeek(selectedWeek.value, { weekStartsOn: 1 });
  const end = endOfWeek(selectedWeek.value, { weekStartsOn: 1 });
  return `${format(start, "MMM d", { locale: dateLocale.value })} - ${format(end, "MMM d, yyyy", { locale: dateLocale.value })}`;
});
const formattedSelectedMonth = computed(() =>
  format(selectedMonth.value, "MMMM yyyy", { locale: dateLocale.value })
);

// Format date for API
const dateForApi = computed(() => format(selectedDate.value, "yyyy-MM-dd"));
const weekStartForApi = computed(() =>
  format(startOfWeek(selectedWeek.value, { weekStartsOn: 1 }), "yyyy-MM-dd")
);
const weekEndForApi = computed(() =>
  format(endOfWeek(selectedWeek.value, { weekStartsOn: 1 }), "yyyy-MM-dd")
);
const monthForApi = computed(() => format(selectedMonth.value, "yyyy-MM"));

// Get the report based on active tab
const activeReport = computed(() => {
  switch (activeTab.value) {
    case "daily":
      return workLogsStore.dailyReport;
    case "weekly":
      return workLogsStore.weeklyReport;
    case "monthly":
      return workLogsStore.monthlyReport;
    default:
      return null;
  }
});

// Functions to navigate between dates
function previousDay() {
  selectedDate.value = subDays(selectedDate.value, 1);
}

function nextDay() {
  selectedDate.value = subDays(selectedDate.value, -1);
}

function previousWeek() {
  selectedWeek.value = subWeeks(selectedWeek.value, 1);
}

function nextWeek() {
  selectedWeek.value = subWeeks(selectedWeek.value, -1);
}

function previousMonth() {
  selectedMonth.value = subMonths(selectedMonth.value, 1);
}

function nextMonth() {
  selectedMonth.value = subMonths(selectedMonth.value, -1);
}

function setToday() {
  selectedDate.value = new Date();
}

function setThisWeek() {
  selectedWeek.value = new Date();
}

function setThisMonth() {
  selectedMonth.value = new Date();
}

// Tab changing function
function changeTab(tab: string) {
  activeTab.value = tab;

  // Load the appropriate report data
  if (tab === "daily") {
    workLogsStore.fetchDailyReport(dateForApi.value);
  } else if (tab === "weekly") {
    workLogsStore.fetchWeeklyReport(`${weekStartForApi.value}`);
  } else if (tab === "monthly") {
    const [year, month] = monthForApi.value.split("-");
    workLogsStore.fetchMonthlyReport(parseInt(year), parseInt(month));
  }
}

// Export PDF function
async function exportPdf() {
  if (activeTab.value === "daily") {
    await workLogsStore.exportDailyPdf(dateForApi.value);
  } else if (activeTab.value === "weekly") {
    await workLogsStore.exportWeeklyPdf(weekStartForApi.value);
  } else if (activeTab.value === "monthly") {
    const [year, month] = monthForApi.value.split("-");
    await workLogsStore.exportMonthlyPdf(parseInt(year), parseInt(month));
  }
}

// Watch for changes in selected dates and reload data
watch(
  () => dateForApi.value,
  (newDate) => {
    if (activeTab.value === "daily") {
      workLogsStore.fetchDailyReport(newDate);
    }
  }
);

watch([() => weekStartForApi.value, () => weekEndForApi.value], () => {
  if (activeTab.value === "weekly") {
    workLogsStore.fetchWeeklyReport(`${weekStartForApi.value}`);
  }
});

watch(
  () => monthForApi.value,
  (newMonth) => {
    if (activeTab.value === "monthly") {
      const [year, month] = newMonth.split("-");
      workLogsStore.fetchMonthlyReport(parseInt(year), parseInt(month));
    }
  }
);

// Format time display
//Since it gives me this error: Invalid time value: 08:56:00 RangeError: Invalid time value
function formatTime(timeString: string | undefined) {
  //console.log("timeString", timeString);
  if (!timeString) return "-"; // Return a default value if the time is invalid
  try {
    // Combine the time string with today's date to create a valid Date object
    const today = new Date();
    const dateWithTime = parse(timeString, "HH:mm:ss", today);
    return format(dateWithTime, "h:mm a");
  } catch (error) {
    console.error("Invalid time value:", timeString, error);
    return "-";
  }
}

// Helper to determine if a day has work logs
function hasWorkLogs(day: any) {
  return day.checkIn || day.checkOut;
}

onMounted(async () => {
  // Load daily report by default
  await workLogsStore.fetchDailyReport(dateForApi.value);
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6"
    >
      <h1 class="text-2xl font-bold text-neutral-800 mb-4 sm:mb-0">
        {{ $t('workLogs.title') }}
      </h1>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <!-- Tabs - scrollable on mobile -->
        <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 order-2 sm:order-1">
          <div class="flex space-x-2 bg-white rounded-lg shadow p-1 min-w-max">
            <button
              @click="changeTab('daily')"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              :class="
                activeTab === 'daily'
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              "
            >
              {{ $t('workLogs.daily') }}
            </button>
            <button
              @click="changeTab('weekly')"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              :class="
                activeTab === 'weekly'
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              "
            >
              {{ $t('workLogs.weekly') }}
            </button>
            <button
              @click="changeTab('monthly')"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              :class="
                activeTab === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              "
            >
              {{ $t('workLogs.monthly') }}
            </button>
          </div>
        </div>

        <!-- Export PDF Button -->
        <button
          @click="exportPdf"
          :disabled="isExporting || !activeReport || !activeReport.days || activeReport.days.length === 0"
          class="flex items-center justify-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed order-1 sm:order-2"
        >
          <svg
            v-if="isExporting"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span class="whitespace-nowrap">{{ isExporting ? $t('workLogs.exporting') : $t('workLogs.exportPdf') }}</span>
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow">
      <!-- Date navigation -->
      <div
        class="flex justify-between items-center p-4 border-b border-neutral-200"
      >
        <button
          class="p-2 rounded-full hover:bg-neutral-100"
          @click="
            activeTab === 'daily'
              ? previousDay()
              : activeTab === 'weekly'
              ? previousWeek()
              : previousMonth()
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-neutral-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <div class="text-center">
          <h2 class="text-lg font-medium text-neutral-800">
            {{
              activeTab === "daily"
                ? formattedSelectedDate
                : activeTab === "weekly"
                ? formattedSelectedWeek
                : formattedSelectedMonth
            }}
          </h2>
          <button
            @click="
              activeTab === 'daily'
                ? setToday()
                : activeTab === 'weekly'
                ? setThisWeek()
                : setThisMonth()
            "
            class="text-sm text-primary-600 hover:text-primary-700 mt-1"
          >
            {{ $t('workLogs.today') }}
          </button>
        </div>

        <button
          class="p-2 rounded-full hover:bg-neutral-100"
          @click="
            activeTab === 'daily'
              ? nextDay()
              : activeTab === 'weekly'
              ? nextWeek()
              : nextMonth()
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-neutral-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="p-8 flex justify-center">
        <div
          class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"
        ></div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="
          !activeReport || !activeReport.days || activeReport.days.length === 0
        "
        class="p-8 text-center"
      >
        <div
          class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 text-neutral-500 mb-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-neutral-800">{{ $t('workLogs.noWorkLogs') }}</h3>
        <p class="text-neutral-600 mt-1">
          {{ $t('workLogs.noWorkLogsForPeriod') }}
        </p>
      </div>

      <!-- Work logs data -->
      <div v-else class="overflow-hidden">
        <!-- Summary -->
        <div
          class="flex justify-between items-center bg-neutral-50 p-4 border-b border-neutral-200"
        >
          <div>
            <span class="text-sm text-neutral-600">{{ $t('workLogs.totalDays') }}: </span>
            <span class="font-medium">{{ activeReport.totalDays }}</span>
          </div>
          <div>
            <span class="text-sm text-neutral-600">{{ $t('workLogs.totalHours') }}: </span>
            <span class="font-medium">{{
              activeReport.totalDuration || "0:00"
            }}</span>
          </div>
        </div>

        <!-- Daily view -->
        <div
          v-if="activeTab === 'daily' && activeReport.days"
          class="divide-y divide-neutral-200"
        >
          <div
            v-for="(day, index) in activeReport.days"
            :key="index"
            class="p-4"
          >
            <div
              class="flex flex-col md:flex-row md:justify-between md:items-center mb-4"
            >
              <div class="mb-2 md:mb-0">
                <h3 class="font-medium text-neutral-800">
                  {{ format(parseISO(day.date), "EEEE, MMMM d, yyyy", { locale: dateLocale }) }}
                </h3>
              </div>

              <div
                v-if="hasWorkLogs(day)"
                class="flex flex-col sm:flex-row sm:space-x-6"
              >
                <div class="flex items-center mb-2 sm:mb-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-green-600 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div>
                    <span class="text-sm text-neutral-600">{{ $t('workLogs.checkIn') }}:</span>
                    <span class="font-medium ml-1">{{
                      day.checkIn ? formatTime(day.checkIn.time) : "-"
                    }}</span>
                  </div>
                </div>

                <div class="flex items-center mb-2 sm:mb-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-red-600 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div>
                    <span class="text-sm text-neutral-600">{{ $t('workLogs.checkOut') }}:</span>
                    <span class="font-medium ml-1">{{
                      day.checkOut ? formatTime(day.checkOut.time) : "-"
                    }}</span>
                  </div>
                </div>

                <div class="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-primary-600 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div>
                    <span class="text-sm text-neutral-600">{{ $t('workLogs.duration') }}:</span>
                    <span class="font-medium ml-1">{{
                      day.duration || "0:00"
                    }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-neutral-500 italic">
                {{ $t('workLogs.noLogsForDay') }}
              </div>
            </div>

            <!-- Table for detailed work logs - Desktop -->
            <div v-if="day.logs && day.logs.length > 0" class="mt-4">
              <!-- Desktop table -->
              <div class="hidden md:block overflow-x-auto">
                <table class="min-w-full divide-y divide-neutral-200">
                  <thead class="bg-neutral-50">
                    <tr>
                      <th
                        scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                      >
                        {{ $t('workLogs.time') }}
                      </th>
                      <th
                        scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                      >
                        {{ $t('workLogs.type') }}
                      </th>
                      <th
                        scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                      >
                        {{ $t('workLogs.category') }}
                      </th>
                      <th
                        scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                      >
                        {{ $t('workLogs.notes') }}
                      </th>
                      <th
                        scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                      >
                        {{ $t('workLogs.source') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-neutral-200">
                    <tr v-for="(log, logIndex) in day.logs" :key="logIndex">
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600"
                      >
                        {{ log.time ? formatTime(log.time) : "-" }}
                      </td>
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600"
                      >
                        {{ log.type || "-" }}
                      </td>
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600"
                      >
                        {{ log.category || "-" }}
                      </td>
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600"
                      >
                        {{ log.notes || "-" }}
                      </td>
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600"
                      >
                        <SourceBadge :source="log.source" size="sm" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mobile cards -->
              <div class="md:hidden space-y-2">
                <div
                  v-for="(log, logIndex) in day.logs"
                  :key="logIndex"
                  class="bg-neutral-50 rounded-lg p-3"
                >
                  <div class="flex justify-between items-start mb-2">
                    <span class="font-medium text-neutral-800">{{ log.time ? formatTime(log.time) : "-" }}</span>
                    <SourceBadge :source="log.source" size="sm" />
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span class="text-neutral-500">{{ $t('workLogs.type') }}:</span>
                      <span class="ml-1 text-neutral-700">{{ log.type || "-" }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500">{{ $t('workLogs.category') }}:</span>
                      <span class="ml-1 text-neutral-700">{{ log.category || "-" }}</span>
                    </div>
                  </div>
                  <div v-if="log.notes" class="mt-2 text-sm text-neutral-600">
                    {{ log.notes }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Weekly view -->
        <div
          v-else-if="activeTab === 'weekly' && activeReport.days"
        >
          <!-- Desktop table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead class="bg-neutral-50">
                <tr>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                  >
                    {{ $t('workLogs.day') }}
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                  >
                    {{ $t('workLogs.checkIn') }}
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                  >
                    {{ $t('workLogs.checkOut') }}
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                  >
                    {{ $t('workLogs.duration') }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-neutral-200">
                <tr
                  v-for="(day, index) in activeReport.days"
                  :key="index"
                  :class="{ 'bg-neutral-50': !hasWorkLogs(day) }"
                >
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800"
                  >
                    {{ format(parseISO(day.date), "EEE, MMM d", { locale: dateLocale }) }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600"
                  >
                    {{ day.checkIn ? formatTime(day.checkIn.time) : "-" }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600"
                  >
                    {{ day.checkOut ? formatTime(day.checkOut.time) : "-" }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                    :class="
                      day.duration ? 'text-primary-600' : 'text-neutral-500'
                    "
                  >
                    {{ day.duration || "0:00" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="md:hidden divide-y divide-neutral-200">
            <div
              v-for="(day, index) in activeReport.days"
              :key="index"
              class="p-4"
              :class="{ 'bg-neutral-50': !hasWorkLogs(day) }"
            >
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-neutral-800">
                  {{ format(parseISO(day.date), "EEE, MMM d", { locale: dateLocale }) }}
                </span>
                <span
                  class="font-medium"
                  :class="day.duration ? 'text-primary-600' : 'text-neutral-500'"
                >
                  {{ day.duration || "0:00" }}
                </span>
              </div>
              <div v-if="hasWorkLogs(day)" class="flex justify-between text-sm text-neutral-600">
                <span>{{ $t('workLogs.checkIn') }}: {{ day.checkIn ? formatTime(day.checkIn.time) : "-" }}</span>
                <span>{{ $t('workLogs.checkOut') }}: {{ day.checkOut ? formatTime(day.checkOut.time) : "-" }}</span>
              </div>
              <div v-else class="text-sm text-neutral-500 italic">
                {{ $t('workLogs.noLogsForDay') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly view -->
        <div
          v-else-if="activeTab === 'monthly' && activeReport.days"
        >
          <!-- Desktop table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead class="bg-neutral-50">
                <tr>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                  >
                    {{ $t('workLogs.date') }}
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                  >
                    {{ $t('workLogs.checkIn') }}
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                  >
                    {{ $t('workLogs.checkOut') }}
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                  >
                    {{ $t('workLogs.duration') }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-neutral-200">
                <tr
                  v-for="(day, index) in activeReport.days"
                  :key="index"
                  :class="{ 'bg-neutral-50': !hasWorkLogs(day) }"
                >
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800"
                  >
                    {{ format(parseISO(day.date), "EEE, MMM d, yyyy", { locale: dateLocale }) }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600"
                  >
                    {{ day.checkIn ? formatTime(day.checkIn.time) : "-" }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600"
                  >
                    {{ day.checkOut ? formatTime(day.checkOut.time) : "-" }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                    :class="
                      day.duration ? 'text-primary-600' : 'text-neutral-500'
                    "
                  >
                    {{ day.duration || "0:00" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="md:hidden divide-y divide-neutral-200">
            <div
              v-for="(day, index) in activeReport.days"
              :key="index"
              class="p-4"
              :class="{ 'bg-neutral-50': !hasWorkLogs(day) }"
            >
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-neutral-800">
                  {{ format(parseISO(day.date), "EEE, MMM d", { locale: dateLocale }) }}
                </span>
                <span
                  class="font-medium"
                  :class="day.duration ? 'text-primary-600' : 'text-neutral-500'"
                >
                  {{ day.duration || "0:00" }}
                </span>
              </div>
              <div v-if="hasWorkLogs(day)" class="flex justify-between text-sm text-neutral-600">
                <span>{{ $t('workLogs.checkIn') }}: {{ day.checkIn ? formatTime(day.checkIn.time) : "-" }}</span>
                <span>{{ $t('workLogs.checkOut') }}: {{ day.checkOut ? formatTime(day.checkOut.time) : "-" }}</span>
              </div>
              <div v-else class="text-sm text-neutral-500 italic">
                {{ $t('workLogs.noLogsForDay') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
