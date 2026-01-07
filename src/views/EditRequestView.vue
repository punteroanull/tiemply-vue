<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAbsencesStore } from "../stores/absences";
import { useAuthStore } from "../stores/auth";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const absencesStore = useAbsencesStore();
const authStore = useAuthStore();

// Request ID from route
const requestId = computed(() => route.params.id as string);

// Form data
const selectedAbsenceType = ref("");
const startDate = ref("");
const endDate = ref("");
const isPartial = ref(false);
const startTime = ref("");
const endTime = ref("");
const notes = ref("");
const originalStatus = ref("");

// UI state
const isSubmitting = computed(() => absencesStore.submitting);
const isLoading = computed(() => absencesStore.loading);
const loadError = ref(false);

// Check if request can be edited (only pending requests)
const canEdit = computed(() => originalStatus.value === "pending");

// Get employee's remaining vacation days
const remainingVacationDays = computed(() => {
  return authStore.user?.employeeRecords?.[0]?.remaining_vacation_days ?? 0;
});

// Get selected absence type details
const selectedTypeDetails = computed(() => {
  return absencesStore.absenceTypes.find(
    (type) => type.id === selectedAbsenceType.value
  );
});

// Check if selected type affects vacation balance
const affectsVacationBalance = computed(() => {
  return selectedTypeDetails.value?.affectsVacationBalance ?? false;
});

// Calculate days requested
const daysRequested = computed(() => {
  if (!startDate.value || !endDate.value) return 0;
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
});

// Check if request is valid
const isValid = computed(() => {
  if (!selectedAbsenceType.value) return false;
  if (!startDate.value || !endDate.value) return false;
  if (new Date(startDate.value) > new Date(endDate.value)) return false;
  if (isPartial.value && (!startTime.value || !endTime.value)) return false;
  if (affectsVacationBalance.value && daysRequested.value > remainingVacationDays.value) return false;
  return true;
});

// Watch startDate to update endDate minimum
watch(startDate, (newStartDate) => {
  if (newStartDate && (!endDate.value || new Date(endDate.value) < new Date(newStartDate))) {
    endDate.value = newStartDate;
  }
});

async function loadRequest() {
  const request = await absencesStore.fetchRequestById(requestId.value);

  if (!request) {
    loadError.value = true;
    return;
  }

  // Populate form with existing data
  selectedAbsenceType.value = request.absenceTypeId;
  startDate.value = request.startDate;
  endDate.value = request.endDate ?? request.startDate;
  isPartial.value = request.isPartial;
  startTime.value = request.startTime || "";
  endTime.value = request.endTime || "";
  notes.value = request.notes || "";
  originalStatus.value = request.status;
}

async function handleSubmit() {
  if (!isValid.value || !canEdit.value) return;

  const requestData = {
    absence_type_id: selectedAbsenceType.value,
    start_date: startDate.value,
    end_date: endDate.value,
    is_partial: isPartial.value,
    start_time: isPartial.value ? startTime.value : null,
    end_time: isPartial.value ? endTime.value : null,
    notes: notes.value || null,
  };

  const success = await absencesStore.updateRequest(requestId.value, requestData);

  if (success) {
    router.push("/requests");
  }
}

function goBack() {
  router.push("/requests");
}

