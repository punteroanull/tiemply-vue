<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const errors = ref<Record<string, string>>({})

async function handleSubmit() {
  errors.value = {}
  
  // Basic validation
  if (!name.value) {
    errors.value.name = 'Name is required'
  }
  if (!email.value) {
    errors.value.email = 'Email is required'
  }
  if (!password.value) {
    errors.value.password = 'Password is required'
  } else if (password.value.length < 8) {
    errors.value.password = 'Password must be at least 8 characters'
  }
  if (password.value !== passwordConfirmation.value) {
    errors.value.passwordConfirmation = 'Passwords do not match'
  }
  
  if (Object.keys(errors.value).length > 0) {
    return
  }
  
  const success = await authStore.register({
    name: name.value,
    email: email.value,
    password: password.value,
    password_confirmation: passwordConfirmation.value
  })
  
  if (success) {
    router.push('/')
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-semibold text-neutral-800 mb-6">Create an account</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label for="name" class="label">Full name</label>
        <input 
          id="name" 
          v-model="name" 
          type="text" 
          class="input"
          :class="{ 'border-error focus:border-error focus:ring-error': errors.name }"
          autocomplete="name"
          placeholder="Your full name"
        />
        <p v-if="errors.name" class="error-text">{{ errors.name }}</p>
      </div>
      
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
      
      <div class="mb-4">
        <label for="password" class="label">Password</label>
        <input 
          id="password" 
          v-model="password" 
          type="password" 
          class="input"
          :class="{ 'border-error focus:border-error focus:ring-error': errors.password }"
          autocomplete="new-password"
          placeholder="••••••••"
        />
        <p v-if="errors.password" class="error-text">{{ errors.password }}</p>
      </div>
      
      <div class="mb-6">
        <label for="password-confirmation" class="label">Confirm password</label>
        <input 
          id="password-confirmation" 
          v-model="passwordConfirmation" 
          type="password" 
          class="input"
          :class="{ 'border-error focus:border-error focus:ring-error': errors.passwordConfirmation }"
          autocomplete="new-password"
          placeholder="••••••••"
        />
        <p v-if="errors.passwordConfirmation" class="error-text">{{ errors.passwordConfirmation }}</p>
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
            Creating account...
          </template>
          <template v-else>
            Create account
          </template>
        </button>
      </div>
    </form>
  </div>
</template>