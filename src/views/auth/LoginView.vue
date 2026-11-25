<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { SESSION_EXPIRED_KEY } from '../../services/impersonationErrors'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const errors = ref<Record<string, string>>({})
// What the server said about the last attempt, kept next to the form: a toast alone is
// gone in five seconds and is never announced as belonging to these fields.
const formError = ref('')
// Why the visitor is here, when it was not their own doing.
const notice = ref('')

onMounted(() => {
  if (sessionStorage.getItem(SESSION_EXPIRED_KEY)) {
    sessionStorage.removeItem(SESSION_EXPIRED_KEY)
    notice.value = t('auth.sessionExpired')
  } else if (route.query.reset) {
    notice.value = t('auth.reset.done')
    router.replace({ name: 'login' })
  }
})

async function handleSubmit() {
  errors.value = {}
  formError.value = ''

  // Basic validation
  if (!email.value) {
    errors.value.email = t('auth.validation.emailRequired')
  }
  if (!password.value) {
    errors.value.password = t('auth.validation.passwordRequired')
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
  } else {
    formError.value = authStore.error
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-semibold text-neutral-800 mb-6">{{ $t('auth.signIn') }}</h2>

    <p
      v-if="notice"
      class="mb-4 p-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-800 text-sm"
      role="status"
    >
      {{ notice }}
    </p>

    <p
      v-if="formError"
      id="login-error"
      class="mb-4 p-3 rounded-lg bg-error/10 border border-error text-red-700 text-sm"
      role="alert"
    >
      {{ formError }}
    </p>

    <form novalidate @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label for="email" class="label">{{ $t('auth.email') }}</label>
        <input
          id="email"
          v-model="email"
          type="email"
          class="input"
          :class="{ 'border-error focus:border-error focus:ring-error': errors.email }"
          autocomplete="email"
          :placeholder="$t('auth.emailPlaceholder')"
          :aria-invalid="!!errors.email || !!formError"
          :aria-describedby="errors.email ? 'email-error' : formError ? 'login-error' : undefined"
        />
        <p v-if="errors.email" id="email-error" class="error-text">{{ errors.email }}</p>
      </div>

      <div class="mb-6">
        <label for="password" class="label">{{ $t('auth.password') }}</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="input"
          :class="{ 'border-error focus:border-error focus:ring-error': errors.password }"
          autocomplete="current-password"
          :aria-invalid="!!errors.password || !!formError"
          :aria-describedby="errors.password ? 'password-error' : formError ? 'login-error' : undefined"
        />
        <p v-if="errors.password" id="password-error" class="error-text">{{ errors.password }}</p>
        <p class="mt-2 text-right text-sm">
          <router-link
            :to="{ name: 'forgot-password' }"
            class="font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus-visible:underline"
          >
            {{ $t('auth.forgotPassword') }}
          </router-link>
        </p>
      </div>

      <div>
        <button
          type="submit"
          class="w-full btn-primary h-11"
          :disabled="authStore.loading"
        >
          <template v-if="authStore.loading">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ $t('auth.signingIn') }}
          </template>
          <template v-else>
            {{ $t('auth.signInButton') }}
          </template>
        </button>
      </div>
    </form>
  </div>
</template>
