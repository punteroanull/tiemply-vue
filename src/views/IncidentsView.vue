<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useIncidentsStore } from "../stores/incidents";
import IncidentCard from "../components/IncidentCard.vue";
import ErrorState from "../components/ErrorState.vue";
import type { IncidentType, IncidentStatus } from "../types";

const { t } = useI18n();
const incidentsStore = useIncidentsStore();

const selectedType = ref<IncidentType | "">("");
const selectedStatus = ref<IncidentStatus | "">("");
const page = ref(1);

const hasFilters = computed(() => selectedType.value !== "" || selectedStatus.value !== "");

const incidentTypes: IncidentType[] = [
  "unclosed_shift",
  "late_arrival",
  "early_departure",
  "missing_checkout",
  "manual_adjustment",
];

const incidentStatuses: IncidentStatus[] = [
  "pending",
  "resolved",
  "validated",
  "marked_absence",
];

// Filtering and paging happen on the server (20 per page).
async function loadData() {
  await incidentsStore.fetchIncidents({
    type: selectedType.value || undefined,
    status: selectedStatus.value || undefined,
    page: page.value,
  });
}

async function applyFilters() {
  page.value = 1;
  await loadData();
}

async function clearFilters() {
  selectedType.value = "";
  selectedStatus.value = "";
  await applyFilters();
}

async function changePage(next: number) {
  if (next < 1 || next > incidentsStore.totalPages) return;
  page.value = next;
  await loadData();
  window.scrollTo({ top: 0 });
}

onMounted(loadData);
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-neutral-800">
        {{ t("incidents.title") }}
      </h1>
      <!-- Counts every pending incident, whatever filter or page is on screen. -->
      <p
        v-if="incidentsStore.pendingCount > 0"
        class="text-amber-700 mt-1"
      >
        {{ t("incidents.pendingCount", { count: incidentsStore.pendingCount }) }}
      </p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg border border-neutral-200 p-4 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex-1">
          <label for="incident-type-filter" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ t("incidents.filterByType") }}
          </label>
          <select
            id="incident-type-filter"
            v-model="selectedType"
            @change="applyFilters"
            class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">{{ t("incidents.allTypes") }}</option>
            <option v-for="type in incidentTypes" :key="type" :value="type">
              {{ t(`incidents.types.${type}`) }}
            </option>
          </select>
        </div>

        <div class="flex-1">
          <label for="incident-status-filter" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ t("incidents.filterByStatus") }}
          </label>
          <select
            id="incident-status-filter"
            v-model="selectedStatus"
            @change="applyFilters"
            class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">{{ t("incidents.allStatuses") }}</option>
            <option v-for="status in incidentStatuses" :key="status" :value="status">
              {{ t(`incidents.statuses.${status}`) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-if="incidentsStore.loading"
      class="flex items-center justify-center py-12"
      role="status"
    >
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
        aria-hidden="true"
      ></div>
      <span class="sr-only">{{ t("common.loading") }}</span>
    </div>

    <!-- Failed to load: not the same as having no incidents -->
    <ErrorState v-else-if="incidentsStore.error" @retry="loadData" />

    <!-- Incidents list -->
    <div v-else-if="incidentsStore.incidents.length > 0">
      <div class="space-y-4">
        <IncidentCard
          v-for="incident in incidentsStore.incidents"
          :key="incident.id"
          :incident="incident"
        />
      </div>

      <nav
        v-if="incidentsStore.totalPages > 1"
        class="mt-6 flex items-center justify-between gap-3"
        :aria-label="t('incidents.pagination')"
      >
        <button
          type="button"
          class="btn-outline min-h-[44px]"
          :disabled="incidentsStore.currentPage <= 1"
          @click="changePage(incidentsStore.currentPage - 1)"
        >
          {{ t("common.previous") }}
        </button>
        <p class="text-sm text-neutral-500">
          {{ t("incidents.pageOf", { page: incidentsStore.currentPage, total: incidentsStore.totalPages }) }}
        </p>
        <button
          type="button"
          class="btn-outline min-h-[44px]"
          :disabled="incidentsStore.currentPage >= incidentsStore.totalPages"
          @click="changePage(incidentsStore.currentPage + 1)"
        >
          {{ t("common.next") }}
        </button>
      </nav>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="bg-white rounded-lg border border-neutral-200 p-8 text-center"
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
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <template v-if="hasFilters">
        <h3 class="mt-4 text-lg font-medium text-neutral-900">
          {{ t("incidents.noResults") }}
        </h3>
        <p class="mt-2 text-neutral-500">
          {{ t("incidents.noResultsDescription") }}
        </p>
        <button type="button" class="btn-outline mx-auto mt-4" @click="clearFilters">
          {{ t("incidents.allTypes") }} · {{ t("incidents.allStatuses") }}
        </button>
      </template>
      <template v-else>
        <h3 class="mt-4 text-lg font-medium text-neutral-900">
          {{ t("incidents.noIncidents") }}
        </h3>
        <p class="mt-2 text-neutral-500">
          {{ t("incidents.noIncidentsDescription") }}
        </p>
      </template>
    </div>
  </div>
</template>
