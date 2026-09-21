<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const failed = ref(false);

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : null;

  // Strip the code from the address bar and from history before anything else: it is a
  // credential, however short lived.
  await router.replace({ path: '/impersonate' });

  if (!code) {
    failed.value = true;
    return;
  }

  const ok = await authStore.redeemImpersonation(code);

  if (ok) {
    await router.replace({ name: 'dashboard' });
    return;
  }

  failed.value = true;
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
    <div class="text-center">
      <template v-if="!failed">
        <div
          class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-primary-600"
          role="status"
          aria-live="polite"
        />
        <p class="mt-4 text-sm text-neutral-600">{{ t('impersonation.landing.loading') }}</p>
      </template>

      <template v-else>
        <p class="text-base font-medium text-neutral-900">{{ t('impersonation.landing.failedTitle') }}</p>
        <p class="mt-2 text-sm text-neutral-600">{{ t('impersonation.landing.failedBody') }}</p>
      </template>
    </div>
  </div>
</template>
