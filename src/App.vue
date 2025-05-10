<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppLayout from './layouts/AppLayout.vue'
import AuthLayout from './layouts/AuthLayout.vue'

const authStore = useAuthStore()
const route = useRoute()

const isAuthRoute = computed(() => {
  return route.path === '/login' || route.path === '/register'
})

onMounted(async () => {
  if (authStore.token) {
    await authStore.fetchCurrentUser()
  }
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
  <AppLayout v-else-if="authStore.isAuthenticated" />
  <div v-else class="flex justify-center items-center min-h-screen">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
</template>