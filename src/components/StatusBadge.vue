<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { WorkState } from '../types';

const { t } = useI18n();

const props = defineProps<{
  state: WorkState;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}>();

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'px-2 py-0.5 text-xs';
    case 'lg': return 'px-4 py-2 text-base';
    default: return 'px-3 py-1 text-sm';
  }
});

const stateConfig = computed(() => {
  switch (props.state) {
    case 'working':
      return {
        label: t('workStatus.working'),
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        textClass: 'text-green-700 dark:text-green-400',
        borderClass: 'border-green-300 dark:border-green-700',
        dotClass: 'bg-green-500',
        icon: '✓'
      };
    case 'on_break':
      return {
        label: t('workStatus.onBreak'),
        bgClass: 'bg-amber-100 dark:bg-amber-900/30',
        textClass: 'text-amber-700 dark:text-amber-400',
        borderClass: 'border-amber-300 dark:border-amber-700',
        dotClass: 'bg-amber-500',
        icon: '☕'
      };
    case 'offsite':
      return {
        label: t('workStatus.offsite'),
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
        textClass: 'text-blue-700 dark:text-blue-400',
        borderClass: 'border-blue-300 dark:border-blue-700',
        dotClass: 'bg-blue-500',
        icon: '📍'
      };
    default:
      return {
        label: t('workStatus.notWorking'),
        bgClass: 'bg-gray-100 dark:bg-gray-800',
        textClass: 'text-gray-600 dark:text-gray-400',
        borderClass: 'border-gray-300 dark:border-gray-600',
        dotClass: 'bg-gray-400',
        icon: '○'
      };
  }
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      sizeClasses,
      stateConfig.bgClass,
      stateConfig.textClass,
      stateConfig.borderClass
    ]"
  >
    <span
      v-if="!showIcon"
      :class="['w-2 h-2 rounded-full animate-pulse', stateConfig.dotClass]"
    />
    <span v-else class="text-xs">{{ stateConfig.icon }}</span>
    {{ stateConfig.label }}
  </span>
</template>
