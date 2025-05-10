<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const errors = ref<Record<string, string>>({})

async function handleSubmit() {
  errors.value = {}
  
  // Basic validation
  if (!email.value) {
    errors.value.email = 'Email is required'
  }
  if (!password.value) {
    errors.value.password = 'Password is required'
  }
  
  if (Object.keys(errors.value).length > 0) {
    return
  }
  
  const success = await authStore.login({
    email: email.value,
    password: password.value
  })
  
  if (success) {
    router.push('/')
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-semibold text-neutral-800 mb-6">Sign in to your account</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label for="email" class="label">Email</label>
        <input 
          id="email" 
          v-model="email" 
          type="email" 
          class="input"
          :class="{ 'border-error focus:border-error focus:ring-error': errors.email }"
          autocomplete="email"
          placeholder="your.email@example.com"
        />
        <p v-if="errors.email" class="error-text">{{ errors.email }}</p>
      </div>
      
      <div class="mb-6">
        <label for="password" class="label">Password</label>
        <input 
          id="password" 
          v-model="password" 
          type="password" 
          class="input"
          :class="{ 'border-error focus:border-error focus:ring-error': errors.password }"
          autocomplete="current-password"
          placeholder="••••••••"
        />
        <p v-if="errors.password" class="error-text">{{ errors.password }}</p>
      </div>
      
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <input 
            id="remember-me" 
            v-model="rememberMe" 
            type="checkbox" 
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
          />
          <label for="remember-me" class="ml-2 block text-sm text-neutral-700">
            Remember me
          </label>
        </div>
        
        <a href="#" class="text-sm text-primary-600 hover:text-primary-700">
          Forgot your password?
        </a>
      </div>
      
      <div>
        <button 
          type="submit" 
          class="w-full btn-primary h-11"
          :disabled="authStore.loading"
        >
          <template v-if="authStore.loading">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          </template>
          <template v-else>
            Sign in
          </template>
        </button>
      </div>
    </form>
  </div>
</template>