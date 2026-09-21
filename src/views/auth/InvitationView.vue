<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import api from '../../services/api'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const token = route.params.token as string

// Invitation data from API
const invitation = ref<{
  firstName: string
  lastName: string
  email: string
  company: { id: string; name: string }
  expiresAt: string
} | null>(null)

// Form fields
const password = ref('')
const passwordConfirmation = ref('')
const identificationNumber = ref('')
const birthDate = ref('')
const phone = ref('')
const address = ref('')

// State
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const errors = ref<Record<string, string>>({})

async function loadInvitation() {
  try {
    loading.value = true
    error.value = ''
    console.log('Loading invitation with token:', token)
    const response = await api.get(`/invitations/${token}`)
    console.log('API response:', response.data)
    invitation.value = response.data.data.invitation
  } catch (err: any) {
    console.error('Error loading invitation:', err)
    if (err.response?.status === 410) {
      error.value = err.response.data.message || t('invitation.expiredOrUsed')
    } else if (err.response?.status === 404) {
      error.value = t('invitation.notFound')
    } else {
      error.value = t('invitation.loadError')
    }
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  errors.value = {}

  // Validation
  if (!password.value) {
    errors.value.password = t('auth.validation.passwordRequired')
  } else if (password.value.length < 8) {
    errors.value.password = t('auth.validation.passwordMin')
  }
  if (password.value !== passwordConfirmation.value) {
    errors.value.passwordConfirmation = t('auth.validation.passwordMismatch')
  }

  if (Object.keys(errors.value).length > 0) {
    return
  }

  try {
    submitting.value = true
    const response = await api.post(`/invitations/${token}/complete`, {
      password: password.value,
      password_confirmation: passwordConfirmation.value,
      identification_number: identificationNumber.value || null,
      birth_date: birthDate.value || null,
      phone: phone.value || null,
      address: address.value || null
    })

    // Store the token and redirect to dashboard.
    // The store's token ref has to be set too: fetchCurrentUser() returns early when it is
    // empty, and writing to localStorage alone does not update it.
    const authToken = response.data.data.token
    localStorage.setItem('token', authToken)
    authStore.token = authToken
    await authStore.fetchCurrentUser()
    router.push('/')
  } catch (err: any) {
    if (err.response?.data?.errors) {
      // Map validation errors
      const apiErrors = err.response.data.errors
      for (const [key, value] of Object.entries(apiErrors)) {
        errors.value[key] = Array.isArray(value) ? value[0] : String(value)
      }
    } else {
      error.value = err.response?.data?.message || t('invitation.completeError')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  console.log("InvitationView - onMounted, token:", token)
  loadInvitation()
})
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-8">
      <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <!-- Error state -->
    <div v-else-if="error && !invitation" class="text-center py-8">
      <div class="mb-4">
        <svg class="mx-auto h-12 w-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-neutral-800 mb-2">{{ $t('invitation.invalidTitle') }}</h2>
      <p class="text-neutral-600 mb-6">{{ error }}</p>
      <router-link to="/login" class="btn-primary">
        {{ $t('invitation.goToLogin') }}
      </router-link>
    </div>

    <!-- Invitation form -->
    <div v-else-if="invitation">
      <h2 class="text-2xl font-semibold text-neutral-800 mb-2">{{ $t('invitation.title') }}</h2>
      <p class="text-neutral-600 mb-6">
        {{ $t('invitation.welcomeMessage', { company: invitation.company.name }) }}
      </p>

      <!-- General error -->
      <div v-if="error" class="mb-4 p-3 bg-error/10 border border-error rounded-lg text-error text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit">
        <!-- Read-only fields from invitation -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="label">{{ $t('invitation.firstName') }}</label>
            <input
              type="text"
              :value="invitation.firstName"
              class="input bg-neutral-100"
              readonly
            />
          </div>
          <div>
            <label class="label">{{ $t('invitation.lastName') }}</label>
            <input
              type="text"
              :value="invitation.lastName"
              class="input bg-neutral-100"
              readonly
            />
          </div>
        </div>

        <div class="mb-4">
          <label class="label">{{ $t('auth.email') }}</label>
          <input
            type="email"
            :value="invitation.email"
            class="input bg-neutral-100"
            readonly
          />
        </div>

        <!-- Password fields -->
        <div class="mb-4">
          <label for="password" class="label">{{ $t('auth.password') }} *</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            :class="{ 'border-error focus:border-error focus:ring-error': errors.password }"
            autocomplete="new-password"
            placeholder="********"
          />
          <p v-if="errors.password" class="error-text">{{ errors.password }}</p>
        </div>

        <div class="mb-6">
          <label for="password-confirmation" class="label">{{ $t('auth.confirmPassword') }} *</label>
          <input
            id="password-confirmation"
            v-model="passwordConfirmation"
            type="password"
            class="input"
            :class="{ 'border-error focus:border-error focus:ring-error': errors.passwordConfirmation }"
            autocomplete="new-password"
            placeholder="********"
          />
          <p v-if="errors.passwordConfirmation" class="error-text">{{ errors.passwordConfirmation }}</p>
        </div>

        <!-- Optional fields -->
        <div class="border-t pt-4 mb-4">
          <p class="text-sm text-neutral-500 mb-4">{{ $t('invitation.optionalFields') }}</p>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="identification-number" class="label">{{ $t('profile.idNumber') }}</label>
              <input
                id="identification-number"
                v-model="identificationNumber"
                type="text"
                class="input"
                :class="{ 'border-error focus:border-error focus:ring-error': errors.identification_number }"
              />
              <p v-if="errors.identification_number" class="error-text">{{ errors.identification_number }}</p>
            </div>
            <div>
              <label for="birth-date" class="label">{{ $t('profile.birthDate') }}</label>
              <input
                id="birth-date"
                v-model="birthDate"
                type="date"
                class="input"
                :class="{ 'border-error focus:border-error focus:ring-error': errors.birth_date }"
              />
              <p v-if="errors.birth_date" class="error-text">{{ errors.birth_date }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="phone" class="label">{{ $t('profile.phone') }}</label>
              <input
                id="phone"
                v-model="phone"
                type="tel"
                class="input"
                :class="{ 'border-error focus:border-error focus:ring-error': errors.phone }"
              />
              <p v-if="errors.phone" class="error-text">{{ errors.phone }}</p>
            </div>
            <div>
              <label for="address" class="label">{{ $t('invitation.address') }}</label>
              <input
                id="address"
                v-model="address"
                type="text"
                class="input"
                :class="{ 'border-error focus:border-error focus:ring-error': errors.address }"
              />
              <p v-if="errors.address" class="error-text">{{ errors.address }}</p>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="w-full btn-primary h-11"
            :disabled="submitting"
          >
            <template v-if="submitting">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ $t('invitation.completing') }}
            </template>
            <template v-else>
              {{ $t('invitation.completeButton') }}
            </template>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
