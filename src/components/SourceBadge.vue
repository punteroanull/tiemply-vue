<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { WorkLogSource } from '../types';

const { t } = useI18n();

const props = defineProps<{
  source?: WorkLogSource | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}>();

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'px-1.5 py-0.5 text-xs';
    case 'lg': return 'px-3 py-1.5 text-base';
    default: return 'px-2 py-1 text-sm';
  }
});

const iconSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-3 w-3';
    case 'lg': return 'h-5 w-5';
    default: return 'h-4 w-4';
  }
});

const sourceConfig = computed(() => {
  switch (props.source) {
    case 'web':
      return {
        label: t('workLogs.sourceTypes.web'),
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
        textClass: 'text-blue-700 dark:text-blue-400',
        icon: 'computer'
      };
    case 'mobile':
      return {
        label: t('workLogs.sourceTypes.mobile'),
        bgClass: 'bg-purple-100 dark:bg-purple-900/30',
        textClass: 'text-purple-700 dark:text-purple-400',
        icon: 'smartphone'
      };
    case 'nfc':
      return {
        label: t('workLogs.sourceTypes.nfc'),
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        textClass: 'text-green-700 dark:text-green-400',
        icon: 'contactless'
      };
    case 'manual':
      return {
        label: t('workLogs.sourceTypes.manual'),
        bgClass: 'bg-amber-100 dark:bg-amber-900/30',
        textClass: 'text-amber-700 dark:text-amber-400',
        icon: 'pencil'
      };
    default:
      return null;
  }
});
</script>

<template>
  <span
    v-if="source && sourceConfig"
    :class="[
      'inline-flex items-center gap-1 rounded-full font-medium',
      sizeClasses,
      sourceConfig.bgClass,
      sourceConfig.textClass
    ]"
    :title="sourceConfig.label"
  >
    <!-- Web icon (monitor/computer) -->
    <svg v-if="sourceConfig.icon === 'computer'" :class="iconSize" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>

    <!-- Mobile icon (smartphone) -->
    <svg v-else-if="sourceConfig.icon === 'smartphone'" :class="iconSize" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>

    <!-- NFC icon (contactless/wifi) -->
    <svg v-else-if="sourceConfig.icon === 'contactless'" :class="iconSize" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>

    <!-- Manual icon (pencil) -->
    <svg v-else-if="sourceConfig.icon === 'pencil'" :class="iconSize" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>

    <span v-if="showLabel">{{ sourceConfig.label }}</span>
  </span>
</template>
