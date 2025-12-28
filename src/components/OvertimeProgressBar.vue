<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  totalHours: number;
  annualLimit: number;
  showLabel?: boolean;
}>();

const { t } = useI18n();

const percentage = computed(() => {
  if (!props.annualLimit) return 0;
  return Math.min(Math.round((props.totalHours / props.annualLimit) * 100), 100);
});

const isNearLimit = computed(() => percentage.value >= 80);
const isAtLimit = computed(() => percentage.value >= 100);

const progressColor = computed(() => {
  if (isAtLimit.value) return "bg-red-500";
  if (isNearLimit.value) return "bg-amber-500";
  return "bg-primary-500";
});

const textColor = computed(() => {
  if (isAtLimit.value) return "text-red-600";
  if (isNearLimit.value) return "text-amber-600";
  return "text-primary-600";
});
</script>

<template>
  <div class="w-full">
    <div
      v-if="showLabel"
      class="flex justify-between items-center mb-1 text-sm"
    >
      <span class="text-neutral-600">
        {{ totalHours }}h / {{ annualLimit }}h
      </span>
      <span :class="textColor" class="font-medium">
        {{ t("overtime.percentageUsed", { percentage }) }}
      </span>
    </div>
    <div class="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
      <div
        :class="progressColor"
        class="h-2.5 rounded-full transition-all duration-300"
        :style="{ width: `${percentage}%` }"
      ></div>
    </div>
    <p
      v-if="isNearLimit && !isAtLimit"
      class="mt-1 text-xs text-amber-600"
    >
      {{ t("overtime.nearLimit") }}
    </p>
    <p
      v-if="isAtLimit"
      class="mt-1 text-xs text-red-600"
    >
      {{ t("overtime.atLimit") }}
    </p>
  </div>
</template>
