<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';

const { locale, t } = useI18n();
const authStore = useAuthStore();

const languages = [
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'es', name: 'Espanol', flag: 'ES' }
];

async function changeLanguage(langCode: string) {
  locale.value = langCode;
  await authStore.updateLocale(langCode);
}
</script>

<template>
  <div class="py-1">
    <span class="block px-4 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider">
      {{ t('nav.language') }}
    </span>
    <button
      v-for="lang in languages"
      :key="lang.code"
      @click="changeLanguage(lang.code)"
      class="w-full flex items-center px-4 py-2 text-sm transition-colors"
      :class="locale === lang.code
        ? 'bg-primary-50 text-primary-700'
        : 'text-neutral-700 hover:bg-neutral-100'"
    >
      <span class="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium mr-3">
        {{ lang.flag }}
      </span>
      <span>{{ lang.name }}</span>
      <svg
        v-if="locale === lang.code"
        class="ml-auto h-4 w-4 text-primary-600"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>
