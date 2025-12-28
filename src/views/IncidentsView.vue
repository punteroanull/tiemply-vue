<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useIncidentsStore } from "../stores/incidents";
import IncidentCard from "../components/IncidentCard.vue";
import type { IncidentType, IncidentStatus } from "../types";

const { t } = useI18n();
const incidentsStore = useIncidentsStore();

const selectedType = ref<IncidentType | "">("");
const selectedStatus = ref<IncidentStatus | "">("");

const filteredIncidents = computed(() => {
  let incidents = incidentsStore.incidents;

  if (selectedType.value) {
    incidents = incidents.filter((i) => i.type === selectedType.value);
  }

  if (selectedStatus.value) {
    incidents = incidents.filter((i) => i.status === selectedStatus.value);
  }

  return incidents;
});

const incidentTypes: { value: IncidentType; label: string }[] = [
  { value: "unclosed_shift", label: "incidents.types.unclosed_shift" },
  { value: "late_arrival", label: "incidents.types.late_arrival" },
  { value: "early_departure", label: "incidents.types.early_departure" },
  { value: "missing_checkout", label: "incidents.types.missing_checkout" },
];

const incidentStatuses: { value: IncidentStatus; label: string }[] = [
  { value: "pending", label: "incidents.statuses.pending" },
  { value: "resolved", label: "incidents.statuses.resolved" },
  { value: "validated", label: "incidents.statuses.validated" },
  { value: "marked_absence", label: "incidents.statuses.marked_absence" },
];

async function loadData() {
  await incidentsStore.fetchIncidents({
    type: selectedType.value || undefined,
    status: selectedStatus.value || undefined,
  });
}

async function applyFilters() {
  await loadData();
}

onMounted(async () => {
  await loadData();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-neutral-800">
        {{ t("incidents.title") }}
      </h1>
      <p
        v-if="incidentsStore.pendingCount > 0"
        class="text-amber-600 mt-1"
      >
        {{ t("incidents.pendingCount", { count: incidentsStore.pendingCount }) }}
      </p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg border border-neutral-200 p-4 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-neutral-700 mb-1">
            {{ t("incidents.filterByType") }}
          </label>
          <select
            v-model="selectedType"
            @change="applyFilters"
            class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">{{ t("incidents.allTypes") }}</option>
            <option
              v-for="type in incidentTypes"
              :key="type.value"
              :value="type.value"
            >
              {{ t(type.label) }}
            </option>
          </select>
        </div>

        <div class="flex-1">
          <label class="block text-sm font-medium text-neutral-700 mb-1">
            {{ t("incidents.filterByStatus") }}
          </label>
          <select
            v-model="selectedStatus"
            @change="applyFilters"
            class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">{{ t("incidents.allStatuses") }}</option>
            <option
              v-for="status in incidentStatuses"
              :key="status.value"
              :value="status.value"
            >
              {{ t(status.label) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-if="incidentsStore.loading"
      class="flex items-center justify-center py-12"
    >
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
      ></div>
    </div>

    <!-- Incidents list -->
    <div v-else-if="filteredIncidents.length > 0" class="space-y-4">
      <IncidentCard
        v-for="incident in filteredIncidents"
        :key="incident.id"
        :incident="incident"
      />
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
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-neutral-900">
        {{ t("incidents.noIncidents") }}
      </h3>
      <p class="mt-2 text-neutral-500">
        {{ t("incidents.noIncidentsDescription") }}
      </p>
    </div>
  </div>
</template>
