<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, setAppLocale } from '../i18n'

const { locale, t } = useI18n()

const LANGUAGE_NAMES: Record<string, string> = { es: 'Español', en: 'English' }

// Nobody is signed in here, so the choice is only remembered on this device.
function chooseLanguage(code: string) {
  setAppLocale(code, { persist: true })
}
</script>

<template>
  <div
    class="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4"
  >
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-semibold text-primary-600">Tiemply</h1>
        <p class="text-neutral-600 mt-2">{{ t('auth.tagline') }}</p>
      </div>

      <main class="bg-white shadow-subtle rounded-lg p-6 sm:p-8">
        <router-view />
      </main>

      <div
        class="mt-6 flex justify-center gap-2 text-sm"
        role="group"
        :aria-label="t('nav.language')"
      >
        <button
          v-for="code in SUPPORTED_LOCALES"
          :key="code"
          type="button"
          :lang="code"
          :aria-pressed="locale === code"
          class="px-3 py-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="locale === code
            ? 'text-primary-700 font-medium bg-primary-50'
            : 'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100'"
          @click="chooseLanguage(code)"
        >
          {{ LANGUAGE_NAMES[code] }}
        </button>
      </div>
    </div>
  </div>
</template>
