<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { ScheduleBlock } from "../types";

const props = defineProps<{
  block: ScheduleBlock;
  compact?: boolean;
}>();

const { t } = useI18n();

const formattedStartTime = computed(() => {
  return formatTime(props.block.startTime);
});

const formattedEndTime = computed(() => {
  return formatTime(props.block.endTime);
});

function formatTime(time: string): string {
  // Assuming time is in HH:mm:ss or HH:mm format
  const parts = time.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

const blockClass = computed(() => {
  return props.compact
    ? "px-2 py-1 text-xs"
    : "px-3 py-2 text-sm";
});
</script>

<template>
  <div
    :class="[
      'bg-primary-50 border border-primary-200 rounded-md',
      blockClass,
    ]"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="font-medium text-primary-700">
        {{ formattedStartTime }} - {{ formattedEndTime }}
      </span>
      <span
        v-if="block.crossesMidnight"
        class="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded"
      >
        {{ t("schedule.nextDay") }}
      </span>
    </div>
    <div
      v-if="!compact && block.order > 1"
      class="text-xs text-neutral-500 mt-1"
    >
      {{ t("schedule.block") }} {{ block.order }}
    </div>
  </div>
</template>