onMounted(async () => {
  await absencesStore.fetchAbsenceTypes();
  await loadRequest();
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <div class="mb-6">
      <button
        @click="goBack"
        class="flex items-center text-neutral-600 hover:text-neutral-800 mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
        {{ $t('newRequest.backToRequests') }}
      </button>
      <h1 class="text-2xl font-bold text-neutral-800">{{ $t('requests.editRequest') }}</h1>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>

    <!-- Error state -->
    <div v-else-if="loadError" class="bg-red-50 rounded-lg p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-lg font-medium text-red-800 mb-2">{{ $t('requests.requestNotFound') }}</h3>
      <button @click="goBack" class="text-primary-600 hover:text-primary-800 font-medium">
        {{ $t('newRequest.backToRequests') }}
      </button>
    </div>

    <!-- Cannot edit warning -->
    <div v-else-if="!canEdit" class="bg-amber-50 rounded-lg p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 class="text-lg font-medium text-amber-800 mb-2">{{ $t('requests.cannotEditApproved') }}</h3>
      <button @click="goBack" class="text-primary-600 hover:text-primary-800 font-medium">
        {{ $t('newRequest.backToRequests') }}
      </button>
    </div>

    <!-- Form -->
    <div v-else class="bg-white rounded-lg shadow p-6 max-w-2xl">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Absence Type -->
        <div>
          <label for="absenceType" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ $t('newRequest.absenceType') }} <span class="text-red-500">*</span>
          </label>
          <select
            id="absenceType"
            v-model="selectedAbsenceType"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          >
            <option value="" disabled>{{ $t('newRequest.selectType') }}</option>
            <option
              v-for="type in absencesStore.absenceTypes"
              :key="type.id"
              :value="type.id"
            >
              {{ type.name }}
            </option>
          </select>

          <!-- Vacation days info -->
          <div v-if="affectsVacationBalance" class="mt-2 p-3 bg-blue-50 rounded-md">
            <p class="text-sm text-blue-700">
              <span class="font-medium">{{ $t('newRequest.availableVacation') }}:</span>
              {{ remainingVacationDays }} {{ $t('profile.days') }}
            </p>
          </div>
        </div>

        <!-- Date Range -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="startDate" class="block text-sm font-medium text-neutral-700 mb-1">
              {{ $t('newRequest.startDate') }} <span class="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              v-model="startDate"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label for="endDate" class="block text-sm font-medium text-neutral-700 mb-1">
              {{ $t('newRequest.endDate') }} <span class="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              v-model="endDate"
              :min="startDate"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <!-- Days summary -->
        <div v-if="startDate && endDate" class="p-3 bg-neutral-50 rounded-md">
          <p class="text-sm text-neutral-700">
            <span class="font-medium">{{ $t('newRequest.daysRequested') }}:</span> {{ daysRequested }} {{ $t('profile.days') }}
          </p>
          <p v-if="affectsVacationBalance && daysRequested > remainingVacationDays" class="text-sm text-red-600 mt-1">
            {{ $t('newRequest.notEnoughVacation') }}
          </p>
        </div>

        <!-- Partial Absence Toggle -->
        <div>
          <label class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="isPartial"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
            />
            <span class="ml-2 text-sm text-neutral-700">{{ $t('newRequest.partialAbsence') }}</span>
          </label>
          <p class="text-xs text-neutral-500 mt-1 ml-6">
            {{ $t('newRequest.partialHint') }}
          </p>
        </div>

        <!-- Time Range (for partial absences) -->
        <div v-if="isPartial" class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-primary-200">
          <div>
            <label for="startTime" class="block text-sm font-medium text-neutral-700 mb-1">
              {{ $t('newRequest.startTime') }} <span class="text-red-500">*</span>
            </label>
            <input
              type="time"
              id="startTime"
              v-model="startTime"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label for="endTime" class="block text-sm font-medium text-neutral-700 mb-1">
              {{ $t('newRequest.endTime') }} <span class="text-red-500">*</span>
            </label>
            <input
              type="time"
              id="endTime"
              v-model="endTime"
              :min="startTime"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label for="notes" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ $t('newRequest.notes') }}
          </label>
          <textarea
            id="notes"
            v-model="notes"
            rows="3"
            maxlength="500"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            :placeholder="$t('newRequest.notesPlaceholder')"
          ></textarea>
          <p class="text-xs text-neutral-500 mt-1">{{ notes.length }}/500 {{ $t('newRequest.characters') }}</p>
        </div>

        <!-- Approval notice -->
        <div v-if="selectedTypeDetails?.requiresApproval" class="p-3 bg-amber-50 rounded-md border border-amber-200">
          <div class="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-amber-700">
              {{ $t('newRequest.requiresApproval') }}
            </p>
          </div>
        </div>

        <!-- Submit buttons -->
        <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
          <button
            type="submit"
            :disabled="!isValid || isSubmitting"
            class="flex-1 px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="isSubmitting" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ $t('requests.saving') }}
            </span>
            <span v-else>{{ $t('requests.saveChanges') }}</span>
          </button>
          <button
            type="button"
            @click="goBack"
            class="flex-1 sm:flex-none px-4 py-2 bg-neutral-100 text-neutral-700 font-medium rounded-md hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 transition-colors"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
