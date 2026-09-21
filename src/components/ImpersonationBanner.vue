<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { t } = useI18n();

const now = ref(Date.now());
let timer: number | undefined;

onMounted(() => {
  timer = window.setInterval(() => (now.value = Date.now()), 1000);
});

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer);
});

/** Time left before the session expires on its own, as mm:ss. */
const remaining = computed(() => {
  const expiresAt = authStore.impersonation?.expiresAt;
  if (!expiresAt) return null;

  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now.value) / 1000));
  const minutes = Math.floor(seconds / 60);

  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
});

const stopping = ref(false);

async function stop() {
  stopping.value = true;
  await authStore.stopImpersonation();
  stopping.value = false;
}
</script>

<template>
  <div
    v-if="authStore.isImpersonating"
    class="fixed inset-x-0 top-0 z-[60] flex h-10 items-center justify-between gap-3 bg-amber-500 px-4 text-sm text-amber-950 shadow"
    role="alert"
  >
    <p class="truncate">
      <span class="font-semibold">{{ t('impersonation.banner.viewingAs') }}</span>
      {{ authStore.impersonation?.impersonatedName }}
      <span class="hidden sm:inline">({{ authStore.impersonation?.impersonatedEmail }})</span>
    </p>

    <div class="flex shrink-0 items-center gap-3">
      <span
        :class="[
          'rounded px-2 py-0.5 text-xs font-semibold',
          authStore.impersonation?.writesEnabled
            ? 'bg-red-700 text-white'
            : 'bg-amber-700 text-white',
        ]"
      >
        {{ authStore.impersonation?.writesEnabled
          ? t('impersonation.banner.writeEnabled')
          : t('impersonation.banner.readOnly') }}
      </span>

      <span v-if="remaining" class="hidden font-mono text-xs sm:inline">{{ remaining }}</span>

      <button
        type="button"
        class="rounded bg-amber-950 px-3 py-1 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
        :disabled="stopping"
        @click="stop"
      >
        {{ t('impersonation.banner.exit') }}
      </button>
    </div>
  </div>
</template>
