<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatHoursAsDuration } from "../utils/apiDates";

const props = defineProps<{
  /** Hours that count against the limit (approved overtime). */
  usedHours: number;
  /** Annual limit in hours. Zero or less means the company set no limit. */
  annualLimit: number;
  showLabel?: boolean;
}>();

const { t } = useI18n();

const hasLimit = computed(() => props.annualLimit > 0);

const percentage = computed(() => {
  if (!hasLimit.value) return 0;
  const value = Math.round((props.usedHours / props.annualLimit) * 100);
  return Math.max(0, Math.min(value, 100));
});

const isNearLimit = computed(() => hasLimit.value && percentage.value >= 80);
const isAtLimit = computed(() => hasLimit.value && percentage.value >= 100);

const progressColor = computed(() => {
  if (isAtLimit.value) return "bg-red-500";
  if (isNearLimit.value) return "bg-amber-500";
  return "bg-primary-500";
});

const textColor = computed(() => {
  if (isAtLimit.value) return "text-red-700";
  if (isNearLimit.value) return "text-amber-700";
  return "text-primary-700";
});

const valueText = computed(
  () =>
    `${formatHoursAsDuration(props.usedHours)} / ${formatHoursAsDuration(props.annualLimit)}`
);
</script>

<template>
  <div class="w-full">
    <p v-if="!hasLimit" class="text-sm text-neutral-500">
      {{ t("overtime.noLimit") }}
    </p>
    <template v-else>
      <div
        v-if="showLabel"
        class="flex justify-between items-center mb-1 text-sm"
      >
        <span class="text-neutral-600">{{ valueText }}</span>
        <span :class="textColor" class="font-medium">
          {{ t("overtime.percentageUsed", { percentage }) }}
        </span>
      </div>
      <div
        class="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden"
        role="progressbar"
        :aria-label="t('overtime.limitProgress')"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="percentage"
        :aria-valuetext="`${valueText} (${t('overtime.percentageUsed', { percentage })})`"
      >
        <div
          :class="progressColor"
          class="h-2.5 rounded-full transition-all duration-300"
          :style="{ width: `${percentage}%` }"
        ></div>
      </div>
      <p
        v-if="isNearLimit && !isAtLimit"
        class="mt-1 text-xs text-amber-700"
      >
        {{ t("overtime.nearLimit") }}
      </p>
      <p
        v-if="isAtLimit"
        class="mt-1 text-xs text-red-700"
      >
        {{ t("overtime.atLimit") }}
      </p>
    </template>
  </div>
</template>
