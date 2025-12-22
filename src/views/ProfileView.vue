<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";
import { useWorkStatusStore } from "../stores/workStatus";
import GeolocationSettings from "../components/GeolocationSettings.vue";

const { t } = useI18n();

const authStore = useAuthStore();
const workStatusStore = useWorkStatusStore();

const user = computed(() => authStore.user);
const employee = computed(() => authStore.user?.employeeRecords?.[0]);

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
        <h2 class="text-lg font-medium text-neutral-800 mb-4">
          {{ $t('profile.personalInfo') }}
        </h2>

        <div class="space-y-4">
          <div>
            <label class="label">{{ $t('profile.fullName') }}</label>
            <div class="text-neutral-800 font-medium">
              {{ user?.name || t('profile.notProvided') }}
            </div>
          </div>

          <div>
            <label class="label">{{ $t('profile.email') }}</label>
            <div class="text-neutral-800">
              {{ user?.email || t('profile.notProvided') }}
            </div>
          </div>

          <div v-if="user?.identification_number">
            <label class="label">{{ $t('profile.idNumber') }}</label>
            <div class="text-neutral-800">{{ user.identification_number }}</div>
          </div>

          <div v-if="user?.phone">
            <label class="label">{{ $t('profile.phone') }}</label>
            <div class="text-neutral-800">{{ user.phone }}</div>
          </div>

          <div v-if="user?.birth_date">
            <label class="label">{{ $t('profile.birthDate') }}</label>
            <div class="text-neutral-800">
              {{ new Date(user.birth_date).toLocaleDateString() }}
            </div>
          </div>

          <div v-if="user?.role">
            <label class="label">{{ $t('profile.role') }}</label>
            <div class="text-neutral-800">{{ user.role.name }}</div>
          </div>
        </div>
      </div>

      <!-- Company Information -->
      <div v-if="employee" class="card">
        <h2 class="text-lg font-medium text-neutral-800 mb-4">
          {{ $t('profile.employmentInfo') }}
        </h2>

        <div class="space-y-4">
          <div v-if="employee.contract_start_time">
            <label class="label">{{ $t('profile.workScheduleStart') }}</label>
            <div class="text-neutral-800">
              {{ employee.contract_start_time }}
            </div>
          </div>

          <div v-if="employee.contract_end_time">
            <label class="label">{{ $t('profile.workScheduleEnd') }}</label>
            <div class="text-neutral-800">{{ employee.contract_end_time }}</div>
          </div>

          <div>
            <label class="label">{{ $t('profile.remainingVacation') }}</label>
            <div class="text-neutral-800 font-medium">
              {{ employee.remaining_vacation_days || 0 }} {{ $t('profile.days') }}
            </div>
          </div>

          <div>
            <label class="label">{{ $t('profile.status') }}</label>
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
          </div>
        </div>
      </div>

      <!-- Geolocation Settings -->
      <div class="lg:col-span-2">
        <GeolocationSettings />
      </div>
    </div>
  </div>
</template>
