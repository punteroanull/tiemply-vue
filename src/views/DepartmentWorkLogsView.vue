<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useDepartmentsStore } from "../stores/departments";
import { format, parseISO, subDays } from "date-fns";
import { enUS, es } from "date-fns/locale";
import SourceBadge from "../components/SourceBadge.vue";

const { t, locale } = useI18n();
const router = useRouter();
const departmentsStore = useDepartmentsStore();

const loading = computed(() => departmentsStore.loading);
const workLogs = computed(() => departmentsStore.workLogs);
const employees = computed(() => departmentsStore.employees);
const canManage = computed(() => departmentsStore.canManageDepartment);

// Filters
const selectedEmployee = ref("all");
const startDate = ref(format(subDays(new Date(), 7), "yyyy-MM-dd"));
const endDate = ref(format(new Date(), "yyyy-MM-dd"));

const dateLocale = computed(() => (locale.value === "es" ? es : enUS));

// Filtered work logs
const filteredWorkLogs = computed(() => {
  if (selectedEmployee.value === "all") {
    return workLogs.value;
  }
  return workLogs.value.filter(
    (log) => log.employeeId === selectedEmployee.value
  );
});

// Group work logs by date
const groupedWorkLogs = computed(() => {
  const groups: Record<string, typeof workLogs.value> = {};
  filteredWorkLogs.value.forEach((log) => {
    if (!groups[log.date]) {
      groups[log.date] = [];
    }
    groups[log.date].push(log);
  });
  // Sort by date descending
  return Object.entries(groups).sort(
    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
  );
});

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "EEEE, MMM d, yyyy", {
      locale: dateLocale.value,
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string) {
  try {
    // Time comes as HH:mm:ss
    const [hours, minutes] = timeStr.split(":");
    return `${hours}:${minutes}`;
  } catch {
    return timeStr;
  }
}

function getTypeClass(type: string) {
  return type === "check_in"
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";
}

function getTypeText(type: string) {
  return type === "check_in" ? t("workLogs.checkIn") : t("workLogs.checkOut");
}

function getCategoryText(category: string) {
  switch (category) {
    case "shift_start":
      return locale.value === "es" ? "Inicio turno" : "Shift start";
    case "shift_end":
      return locale.value === "es" ? "Fin turno" : "Shift end";
    case "break_start":
      return locale.value === "es" ? "Inicio descanso" : "Break start";
    case "break_end":
      return locale.value === "es" ? "Fin descanso" : "Break end";
    case "offsite_start":
      return locale.value === "es" ? "Salida oficina" : "Offsite start";
    case "offsite_end":
      return locale.value === "es" ? "Regreso oficina" : "Offsite end";
    default:
      return category;
  }
}

function getEmployeeName(log: any): string {
  return log.employee?.user?.name || log.employee?.name || "Unknown";
}

function goBack() {
  router.push("/department");
}

async function applyFilters() {
  await departmentsStore.fetchDepartmentWorkLogs(
    undefined,
    startDate.value,
    endDate.value
  );
}

onMounted(async () => {
  if (!canManage.value) {
    router.push("/department");
    return;
  }

  await departmentsStore.fetchDepartmentWorkLogs(
    undefined,
    startDate.value,
    endDate.value
  );
  await departmentsStore.fetchEmployees();
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <!-- Header -->
    <div class="mb-6">
      <button
        @click="goBack"
        class="flex items-center text-neutral-600 hover:text-neutral-800 mb-2"
      >
        <svg class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clip-rule="evenodd"
          />
        </svg>
        {{ $t("common.back") }}
      </button>
      <h1 class="text-2xl font-bold text-neutral-800">
        {{ $t("department.workLogs") }}
      </h1>
      <p class="text-neutral-600 mt-1">
        {{ $t("department.workLogsDescription") }}
      </p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">{{
            $t("department.employee")
          }}</label>
          <select
            v-model="selectedEmployee"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">{{ $t("department.allEmployees") }}</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.user?.name || emp.id }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">{{
            $t("absences.from")
          }}</label>
          <input
            type="date"
            v-model="startDate"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">{{
            $t("absences.to")
          }}</label>
          <input
            type="date"
            v-model="endDate"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="applyFilters"
            class="w-full px-4 py-2 bg-neutral-100 text-neutral-700 font-medium rounded-md hover:bg-neutral-200 transition-colors"
          >
            {{ locale === "es" ? "Aplicar" : "Apply" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"
      ></div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredWorkLogs.length === 0"
      class="bg-white rounded-lg shadow p-8 text-center"
    >
      <div
        class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 text-neutral-500 mb-4"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-neutral-800">
        {{ $t("department.noWorkLogs") }}
      </h3>
      <p class="text-neutral-600 mt-1">
        {{ $t("department.noWorkLogsDescription") }}
      </p>
    </div>

    <!-- Work Logs grouped by date -->
    <div v-else class="space-y-4">
      <div
        v-for="[date, logs] in groupedWorkLogs"
        :key="date"
        class="bg-white rounded-lg shadow overflow-hidden"
      >
        <!-- Date Header -->
        <div class="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
          <h3 class="font-medium text-neutral-800 capitalize">
            {{ formatDate(date) }}
          </h3>
          <p class="text-sm text-neutral-500">
            {{ logs.length }} {{ locale === "es" ? "registros" : "entries" }}
          </p>
        </div>

        <!-- Logs -->
        <div class="divide-y divide-neutral-200">
          <div
            v-for="log in logs"
            :key="log.id"
            class="px-4 py-3 flex items-center justify-between"
          >
            <div class="flex items-center">
              <div
                class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm mr-3"
              >
                {{ getEmployeeName(log).charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="font-medium text-neutral-800">
                  {{ getEmployeeName(log) }}
                </p>
                <p class="text-sm text-neutral-500">
                  {{ getCategoryText(log.category) }}
                </p>
              </div>
            </div>
            <div class="text-right flex items-center gap-2">
              <SourceBadge :source="log.source" size="sm" />
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="getTypeClass(log.type)"
              >
                {{ getTypeText(log.type) }}
              </span>
              <p class="text-sm text-neutral-600">
                {{ formatTime(log.time) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
