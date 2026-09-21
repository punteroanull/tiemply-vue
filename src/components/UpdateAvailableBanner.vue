<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { applyUpdate, needRefresh } from '@/services/pwaUpdate';

const { t } = useI18n();
const updating = ref(false);

async function update() {
  updating.value = true;
  await applyUpdate();
}
</script>

<template>
  <!-- Bottom, not top: the impersonation banner owns the top edge, and this must never
       cover the clock-in button at bottom-right. -->
  <div
    v-if="needRefresh"
    class="fixed bottom-4 left-4 z-[70] max-w-sm rounded-lg bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg"
    role="status"
  >
    <p class="font-medium">{{ t('pwa.updateAvailable.title') }}</p>
    <p class="mt-1 text-neutral-300">{{ t('pwa.updateAvailable.body') }}</p>

    <button
      type="button"
      class="mt-3 rounded bg-white px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-200 disabled:opacity-50"
      :disabled="updating"
      @click="update"
    >
      {{ updating ? t('pwa.updateAvailable.updating') : t('pwa.updateAvailable.action') }}
    </button>
  </div>
</template>
