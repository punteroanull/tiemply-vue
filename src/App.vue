<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import UpdateAvailableBanner from './components/UpdateAvailableBanner.vue';
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppLayout from './layouts/AppLayout.vue'
import AuthLayout from './layouts/AuthLayout.vue'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Track if router has resolved the initial route
const routerReady = ref(false)
const retrying = ref(false)

// Use route.name for detection (avoids a race condition with route.path)
const AUTH_ROUTES = ['login', 'forgot-password', 'reset-password', 'invitation']

const isAuthRoute = computed(() => AUTH_ROUTES.includes(route.name as string))

/**
 * Pages that render on their own, with no layout and no session:
 * - the impersonation handoff, which usually arrives in a browser with no session at all
 *   and has 60 seconds to redeem its code;
 * - the "not found" page for a visitor who is not signed in.
 * Both used to sit behind the authenticated layout and showed a spinner forever.
 */
const isStandaloneRoute = computed(
  () =>
    route.name === 'impersonate' ||
    (route.name === 'not-found' && !authStore.isAuthenticated)
)

const needsSession = computed(() => !isAuthRoute.value && !isStandaloneRoute.value)

onMounted(async () => {
  // Wait for router to be ready before doing anything
  await router.isReady()
  routerReady.value = true

  // The router guard has normally loaded the user already; this covers the routes it
  // lets through untouched. The handoff page redeems its own session, so a stale token
  // must not be checked (and bounced to the login page) before it gets the chance.
  if (authStore.token && !authStore.user && !authStore.userLoadFailed && route.name !== 'impersonate') {
    await authStore.fetchCurrentUser()
  }
})

watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  // The session ended (sign-out, or the token was rejected). Leaving for the admin panel
  // is a navigation of its own and must not be overridden.
  if (!isAuthenticated && routerReady.value && needsSession.value && !authStore.leavingApp) {
    router.replace({ name: 'login' })
  }
})

async function retry() {
  retrying.value = true
  await authStore.fetchCurrentUser()
  retrying.value = false
}

async function signOut() {
  await authStore.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <UpdateAvailableBanner />

  <!-- Show spinner while router is initializing -->
  <div v-if="!routerReady" class="flex justify-center items-center min-h-screen" role="status">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    <span class="sr-only">{{ $t('common.loading') }}</span>
  </div>
  <AuthLayout v-else-if="isAuthRoute" />
  <router-view v-else-if="isStandaloneRoute" />
  <AppLayout v-else-if="authStore.isAuthenticated && authStore.user" />

  <!-- /me failed but the token is still good (offline, server error): say so and offer a
       way forward instead of spinning forever. -->
  <div
    v-else-if="authStore.isAuthenticated && authStore.userLoadFailed"
    class="flex justify-center items-center min-h-screen bg-neutral-50 p-4"
  >
    <div class="w-full max-w-sm bg-white shadow-subtle rounded-lg p-8 text-center" role="alert">
      <svg class="mx-auto h-10 w-10 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <h1 class="mt-4 text-lg font-semibold text-neutral-900">{{ $t('auth.sessionLoadFailedTitle') }}</h1>
      <p class="mt-2 text-sm text-neutral-600">{{ $t('auth.sessionLoadFailedBody') }}</p>
      <button type="button" class="btn-primary w-full mt-6" :disabled="retrying" @click="retry">
        {{ retrying ? $t('common.loading') : $t('common.retry') }}
      </button>
      <button type="button" class="btn-outline w-full mt-3" :disabled="retrying" @click="signOut">
        {{ $t('nav.signOut') }}
      </button>
    </div>
  </div>

  <div v-else class="flex justify-center items-center min-h-screen" role="status">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    <span class="sr-only">{{ $t('common.loading') }}</span>
  </div>
</template>
