<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { format, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { useOvertimeStore } from "../stores/overtime";
import OvertimeProgressBar from "../components/OvertimeProgressBar.vue";
import type { OvertimeStatus } from "../types";

const { t, locale } = useI18n();
const overtimeStore = useOvertimeStore();

const selectedYear = ref(new Date().getFullYear());
const selectedStatus = ref<OvertimeStatus | "">("");
const selectedMonth = ref<string>("");

const dateLocale = computed(() => (locale.value === "es" ? es : enUS));

const years = computed(() => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1];
});

const months = computed(() => {
  return Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2024, i, 1), "MMMM", { locale: dateLocale.value }),
  }));
});

const filteredRecords = computed(() => {
  let records = overtimeStore.summary?.records || [];

  if (selectedStatus.value) {
    records = records.filter((r) => r.status === selectedStatus.value);
  }

  if (selectedMonth.value) {
    records = records.filter((r) => {
      const recordMonth = parseISO(r.date).getMonth() + 1;
      return recordMonth.toString() === selectedMonth.value;
    });
  }

  return records;
});

function getStatusBadgeClass(status: OvertimeStatus): string {
  const classes: Record<OvertimeStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return classes[status] || "bg-neutral-100 text-neutral-700";
}

function getStatusLabel(status: OvertimeStatus): string {
  const labels: Record<OvertimeStatus, string> = {
    pending: t("overtime.pending"),
    approved: t("overtime.approved"),
    rejected: t("overtime.rejected"),
  };
  return labels[status] || status;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "PPP", { locale: dateLocale.value });
  } catch {
    return dateStr;
  }
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m > 0) return `${h}h ${m}m`;
  return `${h}h`;
}

async function loadData() {
  await overtimeStore.fetchSummary(selectedYear.value);
}

async function changeYear(year: number) {
  selectedYear.value = year;
  await loadData();
}

onMounted(async () => {
  await loadData();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-6 md:flex md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-neutral-800">
          {{ t("overtime.title") }}
        </h1>
        <p class="text-neutral-500 mt-1">{{ t("overtime.summary") }}</p>
      </div>

      <!-- Year selector -->
      <div class="flex items-center gap-2 mt-4 md:mt-0">
        <label class="text-sm text-neutral-600">{{ t("overtime.year") }}:</label>
        <select
          :value="selectedYear"
          @change="changeYear(Number(($event.target as HTMLSelectElement).value))"
          class="rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
        >
          <option v-for="year in years" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-if="overtimeStore.loading"
      class="flex items-center justify-center py-12"
    >
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
      ></div>
    </div>

    <div v-else>
      <!-- Summary cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <!-- Total hours -->
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("overtime.totalHours") }}</p>
          <p class="text-2xl font-semibold text-neutral-900 mt-1">
            {{ formatHours(overtimeStore.summary?.totalHours || 0) }}
          </p>
        </div>

        <!-- Approved -->
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("overtime.approved") }}</p>
          <p class="text-2xl font-semibold text-green-600 mt-1">
            {{ formatHours(overtimeStore.summary?.approvedHours || 0) }}
          </p>
        </div>

        <!-- Pending -->
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("overtime.pending") }}</p>
          <p class="text-2xl font-semibold text-amber-600 mt-1">
            {{ formatHours(overtimeStore.summary?.pendingHours || 0) }}
          </p>
        </div>

        <!-- Remaining -->
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("overtime.remaining") }}</p>
          <p class="text-2xl font-semibold text-primary-600 mt-1">
            {{ formatHours(overtimeStore.summary?.remainingLimit || 0) }}
          </p>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="bg-white rounded-lg border border-neutral-200 p-4 mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-neutral-700">
            {{ t("overtime.annualLimit") }}
          </span>
          <span class="text-sm text-neutral-500">
            {{ overtimeStore.summary?.annualLimit || 0 }}h
          </span>
        </div>
        <OvertimeProgressBar
          :totalHours="overtimeStore.summary?.totalHours || 0"
          :annualLimit="overtimeStore.summary?.annualLimit || 80"
          :showLabel="true"
        />
      </div>

      <!-- Records section -->
      <div class="bg-white rounded-lg border border-neutral-200">
        <div class="p-4 border-b border-neutral-200">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 class="text-lg font-medium text-neutral-800">
              {{ t("overtime.records") }}
            </h2>

            <!-- Filters -->
            <div class="flex items-center gap-3">
              <select
                v-model="selectedStatus"
                class="rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">{{ t("overtime.allStatuses") }}</option>
                <option value="pending">{{ t("overtime.pending") }}</option>
                <option value="approved">{{ t("overtime.approved") }}</option>
                <option value="rejected">{{ t("overtime.rejected") }}</option>
              </select>

              <select
                v-model="selectedMonth"
                class="rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">{{ t("overtime.allMonths") }}</option>
                <option
                  v-for="month in months"
                  :key="month.value"
                  :value="month.value"
                >
                  {{ month.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Records table -->
        <div v-if="filteredRecords.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-neutral-200">
            <thead class="bg-neutral-50">
              <tr>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  {{ t("overtime.date") }}
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  {{ t("overtime.hours") }}
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  {{ t("overtime.status") }}
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  {{ t("overtime.approvedBy") }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-neutral-200">
              <tr
                v-for="record in filteredRecords"
                :key="record.id"
                class="hover:bg-neutral-50"
              >
                <td class="px-4 py-3 text-sm text-neutral-900">
                  {{ formatDate(record.date) }}
                </td>
                <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                  {{ formatHours(record.hours) }}
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="getStatusBadgeClass(record.status)"
                    class="px-2 py-1 rounded-full text-xs font-medium"
                  >
                    {{ getStatusLabel(record.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-neutral-500">
                  {{ record.approvedBy || "-" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div v-else class="p-8 text-center">
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
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-neutral-900">
            {{ t("overtime.noRecords") }}
          </h3>
          <p class="mt-2 text-neutral-500">
            {{ t("overtime.noRecordsDescription") }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
