<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { format, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { useHourPoolStore } from "../stores/hourPool";
import type { EntryType, SourceType } from "../types";

const { t, locale } = useI18n();
const hourPoolStore = useHourPoolStore();

const selectedYear = ref(new Date().getFullYear());
const selectedType = ref<EntryType | "">("");
const selectedSourceType = ref<SourceType | "">("");
const currentPage = ref(1);

const dateLocale = computed(() => (locale.value === "es" ? es : enUS));

const years = computed(() => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1];
});

function getStatusColor(status: string): string {
  switch (status) {
    case "company_owes":
      return "text-green-600";
    case "employee_owes":
      return "text-red-600";
    default:
      return "text-neutral-600";
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case "company_owes":
      return "bg-green-50 border-green-200";
    case "employee_owes":
      return "bg-red-50 border-red-200";
    default:
      return "bg-neutral-50 border-neutral-200";
  }
}

function getEntryTypeBadgeClass(type: EntryType): string {
  return type === "credit"
    ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";
}

function getSourceTypeLabel(sourceType: SourceType): string {
  return t(`hourPool.sourceTypes.${sourceType}`);
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "PPP", { locale: dateLocale.value });
  } catch {
    return dateStr;
  }
}

function formatMinutes(minutes: number): string {
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  const sign = minutes < 0 ? "-" : "";
  if (h > 0 && m > 0) return `${sign}${h}h ${m}m`;
  if (h > 0) return `${sign}${h}h`;
  return `${sign}${m}m`;
}

async function loadBalance() {
  await hourPoolStore.fetchBalance(selectedYear.value);
}

async function loadEntries() {
  await hourPoolStore.fetchEntries({
    type: selectedType.value || undefined,
    sourceType: selectedSourceType.value || undefined,
    page: currentPage.value,
    perPage: 20,
  });
}

async function changeYear(year: number) {
  selectedYear.value = year;
  await loadBalance();
}

async function changePage(page: number) {
  currentPage.value = page;
  await loadEntries();
}

watch([selectedType, selectedSourceType], () => {
  currentPage.value = 1;
  loadEntries();
});

