<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useDepartmentsStore } from "../stores/departments";
import { useAbsencesStore } from "../stores/absences";
import { format, parseISO, subMonths } from "date-fns";
import { enUS, es } from "date-fns/locale";

const { locale } = useI18n();
const router = useRouter();
const departmentsStore = useDepartmentsStore();
const absencesStore = useAbsencesStore();

const loading = computed(() => departmentsStore.loading);
const absences = computed(() => departmentsStore.absences);
const employees = computed(() => departmentsStore.employees);
const canManage = computed(() => departmentsStore.canManageDepartment);

// Filters
const selectedEmployee = ref("all");
const selectedType = ref("all");
const startDate = ref(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
const endDate = ref(format(new Date(), "yyyy-MM-dd"));

const dateLocale = computed(() => (locale.value === "es" ? es : enUS));

// Filtered absences
const filteredAbsences = computed(() => {
  return absences.value.filter((absence) => {
    const matchesEmployee =
      selectedEmployee.value === "all" ||
      absence.employeeId === selectedEmployee.value;
    const matchesType =
      selectedType.value === "all" ||
      absence.absenceType?.id === selectedType.value;

    const absenceDate = parseISO(absence.date);
    const isAfterStart = parseISO(startDate.value) <= absenceDate;
    const isBeforeEnd = parseISO(endDate.value) >= absenceDate;

    return matchesEmployee && matchesType && isAfterStart && isBeforeEnd;
  });
});

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy", { locale: dateLocale.value });
  } catch {
    return dateStr;
  }
}

function getAbsenceTypeClass(code: string | undefined) {
  switch (code) {
    case "VAC":
    case "vacation":
      return "bg-blue-100 text-blue-800";
    case "SIC":
    case "sick_leave":
      return "bg-red-100 text-red-800";
    case "PER":
    case "personal_leave":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-neutral-100 text-neutral-800";
  }
}

function getEmployeeName(absence: any): string {
  return absence.employee?.user?.name || absence.employee?.name || "Unknown";
}

function goBack() {
  router.push("/department");
}

function navigateToNewAbsence() {
  router.push("/department/absences/new");
}

async function applyFilters() {
  await departmentsStore.fetchDepartmentAbsences(
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

  await departmentsStore.fetchDepartmentAbsences(
    undefined,
    startDate.value,
    endDate.value
  );
  await departmentsStore.fetchEmployees();
  if (absencesStore.absenceTypes.length === 0) {
    await absencesStore.fetchAbsenceTypes();
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"
    >
      <div>
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
          {{ $t("department.absences") }}
        </h1>
        <p class="text-neutral-600 mt-1">
          {{ $t("department.absencesDescription") }}
        </p>
      </div>

      <button
        @click="navigateToNewAbsence"
        class="flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
      >
        <svg class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clip-rule="evenodd"
          />
        </svg>
        {{ $t("department.registerAbsence") }}
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            $t("absences.absenceType")
          }}</label>
          <select
            v-model="selectedType"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">{{ $t("absences.allTypes") }}</option>
            <option
              v-for="type in absencesStore.absenceTypes"
              :key="type.id"
              :value="type.id"
            >
              {{ type.name }}
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
      v-else-if="filteredAbsences.length === 0"
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-neutral-800">
        {{ $t("department.noAbsences") }}
      </h3>
      <p class="text-neutral-600 mt-1">
        {{ $t("department.noAbsencesDescription") }}
      </p>
    </div>

    <!-- Absences Table - Desktop -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-neutral-200">
          <thead class="bg-neutral-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("department.employee") }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("workLogs.date") }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("requests.type") }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("absences.duration") }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("workLogs.notes") }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-neutral-200">
            <tr
              v-for="absence in filteredAbsences"
              :key="absence.id"
              class="hover:bg-neutral-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div
                    class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm"
                  >
                    {{ getEmployeeName(absence).charAt(0).toUpperCase() }}
                  </div>
                  <span class="ml-3 font-medium text-neutral-800">{{
                    getEmployeeName(absence)
                  }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                {{ formatDate(absence.date) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="getAbsenceTypeClass(absence.absenceType?.code)"
                >
                  {{ absence.absenceType?.name || $t("absences.absence") }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                {{
                  absence.isPartial
                    ? $t("absences.partialDay")
                    : $t("absences.fullDay")
                }}
              </td>
              <td class="px-6 py-4 text-sm text-neutral-600 max-w-xs truncate">
                {{ absence.notes || "-" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden divide-y divide-neutral-200">
        <div
          v-for="absence in filteredAbsences"
          :key="absence.id"
          class="p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <div
                class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm"
              >
                {{ getEmployeeName(absence).charAt(0).toUpperCase() }}
              </div>
              <span class="ml-3 font-medium text-neutral-800">{{
                getEmployeeName(absence)
              }}</span>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="getAbsenceTypeClass(absence.absenceType?.code)"
            >
              {{ absence.absenceType?.name || $t("absences.absence") }}
            </span>
          </div>
          <div class="text-sm text-neutral-600">
            <p>{{ formatDate(absence.date) }}</p>
            <p>
              {{
                absence.isPartial
                  ? $t("absences.partialDay")
                  : $t("absences.fullDay")
              }}
            </p>
            <p v-if="absence.notes" class="mt-1 text-neutral-500 truncate">
              {{ absence.notes }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
