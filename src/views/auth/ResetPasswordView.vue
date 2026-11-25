<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Both come in the link of the reset email.
const token = computed(() => String(route.query.token ?? ''))
const email = computed(() => String(route.query.email ?? ''))
const linkIsComplete = computed(() => !!token.value && !!email.value)

const password = ref('')
const passwordConfirmation = ref('')
const errors = ref<Record<string, string>>({})
const formError = ref('')
// The link was refused (used, expired or not for this address): only a new one helps.
const linkRejected = ref(false)
const saving = ref(false)

async function handleSubmit() {
  errors.value = {}
  formError.value = ''

  if (!password.value) {
    errors.value.password = t('auth.validation.passwordRequired')
  } else if (password.value.length < 8) {
    errors.value.password = t('auth.validation.passwordMin')
  }
  if (password.value !== passwordConfirmation.value) {
    errors.value.passwordConfirmation = t('auth.validation.passwordMismatch')
  }
  if (Object.keys(errors.value).length > 0) return

  saving.value = true
  const result = await authStore.resetPassword({
    token: token.value,
    email: email.value,
    password: password.value,
    password_confirmation: passwordConfirmation.value,
  })
  saving.value = false

  if (result.ok) {
    // Every session of the account was closed by the reset, this device's included.
    if (authStore.isAuthenticated) {
      await authStore.logout()
    }
    router.replace({ name: 'login', query: { reset: '1' } })
    return
  }

  const fieldErrors = result.fieldErrors ?? {}
  if (fieldErrors.token || fieldErrors.email) {
    linkRejected.value = true
    formError.value = fieldErrors.token || fieldErrors.email
  } else if (fieldErrors.password) {
    errors.value.password = fieldErrors.password
  } else {
    formError.value = result.message || t('auth.reset.failed')
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-semibold text-neutral-800 mb-2">
      {{ $t('auth.reset.newPasswordTitle') }}
    </h2>

    <!-- Opened without the data of the email link -->
    <template v-if="!linkIsComplete">
      <p
        class="mt-4 p-3 rounded-lg bg-error/10 border border-error text-red-700 text-sm"
        role="alert"
      >
        {{ $t('auth.reset.linkInvalid') }}
      </p>
    </template>

    <template v-else>
      <p class="text-sm text-neutral-600 mb-6 break-words">
        {{ $t('auth.reset.newPasswordIntro', { email }) }}
      </p>

      <p
        v-if="formError"
        id="reset-error"
        class="mb-4 p-3 rounded-lg bg-error/10 border border-error text-red-700 text-sm"
        role="alert"
      >
        {{ formError }}
      </p>

      <form v-if="!linkRejected" novalidate @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="password" class="label">{{ $t('auth.reset.newPassword') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            :class="{ 'border-error focus:border-error focus:ring-error': errors.password }"
            autocomplete="new-password"
            :aria-invalid="!!errors.password"
            aria-describedby="password-help"
          />
          <p v-if="errors.password" id="password-help" class="error-text">{{ errors.password }}</p>
          <p v-else id="password-help" class="mt-1 text-xs text-neutral-500">
            {{ $t('auth.validation.passwordMin') }}
          </p>
        </div>

        <div class="mb-6">
          <label for="password-confirmation" class="label">{{ $t('auth.confirmPassword') }}</label>
          <input
            id="password-confirmation"
            v-model="passwordConfirmation"
            type="password"
            class="input"
            :class="{ 'border-error focus:border-error focus:ring-error': errors.passwordConfirmation }"
            autocomplete="new-password"
            :aria-invalid="!!errors.passwordConfirmation"
            :aria-describedby="errors.passwordConfirmation ? 'password-confirmation-error' : undefined"
          />
          <p v-if="errors.passwordConfirmation" id="password-confirmation-error" class="error-text">
            {{ errors.passwordConfirmation }}
          </p>
        </div>

        <button type="submit" class="w-full btn-primary h-11" :disabled="saving">
          {{ saving ? $t('profile.saving') : $t('auth.reset.save') }}
        </button>
      </form>
    </template>

    <p class="mt-6 text-center text-sm space-x-4">
      <router-link
        v-if="!linkIsComplete || linkRejected"
        :to="{ name: 'forgot-password' }"
        class="font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus-visible:underline"
      >
        {{ $t('auth.reset.requestNewLink') }}
      </router-link>
      <router-link
        :to="{ name: 'login' }"
        class="font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus-visible:underline"
      >
        {{ $t('auth.reset.backToLogin') }}
      </router-link>
    </p>
  </div>
</template>
