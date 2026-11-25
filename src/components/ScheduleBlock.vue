<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatClockTime } from "../utils/apiDates";
import type { ScheduleBlock } from "../types";

const props = defineProps<{
  block: ScheduleBlock;
  compact?: boolean;
}>();

const { t } = useI18n();

// 24-hour clock in every language, like the rest of the app.
const formattedStartTime = computed(() => formatClockTime(props.block.startTime));
const formattedEndTime = computed(() => formatClockTime(props.block.endTime));

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
    <!-- Wraps: in the narrow weekly columns the "next day" chip drops under the time. -->
    <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <span class="font-medium text-primary-700 whitespace-nowrap">
        {{ formattedStartTime }} - {{ formattedEndTime }}
      </span>
      <span
        v-if="block.crossesMidnight"
        class="text-xs text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded"
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