onMounted(async () => {
  await Promise.all([loadBalance(), loadEntries()]);
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-6 md:flex md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-neutral-800">
          {{ t("hourPool.title") }}
        </h1>
        <p class="text-neutral-500 mt-1">{{ t("hourPool.subtitle") }}</p>
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
    <div v-if="hourPoolStore.loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else>
      <!-- Balance card -->
      <div
        v-if="hourPoolStore.balance"
        class="rounded-lg border p-6 mb-6"
        :class="getStatusBgColor(hourPoolStore.balance.confirmed.status)"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Net balance -->
          <div class="text-center md:text-left">
            <p class="text-sm text-neutral-500 mb-1">{{ t("hourPool.netBalance") }}</p>
            <p
              class="text-3xl font-bold"
              :class="getStatusColor(hourPoolStore.balance.confirmed.status)"
            >
              {{ hourPoolStore.balance.confirmed.formattedBalance }}
            </p>
            <p class="text-sm mt-1" :class="getStatusColor(hourPoolStore.balance.confirmed.status)">
              {{ t(`hourPool.status.${hourPoolStore.balance.confirmed.status}`) }}
            </p>
          </div>

          <!-- Credits & Debits -->
          <div class="flex justify-center gap-8 md:gap-12">
            <div class="text-center">
              <p class="text-sm text-neutral-500 mb-1">{{ t("hourPool.credits") }}</p>
              <p class="text-xl font-semibold text-green-600">
                {{ hourPoolStore.balance.confirmed.formattedCredits }}
              </p>
            </div>
            <div class="text-center">
              <p class="text-sm text-neutral-500 mb-1">{{ t("hourPool.debits") }}</p>
              <p class="text-xl font-semibold text-red-600">
                {{ hourPoolStore.balance.confirmed.formattedDebits }}
              </p>
            </div>
          </div>

          <!-- Pending overtime -->
          <div class="text-center md:text-right">
            <p class="text-sm text-neutral-500 mb-1">{{ t("hourPool.pendingOvertime") }}</p>
            <p class="text-xl font-semibold text-amber-600">
              {{ hourPoolStore.balance.formattedPendingOvertime }}
            </p>
            <p class="text-sm text-neutral-500 mt-1">
              {{ t("hourPool.potentialBalance") }}:
              <span class="font-medium text-neutral-700">
                {{ hourPoolStore.balance.formattedPotentialBalance }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Entries section -->
      <div class="bg-white rounded-lg border border-neutral-200">
        <div class="p-4 border-b border-neutral-200">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 class="text-lg font-medium text-neutral-800">
              {{ t("hourPool.entries") }}
              <span v-if="hourPoolStore.totalEntries > 0" class="text-sm font-normal text-neutral-500">
                ({{ hourPoolStore.totalEntries }})
              </span>
            </h2>

            <!-- Filters -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <select
                v-model="selectedType"
                class="rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">{{ t("hourPool.allTypes") }}</option>
                <option value="credit">{{ t("hourPool.credit") }}</option>
                <option value="debit">{{ t("hourPool.debit") }}</option>
              </select>

              <select
                v-model="selectedSourceType"
                class="rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">{{ t("hourPool.allSources") }}</option>
                <option value="overtime_approved">{{ t("hourPool.sourceTypes.overtime_approved") }}</option>
                <option value="late_arrival">{{ t("hourPool.sourceTypes.late_arrival") }}</option>
                <option value="early_departure">{{ t("hourPool.sourceTypes.early_departure") }}</option>
                <option value="incident_reversal">{{ t("hourPool.sourceTypes.incident_reversal") }}</option>
                <option value="manual_adjustment">{{ t("hourPool.sourceTypes.manual_adjustment") }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Loading entries -->
        <div v-if="hourPoolStore.loadingEntries" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <!-- Entries table -->
        <div v-else-if="hourPoolStore.entries && hourPoolStore.entries.data.length > 0">
          <!-- Desktop table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead class="bg-neutral-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.date") }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.type") }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.minutes") }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.source") }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.description") }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.createdBy") }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-neutral-200">
                <tr
                  v-for="entry in hourPoolStore.entries.data"
                  :key="entry.id"
                  class="hover:bg-neutral-50"
                >
                  <td class="px-4 py-3 text-sm text-neutral-900">
                    {{ formatDate(entry.date) }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      :class="getEntryTypeBadgeClass(entry.type)"
                      class="px-2 py-1 rounded-full text-xs font-medium"
                    >
                      {{ t(`hourPool.${entry.type}`) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                    {{ formatMinutes(entry.minutes) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-neutral-600">
                    {{ getSourceTypeLabel(entry.sourceType) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-neutral-500 max-w-xs truncate">
                    {{ entry.description || "-" }}
                  </td>
                  <td class="px-4 py-3 text-sm text-neutral-500">
                    {{ entry.creator?.name || "-" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="md:hidden divide-y divide-neutral-200">
            <div
              v-for="entry in hourPoolStore.entries.data"
              :key="entry.id"
              class="p-4"
            >
              <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-medium text-neutral-900">
                  {{ formatDate(entry.date) }}
                </span>
                <span
                  :class="getEntryTypeBadgeClass(entry.type)"
                  class="px-2 py-1 rounded-full text-xs font-medium"
                >
                  {{ t(`hourPool.${entry.type}`) }}
                </span>
              </div>
              <div class="flex justify-between items-center text-sm mb-1">
                <span class="text-neutral-500">{{ t("hourPool.minutes") }}:</span>
                <span class="font-medium text-neutral-900">{{ formatMinutes(entry.minutes) }}</span>
              </div>
              <div class="flex justify-between items-center text-sm mb-1">
                <span class="text-neutral-500">{{ t("hourPool.source") }}:</span>
                <span class="text-neutral-600">{{ getSourceTypeLabel(entry.sourceType) }}</span>
              </div>
              <div v-if="entry.description" class="text-sm text-neutral-500 mt-2">
                {{ entry.description }}
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div
            v-if="hourPoolStore.totalPages > 1"
            class="px-4 py-3 border-t border-neutral-200 flex items-center justify-between"
          >
            <p class="text-sm text-neutral-500">
              {{ t("hourPool.showing") }}
              {{ hourPoolStore.entries.from }}-{{ hourPoolStore.entries.to }}
              {{ t("hourPool.of") }}
              {{ hourPoolStore.entries.total }}
            </p>
            <div class="flex gap-2">
              <button
                :disabled="currentPage === 1"
                @click="changePage(currentPage - 1)"
                class="px-3 py-1 text-sm rounded-md border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
              >
                {{ t("common.back") }}
              </button>
              <button
                :disabled="currentPage === hourPoolStore.totalPages"
                @click="changePage(currentPage + 1)"
                class="px-3 py-1 text-sm rounded-md border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
              >
                {{ t("common.next") }}
              </button>
            </div>
          </div>
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
            {{ t("hourPool.noEntries") }}
          </h3>
          <p class="mt-2 text-neutral-500">
            {{ t("hourPool.noEntriesDescription") }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
