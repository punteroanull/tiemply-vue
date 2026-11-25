<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";
import { useWorkStatusStore } from "../stores/workStatus";
import { formatApiDate, formatClockTime } from "../utils/apiDates";
import GeolocationSettings from "../components/GeolocationSettings.vue";

const { t } = useI18n();

const authStore = useAuthStore();
const workStatusStore = useWorkStatusStore();

const user = computed(() => authStore.user);
// The same employee record the rest of the app works with (the active one).
const employee = computed(() => authStore.currentEmployee);

const roleLabel = computed(() => {
  if (authStore.isAdmin) return t("nav.roleAdmin");
  if (authStore.isManager) return t("nav.roleManager");
  if (authStore.isEmployee) return t("nav.employee");
  return user.value?.role?.name ?? "";
});

// Contact details the person may change themselves. Email, ID and role are the company's.
const editing = ref(false);
const savingProfile = ref(false);
const profileForm = reactive({ name: "", phone: "", address: "" });
const profileErrors = ref<Record<string, string>>({});
const profileError = ref("");

const canEditProfile = computed(() => authStore.canWriteWhileImpersonating);

function startEditing() {
  profileForm.name = user.value?.name ?? "";
  profileForm.phone = user.value?.phone ?? "";
  profileForm.address = user.value?.address ?? "";
  profileErrors.value = {};
  profileError.value = "";
  editing.value = true;
}

function cancelEditing() {
  editing.value = false;
}

async function saveProfile() {
  profileErrors.value = {};
  profileError.value = "";

  if (!profileForm.name.trim()) {
    profileErrors.value.name = t("auth.validation.nameRequired");
    return;
  }

  savingProfile.value = true;
  const result = await authStore.updateProfile({
    name: profileForm.name.trim(),
    phone: profileForm.phone.trim() || null,
    address: profileForm.address.trim() || null,
  });
  savingProfile.value = false;

  if (result.ok) {
    editing.value = false;
    return;
  }

  profileErrors.value = result.fieldErrors ?? {};
  if (Object.keys(profileErrors.value).length === 0) {
    profileError.value = result.message || t("messages.profileUpdateFailed");
  }
}

// Password change. Not offered to an administrator viewing the account: the API refuses it.
const savingPassword = ref(false);
const passwordForm = reactive({ current: "", next: "", confirmation: "" });
const passwordErrors = ref<Record<string, string>>({});
const passwordError = ref("");

async function savePassword() {
  passwordErrors.value = {};
  passwordError.value = "";

  if (!passwordForm.current) {
    passwordErrors.value.current_password = t("auth.validation.passwordRequired");
  }
  if (passwordForm.next.length < 8) {
    passwordErrors.value.password = t("auth.validation.passwordMin");
  } else if (passwordForm.next === passwordForm.current) {
    passwordErrors.value.password = t("profile.passwordMustDiffer");
  }
  if (passwordForm.next !== passwordForm.confirmation) {
    passwordErrors.value.password_confirmation = t("auth.validation.passwordMismatch");
  }
  if (Object.keys(passwordErrors.value).length > 0) return;

  savingPassword.value = true;
  const result = await authStore.changePassword({
    current_password: passwordForm.current,
    password: passwordForm.next,
    password_confirmation: passwordForm.confirmation,
  });
  savingPassword.value = false;

  if (result.ok) {
    passwordForm.current = "";
    passwordForm.next = "";
    passwordForm.confirmation = "";
    return;
  }

  passwordErrors.value = result.fieldErrors ?? {};
  if (Object.keys(passwordErrors.value).length === 0) {
    passwordError.value = result.message || t("messages.passwordChangeFailed");
  }
}

