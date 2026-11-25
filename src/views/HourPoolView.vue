<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useHourPoolStore } from "../stores/hourPool";
import ErrorState from "../components/ErrorState.vue";
import { formatApiDate } from "../utils/apiDates";
import type { EntryType, HourPoolEntry, SourceType } from "../types";

const { t } = useI18n();
const hourPoolStore = useHourPoolStore();

const selectedYear = ref(new Date().getFullYear());
const selectedType = ref<EntryType | "">("");
const selectedSourceType = ref<SourceType | "">("");
const currentPage = ref(1);

// Past years and this one: a year that has not started has no entries.
const years = computed(() => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 2, currentYear - 1, currentYear];
});

const hasFilters = computed(
  () => selectedType.value !== "" || selectedSourceType.value !== ""
);

const sourceTypes: SourceType[] = [
  "overtime_approved",
  "late_arrival",
  "early_departure",
  "incident_reversal",
  "manual_adjustment",
];

function getStatusColor(status: string): string {
  switch (status) {
    case "company_owes":
      return "text-green-700";
    case "employee_owes":
      return "text-red-700";
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
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";
}

function getSourceTypeLabel(sourceType: SourceType): string {
  return t(`hourPool.sourceTypes.${sourceType}`);
}

function formatDate(dateStr: string): string {
  return formatApiDate(dateStr, "PPP") || dateStr;
}

function formatMinutes(minutes: number): string {
  const absMinutes = Math.round(Math.abs(minutes));
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// Signed, so credit and debit can be told apart without relying on the badge colour.
function formatEntryAmount(entry: HourPoolEntry): string {
  return `${entry.type === "credit" ? "+" : "−"}${formatMinutes(entry.minutes)}`;
}

async function loadBalance() {
  await hourPoolStore.fetchBalance(selectedYear.value);
}

async function loadEntries() {
  await hourPoolStore.fetchEntries({
    startDate: `${selectedYear.value}-01-01`,
    endDate: `${selectedYear.value}-12-31`,
    type: selectedType.value || undefined,
    sourceType: selectedSourceType.value || undefined,
    page: currentPage.value,
    perPage: 20,
  });
}

async function loadAll() {
  await Promise.all([loadBalance(), loadEntries()]);
}

async function changeYear(year: number) {
  selectedYear.value = year;
  currentPage.value = 1;
  await loadAll();
}

async function changePage(page: number) {
  if (page < 1 || page > hourPoolStore.totalPages) return;
  currentPage.value = page;
  await loadEntries();
}

function clearFilters() {
  selectedType.value = "";
  selectedSourceType.value = "";
}

watch([selectedType, selectedSourceType], () => {
  currentPage.value = 1;
  loadEntries();
});

// The permission depends on company settings that the layout fetches without waiting, so
// on a reload it turns true after this view mounted. Load whenever it becomes true.
watch(
  () => hourPoolStore.canViewHourPool,
  (canView) => {
    if (canView) loadAll();
  },
  { immediate: true }
);
</script>

<template>
  <!-- Company settings still loading: do not flash "not available" -->
  <div
    v-if="!hourPoolStore.canViewHourPool && !hourPoolStore.settingsLoaded"
    class="flex items-center justify-center py-12"
    role="status"
  >
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" aria-hidden="true"></div>
    <span class="sr-only">{{ t("common.loading") }}</span>
  </div>

  <!-- Access denied / not on the company plan -->
  <div
    v-else-if="!hourPoolStore.canViewHourPool || hourPoolStore.featureUnavailable"
    class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
  >
    <div class="bg-white rounded-lg border border-neutral-200 p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto text-neutral-400" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
      <template v-if="hourPoolStore.featureUnavailable">
        <h3 class="mt-4 text-lg font-medium text-neutral-900">{{ t("hourPool.notAvailableOnPlan") }}</h3>
        <p class="mt-2 text-neutral-500">{{ t("hourPool.notAvailableOnPlanDescription") }}</p>
      </template>
      <template v-else>
        <h3 class="mt-4 text-lg font-medium text-neutral-900">{{ t("hourPool.notAvailable") }}</h3>
        <p class="mt-2 text-neutral-500">{{ t("hourPool.notAvailableDescription") }}</p>
      </template>
    </div>
  </div>

  <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <label for="hour-pool-year" class="text-sm text-neutral-600">{{ t("overtime.year") }}:</label>
        <select
          id="hour-pool-year"
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

    <!-- First load only: changing the year keeps the page in place -->
    <div
      v-if="hourPoolStore.loading && !hourPoolStore.balance"
      class="flex items-center justify-center py-12"
      role="status"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" aria-hidden="true"></div>
      <span class="sr-only">{{ t("common.loading") }}</span>
    </div>

    <!-- Failed to load the balance -->
    <ErrorState
      v-else-if="hourPoolStore.balanceError"
      :retrying="hourPoolStore.loading"
      @retry="loadAll"
    />

    <div v-else>
      <!-- Balance card -->
      <div
        v-if="hourPoolStore.balance"
        class="rounded-lg border p-6 mb-6"
        :class="[
          getStatusBgColor(hourPoolStore.balance.confirmed.status),
          { 'opacity-60': hourPoolStore.loading },
        ]"
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
              <p class="text-xl font-semibold text-green-700">
                {{ hourPoolStore.balance.confirmed.formattedCredits }}
              </p>
            </div>
            <div class="text-center">
              <p class="text-sm text-neutral-500 mb-1">{{ t("hourPool.debits") }}</p>
              <p class="text-xl font-semibold text-red-700">
                {{ hourPoolStore.balance.confirmed.formattedDebits }}
              </p>
            </div>
          </div>

          <!-- Pending overtime -->
          <div class="text-center md:text-right">
            <p class="text-sm text-neutral-500 mb-1">
              {{ t("hourPool.pendingOvertime") }} ({{ selectedYear }})
            </p>
            <p class="text-xl font-semibold text-amber-700">
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
        <!-- What moved in the selected year, apart from the running total above -->
        <dl
          v-if="hourPoolStore.balance.yearActivity"
          class="mt-6 pt-4 border-t border-neutral-200 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm"
        >
          <dt class="font-medium text-neutral-700 w-full sm:w-auto">
            {{ t("hourPool.yearActivity", { year: hourPoolStore.balance.year ?? selectedYear }) }}
          </dt>
          <div class="flex gap-2">
            <dt class="text-neutral-500">{{ t("hourPool.credits") }}</dt>
            <dd class="font-semibold text-green-700">
              {{ hourPoolStore.balance.yearActivity.formattedCredits }}
            </dd>
          </div>
          <div class="flex gap-2">
            <dt class="text-neutral-500">{{ t("hourPool.debits") }}</dt>
            <dd class="font-semibold text-red-700">
              {{ hourPoolStore.balance.yearActivity.formattedDebits }}
            </dd>
          </div>
          <div class="flex gap-2">
            <dt class="text-neutral-500">{{ t("hourPool.yearNet") }}</dt>
            <dd
              class="font-semibold"
              :class="getStatusColor(hourPoolStore.balance.yearActivity.status)"
            >
              {{ hourPoolStore.balance.yearActivity.formattedBalance }}
            </dd>
          </div>
        </dl>
        <!-- The balance is not per year: say so next to the year selector's effect. -->
        <p class="mt-4 text-xs text-neutral-500">{{ t("hourPool.allTimeBalanceHint") }}</p>
      </div>

      <!-- Entries section -->
      <div class="bg-white rounded-lg border border-neutral-200">
        <div class="p-4 border-b border-neutral-200">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 class="text-lg font-medium text-neutral-800">
              {{ t("hourPool.entries") }} {{ selectedYear }}
              <span v-if="hourPoolStore.totalEntries > 0" class="text-sm font-normal text-neutral-500">
                ({{ hourPoolStore.totalEntries }})
              </span>
            </h2>

            <!-- Filters -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <select
                v-model="selectedType"
                :aria-label="t('hourPool.filterByType')"
                class="rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">{{ t("hourPool.allTypes") }}</option>
                <option value="credit">{{ t("hourPool.credit") }}</option>
                <option value="debit">{{ t("hourPool.debit") }}</option>
              </select>

              <select
                v-model="selectedSourceType"
                :aria-label="t('hourPool.filterBySource')"
                class="rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">{{ t("hourPool.allSources") }}</option>
                <option v-for="source in sourceTypes" :key="source" :value="source">
                  {{ t(`hourPool.sourceTypes.${source}`) }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Loading entries -->
        <div
          v-if="hourPoolStore.loadingEntries"
          class="flex items-center justify-center py-12"
          role="status"
        >
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" aria-hidden="true"></div>
          <span class="sr-only">{{ t("common.loading") }}</span>
        </div>

        <!-- Failed to load the entries -->
        <div v-else-if="hourPoolStore.entriesError" class="p-4">
          <ErrorState @retry="loadEntries" />
        </div>

        <!-- Entries table -->
        <div v-else-if="hourPoolStore.entries && hourPoolStore.entries.data.length > 0">
          <!-- Desktop table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead class="bg-neutral-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.date") }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.type") }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.amount") }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.source") }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.description") }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
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
                  <td class="px-4 py-3 text-sm font-medium text-neutral-900 whitespace-nowrap">
                    {{ formatEntryAmount(entry) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-neutral-600">
                    {{ getSourceTypeLabel(entry.sourceType) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-neutral-500 max-w-xs truncate" :title="entry.description || undefined">
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
                <span class="text-neutral-500">{{ t("hourPool.amount") }}:</span>
                <span class="font-medium text-neutral-900">{{ formatEntryAmount(entry) }}</span>
              </div>
              <div class="flex justify-between items-center text-sm mb-1">
                <span class="text-neutral-500">{{ t("hourPool.source") }}:</span>
                <span class="text-neutral-600">{{ getSourceTypeLabel(entry.sourceType) }}</span>
              </div>
              <div v-if="entry.creator?.name" class="flex justify-between items-center text-sm mb-1">
                <span class="text-neutral-500">{{ t("hourPool.createdBy") }}:</span>
                <span class="text-neutral-600">{{ entry.creator.name }}</span>
              </div>
              <div v-if="entry.description" class="text-sm text-neutral-500 mt-2">
                {{ entry.description }}
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <nav
            v-if="hourPoolStore.totalPages > 1"
            class="px-4 py-3 border-t border-neutral-200 flex items-center justify-between gap-3"
            :aria-label="t('hourPool.pagination')"
          >
            <p class="text-sm text-neutral-500">
              {{ t("hourPool.showing") }}
              {{ hourPoolStore.entries.from }}-{{ hourPoolStore.entries.to }}
              {{ t("hourPool.of") }}
              {{ hourPoolStore.entries.total }}
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                :disabled="currentPage <= 1"
                @click="changePage(currentPage - 1)"
                class="btn-outline min-h-[44px] text-sm"
              >
                {{ t("common.previous") }}
              </button>
              <button
                type="button"
                :disabled="currentPage >= hourPoolStore.totalPages"
                @click="changePage(currentPage + 1)"
                class="btn-outline min-h-[44px] text-sm"
              >
                {{ t("common.next") }}
              </button>
            </div>
          </nav>
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
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <!-- A year or filter without entries is not "no entries yet". -->
          <h3 class="mt-4 text-lg font-medium text-neutral-900">
            {{ t("hourPool.noResults") }}
          </h3>
          <p class="mt-2 text-neutral-500">
            {{ t("hourPool.noResultsDescription") }}
          </p>
          <button
            v-if="hasFilters"
            type="button"
            class="btn-outline mx-auto mt-4"
            @click="clearFilters"
          >
            {{ t("hourPool.allTypes") }} · {{ t("hourPool.allSources") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
