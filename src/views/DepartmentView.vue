<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDepartmentsStore } from "../stores/departments";
import { useAuthStore } from "../stores/auth";
import ErrorState from "../components/ErrorState.vue";
import { apiDateToYmd, formatLocalized } from "../utils/apiDates";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns";

const { t } = useI18n();
const departmentsStore = useDepartmentsStore();
const authStore = useAuthStore();

// Only the first load swaps the page for a spinner; the calendar has its own.
const initialLoading = ref(true);
const department = computed(() => departmentsStore.department);
const employees = computed(() => departmentsStore.employees);
const calendarData = computed(() => departmentsStore.calendarData);
const isSupervisor = computed(() => departmentsStore.isSupervisor);
const canManage = computed(() => departmentsStore.canManageDepartment);
const hasDepartment = computed(() => !!authStore.currentDepartmentId);

/** The team calendar is for whoever manages the department, on plans that include it. */
const showCalendar = computed(() => canManage.value && departmentsStore.calendarAvailable);

const currentDate = ref(new Date());
const currentMonth = computed(() => formatLocalized(currentDate.value, "MMMM yyyy"));

// Calendar days
const calendarDays = computed(() => {
  const monthStart = startOfMonth(currentDate.value);
  const monthEnd = endOfMonth(currentDate.value);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: startDate, end: endDate });
});

// Days of the week, in the app language (the grid always starts on Monday)
const weekDays = computed(() =>
  calendarDays.value.slice(0, 7).map((day) => ({
    short: formatLocalized(day, "EEEEEE"),
    long: formatLocalized(day, "EEEE"),
  }))
);

// Absences grouped by calendar day
const absencesByDay = computed(() => {
  const byDay = new Map<string, NonNullable<typeof calendarData.value>["calendar"][number]["absences"]>();
  (calendarData.value?.calendar ?? []).forEach((day) => {
    const key = apiDateToYmd(day.date);
    if (key) byDay.set(key, day.absences ?? []);
  });
  return byDay;
});

// Get absences for a specific day
function getAbsencesForDay(day: Date) {
  return absencesByDay.value.get(format(day, "yyyy-MM-dd")) ?? [];
}

/** Who is away that day, in words (the dots alone say nothing to a screen reader). */
function getDaySummary(day: Date): string {
  return getAbsencesForDay(day)
    .map((absence) => `${absence.employee?.name ?? t("common.unknown")} (${absence.type?.name ?? t("absences.absence")})`)
    .join(", ");
}

// Navigation
function previousMonth() {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() - 1;
  currentDate.value = new Date(year, month, 1);
  loadCalendar();
}

function nextMonth() {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  currentDate.value = new Date(year, month, 1);
  loadCalendar();
}

function goToToday() {
  currentDate.value = new Date();
  loadCalendar();
}

function loadCalendar() {
  if (!canManage.value) return;
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  departmentsStore.fetchCalendar(year, month);
}

// Day classes
function getDayClass(day: Date) {
  return {
    "bg-neutral-50 text-neutral-400": !isSameMonth(day, currentDate.value),
    "bg-primary-50 font-semibold": isToday(day),
  };
}

// Absence type color
function getAbsenceColor(type?: { code?: string }) {
  switch (type?.code) {
    case "VAC":
    case "vacation":
      return "bg-blue-500";
    case "SIC":
    case "sick_leave":
      return "bg-red-500";
    case "PER":
    case "personal_leave":
      return "bg-purple-500";
    default:
      return "bg-neutral-500";
  }
}

// Get employee name helper
function getEmployeeName(employee: any): string {
  return employee?.user?.name || employee?.name || t("common.unknown");
}

/** Clock-in status only exists in the list supervisors get; undefined means "not known". */
function knowsClockIn(employee: { hasClockedInToday?: boolean }): boolean {
  return typeof employee.hasClockedInToday === "boolean";
}

async function load() {
  if (!hasDepartment.value) {
    initialLoading.value = false;
    return;
  }

  try {
    await departmentsStore.fetchDepartment();
    // Plain members read the list that comes with the department; the detailed list and
    // the calendar are only requested for whoever manages it (the API refuses the rest).
    await departmentsStore.fetchEmployees();
    loadCalendar();
  } finally {
    initialLoading.value = false;
  }
}

onMounted(load);

