<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

// Rendered inside the app layout when signed in, and on its own otherwise, so it sizes
// itself to its container instead of forcing a full extra screen of height.
const authStore = useAuthStore()
</script>

<template>
  <div
    class="flex items-center justify-center px-4"
    :class="authStore.isAuthenticated ? 'min-h-[60vh]' : 'min-h-screen bg-neutral-50'"
  >
    <div class="text-center">
      <p class="text-6xl font-bold text-primary-600 mb-4" aria-hidden="true">404</p>
      <h1 class="text-xl font-semibold text-neutral-900 mb-2">{{ $t('messages.pageNotFound') }}</h1>
      <p class="text-neutral-600 mb-8">{{ $t('messages.pageNotFoundBody') }}</p>
      <router-link to="/" class="btn-primary inline-flex">
        {{ $t('messages.backToHome') }}
      </router-link>
    </div>
  </div>
</template>
