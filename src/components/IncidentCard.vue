<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { format, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";
import type { Incident, IncidentType, IncidentStatus } from "../types";

const props = defineProps<{
  incident: Incident;
}>();

const { t, locale } = useI18n();

const dateLocale = computed(() => (locale.value === "es" ? es : enUS));

const formattedDate = computed(() => {
  try {
    return format(parseISO(props.incident.date), "PPP", {
      locale: dateLocale.value,
    });
  } catch {
    return props.incident.date;
  }
});

const typeLabel = computed(() => {
  const types: Record<IncidentType, string> = {
    unclosed_shift: t("incidents.types.unclosed_shift"),
    late_arrival: t("incidents.types.late_arrival"),
    early_departure: t("incidents.types.early_departure"),
    missing_checkout: t("incidents.types.missing_checkout"),
  };
  return types[props.incident.type] || props.incident.type;
});

const statusLabel = computed(() => {
  const statuses: Record<IncidentStatus, string> = {
    pending: t("incidents.statuses.pending"),
    resolved: t("incidents.statuses.resolved"),
    validated: t("incidents.statuses.validated"),
    marked_absence: t("incidents.statuses.marked_absence"),
  };
  return statuses[props.incident.status] || props.incident.status;
});

const statusBadgeClass = computed(() => {
  const classes: Record<IncidentStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    resolved: "bg-green-100 text-green-700",
    validated: "bg-blue-100 text-blue-700",
    marked_absence: "bg-red-100 text-red-700",
  };
  return classes[props.incident.status] || "bg-neutral-100 text-neutral-700";
});

const typeIconClass = computed(() => {
  const classes: Record<IncidentType, string> = {
    unclosed_shift: "text-amber-500",
    late_arrival: "text-orange-500",
    early_departure: "text-blue-500",
    missing_checkout: "text-red-500",
  };
  return classes[props.incident.type] || "text-neutral-500";
});

function formatTime(time: string | undefined): string {
  if (!time) return "-";
  try {
    const parts = time.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] || "00";
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
}
</script>

<template>
  <div class="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <!-- Type icon -->
        <div
          class="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-5 h-5"
            :class="typeIconClass"
          >
            <path
              fill-rule="evenodd"
              d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clip-rule="evenodd"
            />
          </svg>
        </div>

        <div>
          <h3 class="font-medium text-neutral-900">{{ typeLabel }}</h3>
          <p class="text-sm text-neutral-500">{{ formattedDate }}</p>
        </div>
      </div>

      <span
        :class="statusBadgeClass"
        class="px-2.5 py-1 rounded-full text-xs font-medium"
      >
        {{ statusLabel }}
      </span>
    </div>

    <!-- Time details -->
    <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
      <div v-if="incident.expectedTime">
        <span class="text-neutral-500">{{ t("incidents.expectedTime") }}:</span>
        <span class="ml-1 font-medium">{{ formatTime(incident.expectedTime) }}</span>
      </div>
      <div v-if="incident.actualTime">
        <span class="text-neutral-500">{{ t("incidents.actualTime") }}:</span>
        <span class="ml-1 font-medium">{{ formatTime(incident.actualTime) }}</span>
      </div>
    </div>

    <!-- Resolution info -->
    <div
      v-if="incident.status !== 'pending' && incident.resolvedBy"
      class="mt-3 pt-3 border-t border-neutral-100 text-sm"
    >
      <div class="flex items-center gap-2 text-neutral-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="w-4 h-4 text-green-500"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>
        <span>{{ t("incidents.resolvedBy") }}: {{ incident.resolvedBy }}</span>
      </div>
      <p v-if="incident.notes" class="mt-2 text-neutral-500 text-xs">
        {{ incident.notes }}
      </p>
    </div>
  </div>
</template>
