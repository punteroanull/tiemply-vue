<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

const email = ref('')
const emailError = ref('')
const formError = ref('')
const sending = ref(false)
// The API answers the same whether or not the address has an account, and so does this.
const sent = ref(false)

async function handleSubmit() {
  emailError.value = ''
  formError.value = ''

  if (!email.value.trim()) {
    emailError.value = t('auth.validation.emailRequired')
    return
  }

  sending.value = true
  const result = await authStore.requestPasswordReset(email.value.trim())
  sending.value = false

  if (result.ok) {
    sent.value = true
  } else if (result.fieldErrors?.email) {
    emailError.value = result.fieldErrors.email
  } else {
    formError.value = result.message || t('auth.reset.requestFailed')
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-semibold text-neutral-800 mb-2">{{ $t('auth.reset.title') }}</h2>

    <template v-if="sent">
      <p
        class="mt-4 p-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-800 text-sm"
        role="status"
      >
        {{ $t('auth.reset.sent', { email: email.trim() }) }}
      </p>
      <p class="mt-3 text-sm text-neutral-600">{{ $t('auth.reset.sentHint') }}</p>
    </template>

    <template v-else>
      <p class="text-sm text-neutral-600 mb-6">{{ $t('auth.reset.intro') }}</p>

      <p
        v-if="formError"
        id="forgot-error"
        class="mb-4 p-3 rounded-lg bg-error/10 border border-error text-red-700 text-sm"
        role="alert"
      >
        {{ formError }}
      </p>

      <form novalidate @submit.prevent="handleSubmit">
        <div class="mb-6">
          <label for="email" class="label">{{ $t('auth.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="input"
            :class="{ 'border-error focus:border-error focus:ring-error': emailError }"
            autocomplete="email"
            :placeholder="$t('auth.emailPlaceholder')"
            :aria-invalid="!!emailError"
            :aria-describedby="emailError ? 'email-error' : undefined"
          />
          <p v-if="emailError" id="email-error" class="error-text">{{ emailError }}</p>
        </div>

        <button type="submit" class="w-full btn-primary h-11" :disabled="sending">
          {{ sending ? $t('auth.reset.sending') : $t('auth.reset.send') }}
        </button>
      </form>
    </template>

    <p class="mt-6 text-center text-sm">
      <router-link
        :to="{ name: 'login' }"
        class="font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus-visible:underline"
      >
        {{ $t('auth.reset.backToLogin') }}
      </router-link>
    </p>
  </div>
</template>
