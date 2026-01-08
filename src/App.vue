<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppLayout from './layouts/AppLayout.vue'
import AuthLayout from './layouts/AuthLayout.vue'

const authStore = useAuthStore()
const route = useRoute()

// Track if initial user fetch is complete
const initializing = ref(true)

const isAuthRoute = computed(() => {
  return route.path === '/login' || route.path === '/register' || route.path.startsWith('/invitation/')
})

// Only show app layout when user data is fully loaded
const isReady = computed(() => {
  // Auth routes don't need user data
  if (isAuthRoute.value) return true
  // For protected routes, we need both token AND user data
  return !initializing.value && authStore.isAuthenticated && authStore.user !== null
})

onMounted(async () => {
  if (authStore.token) {
    console.log("App.vue - fetching current user...")
    await authStore.fetchCurrentUser()
    console.log("App.vue - user fetched:", authStore.user)
  }
  initializing.value = false
})

watch(() => authStore.isAuthenticated, (newValue) => {
  if (!newValue && !isAuthRoute.value) {
    // Redirect to login if not authenticated and not on auth page
    window.location.href = '/login'
  }
})
</script>

<template>
  <AuthLayout v-if="isAuthRoute" />
  <AppLayout v-else-if="isReady" />
  <div v-else class="flex justify-center items-center min-h-screen">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
</template>