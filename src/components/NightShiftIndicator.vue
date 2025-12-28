<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="inline-flex items-center gap-1.5"
    :class="{
      'text-xs': size === 'sm',
      'text-sm': size === 'md' || !size,
      'text-base': size === 'lg',
    }"
  >
    <!-- Moon icon -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="text-purple-500"
      :class="{
        'w-3.5 h-3.5': size === 'sm',
        'w-4 h-4': size === 'md' || !size,
        'w-5 h-5': size === 'lg',
      }"
    >
      <path
        fill-rule="evenodd"
        d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
        clip-rule="evenodd"
      />
    </svg>
    <span
      v-if="showLabel"
      class="text-purple-600 font-medium"
    >
      {{ t("workLog.nightShift") }}
    </span>
  </div>
</template>
