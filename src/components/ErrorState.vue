<script setup lang="ts">
// Shown when a fetch failed, so a failure never looks like "there is no data".
defineProps<{
  message?: string
  retrying?: boolean
}>()

defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <div class="card text-center py-10" role="alert">
    <svg
      class="mx-auto h-10 w-10 text-error"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    </svg>
    <p class="mt-3 font-medium text-neutral-800">{{ message || $t('common.loadError') }}</p>
    <p class="mt-1 text-sm text-neutral-500">{{ $t('common.loadErrorHint') }}</p>
    <button
      type="button"
      class="btn-outline mx-auto mt-4"
      :disabled="retrying"
      @click="$emit('retry')"
    >
      {{ $t('common.retry') }}
    </button>
  </div>
</template>
