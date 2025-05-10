<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute()
const isLoginPage = route.path === '/login'
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-semibold text-primary-600">WorkTracker</h1>
        <p class="text-neutral-600 mt-2">Employee Time Management System</p>
      </div>
      
      <div class="bg-white shadow-subtle rounded-lg p-8">
        <router-view />
      </div>
      
      <div class="mt-4 text-center text-sm text-neutral-500">
        <template v-if="isLoginPage">
          Don't have an account? 
          <router-link to="/register" class="text-primary-600 hover:text-primary-700">
            Register
          </router-link>
        </template>
        <template v-else>
          Already have an account?
          <router-link to="/login" class="text-primary-600 hover:text-primary-700">
            Login
          </router-link>
        </template>
      </div>
    </div>
  </div>
</template>