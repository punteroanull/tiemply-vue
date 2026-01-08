<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppLayout from './layouts/AppLayout.vue'
import AuthLayout from './layouts/AuthLayout.vue'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Track if initial user fetch is complete
const initializing = ref(true)
// Track if router has resolved the initial route
const routerReady = ref(false)

const isAuthRoute = computed(() => {
  // Use route.name for more reliable detection (avoids race condition with route.path)
  const authRouteNames = ['login', 'register', 'invitation']
  return authRouteNames.includes(route.name as string)
})

// Only show app layout when user data is fully loaded
const isReady = computed(() => {
  // Wait for router to be ready first
  if (!routerReady.value) return false
  // Auth routes don't need user data
  if (isAuthRoute.value) return true
  // For protected routes, we need both token AND user data
  return !initializing.value && authStore.isAuthenticated && authStore.user !== null
})

onMounted(async () => {
  console.log("App.vue - onMounted started")
  console.log("App.vue - waiting for router.isReady()...")

  // Wait for router to be ready before doing anything
  await router.isReady()

  console.log("App.vue - router is ready!")
  console.log("App.vue - route.name:", route.name)
  console.log("App.vue - route.path:", route.path)

  routerReady.value = true

  if (authStore.token) {
    console.log("App.vue - fetching current user...")
    await authStore.fetchCurrentUser()
    console.log("App.vue - user fetched:", authStore.user)
  }
  initializing.value = false
  console.log("App.vue - initialization complete, isAuthRoute:", isAuthRoute.value)
})

watch(() => authStore.isAuthenticated, (newValue) => {
  // Only redirect after router is ready to avoid race conditions
  if (!newValue && routerReady.value && !isAuthRoute.value) {
    // Redirect to login if not authenticated and not on auth page
    window.location.href = '/login'
  }
})
</script>

<template>
  <!-- Show spinner while router is initializing -->
  <div v-if="!routerReady" class="flex justify-center items-center min-h-screen">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
  <AuthLayout v-else-if="isAuthRoute" />
  <AppLayout v-else-if="isReady" />
  <div v-else class="flex justify-center items-center min-h-screen">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
</template>