onMounted(async () => {
  // Asegurar que tenemos la configuración de la empresa
  await workStatusStore.fetchCompanySettings();
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">{{ $t('profile.title') }}</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- User Information -->
      <div class="card">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h2 class="text-lg font-medium text-neutral-800">
            {{ $t('profile.personalInfo') }}
          </h2>
          <button
            v-if="!editing && canEditProfile"
            type="button"
            class="btn-outline"
            @click="startEditing"
          >
            {{ $t('common.edit') }}
          </button>
        </div>

        <form v-if="editing" novalidate class="space-y-4" @submit.prevent="saveProfile">
          <p
            v-if="profileError"
            class="p-3 rounded-lg bg-error/10 border border-error text-red-700 text-sm"
            role="alert"
          >
            {{ profileError }}
          </p>

          <div>
            <label for="profile-name" class="label">{{ $t('profile.fullName') }}</label>
            <input
              id="profile-name"
              v-model="profileForm.name"
              type="text"
              class="input"
              maxlength="255"
              autocomplete="name"
              :aria-invalid="!!profileErrors.name"
              :aria-describedby="profileErrors.name ? 'profile-name-error' : undefined"
            />
            <p v-if="profileErrors.name" id="profile-name-error" class="error-text">
              {{ profileErrors.name }}
            </p>
          </div>

          <div>
            <label for="profile-phone" class="label">{{ $t('profile.phone') }}</label>
            <input
              id="profile-phone"
              v-model="profileForm.phone"
              type="tel"
              class="input"
              maxlength="20"
              autocomplete="tel"
              :aria-invalid="!!profileErrors.phone"
              :aria-describedby="profileErrors.phone ? 'profile-phone-error' : undefined"
            />
            <p v-if="profileErrors.phone" id="profile-phone-error" class="error-text">
              {{ profileErrors.phone }}
            </p>
          </div>

          <div>
            <label for="profile-address" class="label">{{ $t('profile.address') }}</label>
            <input
              id="profile-address"
              v-model="profileForm.address"
              type="text"
              class="input"
              maxlength="255"
              autocomplete="street-address"
              :aria-invalid="!!profileErrors.address"
              :aria-describedby="profileErrors.address ? 'profile-address-error' : undefined"
            />
            <p v-if="profileErrors.address" id="profile-address-error" class="error-text">
              {{ profileErrors.address }}
            </p>
          </div>

          <p class="text-xs text-neutral-500">{{ $t('profile.companyManagedHint') }}</p>

          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" class="btn-outline" :disabled="savingProfile" @click="cancelEditing">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="btn-primary" :disabled="savingProfile">
              {{ savingProfile ? $t('profile.saving') : $t('common.save') }}
            </button>
          </div>
        </form>

        <dl v-else class="space-y-4">
          <div>
            <dt class="label">{{ $t('profile.fullName') }}</dt>
            <dd class="text-neutral-800 font-medium">
              {{ user?.name || t('profile.notProvided') }}
            </dd>
          </div>

          <div>
            <dt class="label">{{ $t('profile.email') }}</dt>
            <dd class="text-neutral-800 break-words">
              {{ user?.email || t('profile.notProvided') }}
            </dd>
          </div>

          <div v-if="user?.identificationNumber">
            <dt class="label">{{ $t('profile.idNumber') }}</dt>
            <dd class="text-neutral-800">{{ user.identificationNumber }}</dd>
          </div>

          <div v-if="user?.phone">
            <dt class="label">{{ $t('profile.phone') }}</dt>
            <dd class="text-neutral-800">{{ user.phone }}</dd>
          </div>

          <div v-if="user?.address">
            <dt class="label">{{ $t('profile.address') }}</dt>
            <dd class="text-neutral-800 break-words">{{ user.address }}</dd>
          </div>

          <div v-if="user?.birthDate">
            <dt class="label">{{ $t('profile.birthDate') }}</dt>
            <dd class="text-neutral-800">
              {{ formatApiDate(user.birthDate, 'PPP') }}
            </dd>
          </div>

          <div v-if="roleLabel">
            <dt class="label">{{ $t('profile.role') }}</dt>
            <dd class="text-neutral-800">{{ roleLabel }}</dd>
          </div>
        </dl>
      </div>

      <!-- Company Information -->
      <div v-if="employee" class="card">
        <h2 class="text-lg font-medium text-neutral-800 mb-4">
          {{ $t('profile.employmentInfo') }}
        </h2>

        <dl class="space-y-4">
          <div v-if="employee.contractStartTime">
            <dt class="label">{{ $t('profile.workScheduleStart') }}</dt>
            <dd class="text-neutral-800">
              {{ formatClockTime(employee.contractStartTime) || employee.contractStartTime }}
            </dd>
          </div>

          <div v-if="employee.contractEndTime">
            <dt class="label">{{ $t('profile.workScheduleEnd') }}</dt>
            <dd class="text-neutral-800">
              {{ formatClockTime(employee.contractEndTime) || employee.contractEndTime }}
            </dd>
          </div>

          <div>
            <dt class="label">{{ $t('profile.remainingVacation') }}</dt>
            <dd class="text-neutral-800 font-medium">
              {{ employee.remainingVacationDays || 0 }} {{ $t('profile.days') }}
            </dd>
          </div>

          <div>
            <dt class="label">{{ $t('profile.status') }}</dt>
            <dd>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="
                  employee.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                "
              >
                {{ employee.active ? $t('profile.active') : $t('profile.inactive') }}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Password -->
      <div v-if="!authStore.isImpersonating" class="card lg:col-span-2">
        <h2 class="text-lg font-medium text-neutral-800 mb-1">
          {{ $t('profile.changePassword') }}
        </h2>
        <p class="text-sm text-neutral-500 mb-4">{{ $t('profile.changePasswordHint') }}</p>

        <form novalidate class="grid grid-cols-1 md:grid-cols-3 gap-4" @submit.prevent="savePassword">
          <p
            v-if="passwordError"
            class="md:col-span-3 p-3 rounded-lg bg-error/10 border border-error text-red-700 text-sm"
            role="alert"
          >
            {{ passwordError }}
          </p>

          <div>
            <label for="current-password" class="label">{{ $t('profile.currentPassword') }}</label>
            <input
              id="current-password"
              v-model="passwordForm.current"
              type="password"
              class="input"
              autocomplete="current-password"
              :aria-invalid="!!passwordErrors.current_password"
              :aria-describedby="passwordErrors.current_password ? 'current-password-error' : undefined"
            />
            <p v-if="passwordErrors.current_password" id="current-password-error" class="error-text">
              {{ passwordErrors.current_password }}
            </p>
          </div>

          <div>
            <label for="new-password" class="label">{{ $t('profile.newPassword') }}</label>
            <input
              id="new-password"
              v-model="passwordForm.next"
              type="password"
              class="input"
              autocomplete="new-password"
              :aria-invalid="!!passwordErrors.password"
              aria-describedby="new-password-help"
            />
            <p v-if="passwordErrors.password" id="new-password-help" class="error-text">
              {{ passwordErrors.password }}
            </p>
            <p v-else id="new-password-help" class="mt-1 text-xs text-neutral-500">
              {{ $t('auth.validation.passwordMin') }}
            </p>
          </div>

          <div>
            <label for="confirm-password" class="label">{{ $t('auth.confirmPassword') }}</label>
            <input
              id="confirm-password"
              v-model="passwordForm.confirmation"
              type="password"
              class="input"
              autocomplete="new-password"
              :aria-invalid="!!passwordErrors.password_confirmation"
              :aria-describedby="passwordErrors.password_confirmation ? 'confirm-password-error' : undefined"
            />
            <p v-if="passwordErrors.password_confirmation" id="confirm-password-error" class="error-text">
              {{ passwordErrors.password_confirmation }}
            </p>
          </div>

          <div class="md:col-span-3 flex justify-end">
            <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="savingPassword">
              {{ savingPassword ? $t('profile.saving') : $t('profile.changePassword') }}
            </button>
          </div>
        </form>
      </div>

      <!-- Geolocation Settings -->
      <div class="lg:col-span-2">
        <GeolocationSettings />
      </div>
    </div>
  </div>
</template>