// Reload when department changes
watch(
  () => authStore.currentDepartmentId,
  (newId, oldId) => {
    if (newId && newId !== oldId) load();
  }
);
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-neutral-800">
        {{ $t("department.title") }}
      </h1>
      <p v-if="department" class="text-neutral-600 mt-1">
        {{ department.name }}
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="initialLoading" class="flex justify-center items-center h-64" role="status">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"
      ></div>
      <span class="sr-only">{{ $t("common.loading") }}</span>
    </div>

    <!-- No Department State -->
    <div
      v-else-if="!hasDepartment"
      class="bg-white rounded-lg shadow p-8 text-center"
    >
      <div
        class="inline-flex items-center justify-center h-16 w-16 rounded-full bg-neutral-100 text-neutral-500 mb-4"
      >
        <svg
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-neutral-800 mb-2">
        {{ $t("department.noDepartment") }}
      </h3>
      <p class="text-neutral-600">
        {{ $t("department.noDepartmentDescription") }}
      </p>
    </div>

    <!-- Error state: the department could not be loaded -->
    <ErrorState
      v-else-if="departmentsStore.departmentError && !department"
      @retry="load"
    />

    <div
      v-else
      class="grid grid-cols-1 gap-6"
      :class="showCalendar ? 'lg:grid-cols-3' : 'lg:grid-cols-2'"
    >
      <!-- Department Info Card -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-neutral-800 mb-4">
          {{ $t("department.info") }}
        </h2>

        <div class="space-y-4">
          <div>
            <span class="text-sm text-neutral-500">{{
              $t("department.name")
            }}</span>
            <p class="font-medium text-neutral-800">
              {{ department?.name || "-" }}
            </p>
          </div>
          <div>
            <span class="text-sm text-neutral-500">{{
              $t("department.description")
            }}</span>
            <p class="font-medium text-neutral-800">
              {{ department?.description || "-" }}
            </p>
          </div>
          <div>
            <span class="text-sm text-neutral-500">{{
              $t("department.supervisor")
            }}</span>
            <p class="font-medium text-neutral-800">
              {{
                department?.supervisor?.user?.name ||
                $t("department.noSupervisor")
              }}
            </p>
          </div>
          <div>
            <span class="text-sm text-neutral-500">{{
              $t("department.employeeCount")
            }}</span>
            <p class="font-medium text-neutral-800">
              {{ employees.length }} {{ $t("department.employees") }}
            </p>
          </div>
        </div>

        <!-- Supervisor badge -->
        <div v-if="isSupervisor" class="mt-4 p-3 bg-green-50 rounded-md">
          <span class="text-sm text-green-700 font-medium flex items-center">
            <svg
              class="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {{ $t("department.youAreSupervisor") }}
          </span>
        </div>
      </div>

      <!-- Employees List -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-neutral-800 mb-4">
          {{ $t("department.colleagues") }}
        </h2>

        <div
          v-if="employees.length === 0"
          class="text-neutral-500 text-center py-4"
        >
          {{ $t("department.noColleagues") }}
        </div>

        <ul v-else class="space-y-3 max-h-80 overflow-y-auto">
          <li
            v-for="employee in employees"
            :key="employee.id"
            class="flex items-center"
          >
            <div class="relative">
              <div
                class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm"
                aria-hidden="true"
              >
                {{ getEmployeeName(employee).charAt(0).toUpperCase() }}
              </div>
              <span
                v-if="knowsClockIn(employee)"
                class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                :class="employee.hasClockedInToday ? 'bg-green-500' : 'bg-neutral-400'"
                :title="employee.hasClockedInToday ? $t('department.clockedIn') : $t('department.notClockedIn')"
                aria-hidden="true"
              ></span>
            </div>
            <div class="ml-3 flex-1 min-w-0">
              <p class="text-sm font-medium text-neutral-800 truncate">
                {{ getEmployeeName(employee) }}
              </p>
              <p class="text-xs text-neutral-500 truncate">
                {{ employee.user?.email || "" }}
              </p>
              <!-- The same information as the dot, in words -->
              <p
                v-if="knowsClockIn(employee)"
                class="text-xs"
                :class="employee.hasClockedInToday ? 'text-green-700' : 'text-neutral-500'"
              >
                {{ employee.hasClockedInToday ? $t("department.clockedIn") : $t("department.notClockedIn") }}
              </p>
            </div>
            <span
              v-if="department?.supervisorId === employee.id"
              class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap"
            >
              {{ $t("department.supervisor") }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Department Calendar -->
      <div
        v-if="showCalendar"
        class="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden"
      >
        <div
          class="flex justify-between items-center p-4 border-b border-neutral-200"
        >
          <button
            type="button"
            @click="previousMonth"
            class="p-2.5 rounded-full hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            :aria-label="$t('absences.previousMonth')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-neutral-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-medium text-neutral-800 capitalize" aria-live="polite">
              {{ currentMonth }}
            </h3>
            <button
              type="button"
              @click="goToToday"
              class="text-xs text-primary-600 hover:text-primary-700"
            >
              {{ $t("common.today") }}
            </button>
          </div>
          <button
            type="button"
            @click="nextMonth"
            class="p-2.5 rounded-full hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            :aria-label="$t('absences.nextMonth')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-neutral-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <!-- Changing month dims the grid instead of blanking the page -->
        <div
          class="grid grid-cols-7 transition-opacity"
          :class="{ 'opacity-50': departmentsStore.calendarLoading }"
          :aria-busy="departmentsStore.calendarLoading"
        >
          <!-- Week headers -->
          <div
            v-for="day in weekDays"
            :key="day.long"
            class="py-2 text-center text-xs font-medium text-neutral-500 border-b capitalize"
          >
            <span aria-hidden="true">{{ day.short }}</span>
            <span class="sr-only">{{ day.long }}</span>
          </div>

          <!-- Calendar days -->
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            class="h-14 border-b border-r border-neutral-100 p-1 relative"
            :class="getDayClass(day)"
            :title="getDaySummary(day) || undefined"
          >
            <div class="text-xs text-right">
              {{ format(day, "d") }}
            </div>
            <span v-if="getAbsencesForDay(day).length" class="sr-only">{{ getDaySummary(day) }}</span>

            <!-- Absence indicators -->
            <div
              class="absolute bottom-1 left-1 right-1 flex flex-wrap items-center gap-0.5"
              aria-hidden="true"
            >
              <div
                v-for="(absence, i) in getAbsencesForDay(day).slice(0, 3)"
                :key="i"
                class="h-2 w-2 rounded-full"
                :class="getAbsenceColor(absence.type)"
              ></div>
              <span
                v-if="getAbsencesForDay(day).length > 3"
                class="text-[10px] text-neutral-500"
              >
                +{{ getAbsencesForDay(day).length - 3 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="p-3 border-t border-neutral-200 flex flex-wrap gap-3">
          <div class="flex items-center gap-1">
            <div class="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true"></div>
            <span class="text-xs text-neutral-600">{{ $t("absences.legendVacation") }}</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-2 w-2 rounded-full bg-red-500" aria-hidden="true"></div>
            <span class="text-xs text-neutral-600">{{ $t("absences.legendSick") }}</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-2 w-2 rounded-full bg-purple-500" aria-hidden="true"></div>
            <span class="text-xs text-neutral-600">{{ $t("absences.legendPersonal") }}</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-2 w-2 rounded-full bg-neutral-500" aria-hidden="true"></div>
            <span class="text-xs text-neutral-600">{{ $t("absences.legendOther") }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Supervisor Actions -->
    <div v-if="canManage && hasDepartment" class="mt-6">
      <h2 class="text-lg font-medium text-neutral-800 mb-4">
        {{ $t("department.supervisorActions") }}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <router-link
          to="/department/absences"
          class="flex items-center p-4 bg-white rounded-lg shadow hover:bg-neutral-50 transition-colors"
        >
          <svg
            class="h-6 w-6 text-red-500 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span class="font-medium text-neutral-700">{{
            $t("department.viewAbsences")
          }}</span>
        </router-link>

        <router-link
          to="/department/requests"
          class="flex items-center p-4 bg-white rounded-lg shadow hover:bg-neutral-50 transition-colors"
        >
          <svg
            class="h-6 w-6 text-amber-500 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span class="font-medium text-neutral-700">{{
            $t("department.viewRequests")
          }}</span>
        </router-link>

        <router-link
          to="/department/work-logs"
          class="flex items-center p-4 bg-white rounded-lg shadow hover:bg-neutral-50 transition-colors"
        >
          <svg
            class="h-6 w-6 text-blue-500 mr-3"
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
          <span class="font-medium text-neutral-700">{{
            $t("department.viewWorkLogs")
          }}</span>
        </router-link>

        <router-link
          to="/department/absences/new"
          class="flex items-center p-4 bg-primary-50 rounded-lg shadow hover:bg-primary-100 transition-colors"
        >
          <svg
            class="h-6 w-6 text-primary-600 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span class="font-medium text-primary-700">{{
            $t("department.registerAbsence")
          }}</span>
        </router-link>
      </div>
    </div>
  </div>
</template>
