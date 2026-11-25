<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatApiDate, formatClockTime } from "../utils/apiDates";
import type { Incident, IncidentType, IncidentStatus } from "../types";

const props = defineProps<{
  incident: Incident;
}>();

const { t, te } = useI18n();

// The API date is the instant of Madrid midnight; formatApiDate recovers the calendar day.
const formattedDate = computed(
  () => formatApiDate(props.incident.date, "PPP") || props.incident.date
);

const typeLabel = computed(() => {
  const key = `incidents.types.${props.incident.type}`;
  return te(key) ? t(key) : t("common.unknown");
});

const statusLabel = computed(() => {
  const key = `incidents.statuses.${props.incident.status}`;
  return te(key) ? t(key) : t("common.unknown");
});

const statusBadgeClass = computed(() => {
  const classes: Record<IncidentStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    resolved: "bg-green-100 text-green-800",
    validated: "bg-blue-100 text-blue-800",
    marked_absence: "bg-red-100 text-red-800",
  };
  return classes[props.incident.status] || "bg-neutral-100 text-neutral-700";
});

const typeIconClass = computed(() => {
  const classes: Record<IncidentType, string> = {
    unclosed_shift: "text-amber-500",
    late_arrival: "text-orange-500",
    early_departure: "text-blue-500",
    missing_checkout: "text-red-500",
    manual_adjustment: "text-neutral-500",
  };
  return classes[props.incident.type] || "text-neutral-500";
});

// A different shape per type, so the type is not told apart by colour alone.
const typeIconPath = computed(() => {
  const paths: Record<IncidentType, string> = {
    // lock open: the shift was left open
    unclosed_shift:
      "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
    // clock: arrived late
    late_arrival: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    // arrow leaving: left early
    early_departure:
      "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9",
    // question mark: no check-out recorded
    missing_checkout:
      "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z",
    // pencil: adjusted by hand
    manual_adjustment:
      "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125",
  };
  return paths[props.incident.type] || paths.missing_checkout;
});

function formatTime(time: string | undefined): string {
  return formatClockTime(time) || "-";
}

// Only ever a name: `resolvedBy` is a user id and must not reach the screen.
const resolverName = computed(() => props.incident.resolver?.name || "");

const isResolved = computed(() => props.incident.status !== "pending");
</script>

<template>
  <div class="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3 min-w-0">
        <!-- Type icon -->
        <div
          class="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
            :class="typeIconClass"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" :d="typeIconPath" />
          </svg>
        </div>

        <div class="min-w-0">
          <h3 class="font-medium text-neutral-900">{{ typeLabel }}</h3>
          <p class="text-sm text-neutral-500">{{ formattedDate }}</p>
        </div>
      </div>

      <span
        :class="statusBadgeClass"
        class="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium"
      >
        {{ statusLabel }}
      </span>
    </div>

    <!-- Time details -->
    <div
      v-if="incident.expectedTime || incident.actualTime || incident.resolvedTime"
      class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm"
    >
      <div v-if="incident.expectedTime">
        <span class="text-neutral-500">{{ t("incidents.expectedTime") }}:</span>
        <span class="ml-1 font-medium">{{ formatTime(incident.expectedTime) }}</span>
      </div>
      <div v-if="incident.actualTime">
        <span class="text-neutral-500">{{ t("incidents.actualTime") }}:</span>
        <span class="ml-1 font-medium">{{ formatTime(incident.actualTime) }}</span>
      </div>
      <div v-if="incident.resolvedTime">
        <span class="text-neutral-500">{{ t("incidents.resolvedTime") }}:</span>
        <span class="ml-1 font-medium">{{ formatTime(incident.resolvedTime) }}</span>
      </div>
    </div>

    <!-- Resolution info -->
    <div
      v-if="isResolved && (resolverName || incident.notes)"
      class="mt-3 pt-3 border-t border-neutral-100 text-sm"
    >
      <div v-if="resolverName" class="flex items-center gap-2 text-neutral-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="w-4 h-4 text-green-500"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>
        <span>{{ t("incidents.resolvedBy") }}: {{ resolverName }}</span>
      </div>
      <p v-if="incident.notes" class="mt-2 text-neutral-500 text-xs">
        <span class="font-medium">{{ t("incidents.resolutionNotes") }}:</span>
        {{ incident.notes }}
      </p>
    </div>
  </div>
</template>
