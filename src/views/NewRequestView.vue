<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAbsencesStore } from "../stores/absences";
import { useAuthStore } from "../stores/auth";
import { format } from "date-fns";

const router = useRouter();
const absencesStore = useAbsencesStore();
const authStore = useAuthStore();

// Period interface
interface Period {
  startDate: string;
  endDate: string;
  isPartial: boolean;
  startTime: string;
  endTime: string;
}

// Form data
const selectedAbsenceType = ref("");
const periods = ref<Period[]>([
  {
    startDate: "",
    endDate: "",
    isPartial: false,
    startTime: "",
    endTime: ""
  }
]);
const notes = ref("");

// UI state
const isSubmitting = computed(() => absencesStore.submitting);
const isLoading = computed(() => absencesStore.loading);

// Get minimum date (today)
const minDate = computed(() => format(new Date(), "yyyy-MM-dd"));

// Get employee's remaining vacation days
const remainingVacationDays = computed(() => {
  return authStore.user?.employeeRecords?.[0]?.remainingVacationDays ?? 0;
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

// Calculate days for a single period
function calculatePeriodDays(period: Period): number {
  if (!period.startDate || !period.endDate) return 0;
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// Calculate total days requested across all periods
const totalDaysRequested = computed(() => {
  return periods.value.reduce((sum, period) => sum + calculatePeriodDays(period), 0);
});

// Calculate excess days
const excessDays = computed(() => {
  if (!affectsVacationBalance.value) return 0;
  return Math.max(0, totalDaysRequested.value - remainingVacationDays.value);
});

// Validation status
const vacationValidationStatus = computed(() => {
  if (!affectsVacationBalance.value) return { valid: true, message: "" };

  const excess = excessDays.value;
  if (excess === 0) return { valid: true, message: "" };

  return { valid: false, message: "requests.exceedsAvailable", type: "error" };
});

// Check if a period is valid
function isPeriodValid(period: Period): boolean {
  if (!period.startDate || !period.endDate) return false;
  if (new Date(period.startDate) > new Date(period.endDate)) return false;
  if (period.isPartial && (!period.startTime || !period.endTime)) return false;
  return true;
}

// Check if request is valid
const isValid = computed(() => {
  if (!selectedAbsenceType.value) return false;
  if (periods.value.length === 0) return false;
  if (!periods.value.every(isPeriodValid)) return false;
  if (!vacationValidationStatus.value.valid) return false;
  return true;
});

// Add a new period
function addPeriod() {
  periods.value.push({
    startDate: "",
    endDate: "",
    isPartial: false,
    startTime: "",
    endTime: ""
  });
}

// Remove a period
function removePeriod(index: number) {
  if (periods.value.length > 1) {
    periods.value.splice(index, 1);
  }
}

// Watch each period's startDate to update endDate minimum
watch(
  () => periods.value,
  (newPeriods) => {
    newPeriods.forEach((period) => {
      if (period.startDate && (!period.endDate || new Date(period.endDate) < new Date(period.startDate))) {
        period.endDate = period.startDate;
      }
    });
  },
  { deep: true }
);

async function handleSubmit() {
  if (!isValid.value) return;

  // Get overall date range from all periods
  const allStartDates = periods.value.map(p => p.startDate).filter(Boolean);
  const allEndDates = periods.value.map(p => p.endDate).filter(Boolean);
  const overallStartDate = allStartDates.length > 0 ? allStartDates.sort()[0] : null;
  const overallEndDate = allEndDates.length > 0 ? allEndDates.sort().reverse()[0] : null;

  const requestData = {
    employee_id: authStore.user?.employeeRecords?.[0]?.id,
    absence_type_id: selectedAbsenceType.value,
    start_date: overallStartDate,
    end_date: overallEndDate,
    is_partial: periods.value.length === 1 && periods.value[0].isPartial,
    start_time: periods.value.length === 1 && periods.value[0].isPartial ? periods.value[0].startTime : null,
    end_time: periods.value.length === 1 && periods.value[0].isPartial ? periods.value[0].endTime : null,
    periods: periods.value.map(period => ({
      start_date: period.startDate,
      end_date: period.endDate,
      is_partial: period.isPartial,
      start_time: period.isPartial ? period.startTime : null,
      end_time: period.isPartial ? period.endTime : null
    })),
    notes: notes.value || null,
  };

  const success = await absencesStore.submitAbsenceRequest(requestData);

  if (success) {
    router.push("/requests");
  }
}

function goBack() {
  router.push("/requests");
}

onMounted(async () => {
  await absencesStore.fetchAbsenceTypes();
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
      <h1 class="text-2xl font-bold text-neutral-800">{{ $t('newRequest.title') }}</h1>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
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

        <!-- Periods -->
        <div class="space-y-4">
          <div
            v-for="(period, index) in periods"
            :key="index"
            class="border border-neutral-200 rounded-lg p-4 space-y-4"
          >
            <!-- Period header -->
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-neutral-700">
                {{ $t('requests.periodOf', { current: index + 1, total: periods.length }) }}
              </h3>
              <button
                v-if="periods.length > 1"
                type="button"
                @click="removePeriod(index)"
                class="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                :title="$t('requests.removePeriod')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <!-- Date Range -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label :for="`startDate-${index}`" class="block text-sm font-medium text-neutral-700 mb-1">
                  {{ $t('newRequest.startDate') }} <span class="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  :id="`startDate-${index}`"
                  v-model="period.startDate"
                  :min="minDate"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label :for="`endDate-${index}`" class="block text-sm font-medium text-neutral-700 mb-1">
                  {{ $t('newRequest.endDate') }} <span class="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  :id="`endDate-${index}`"
                  v-model="period.endDate"
                  :min="period.startDate || minDate"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <!-- Period days summary -->
            <div v-if="period.startDate && period.endDate" class="p-2 bg-neutral-50 rounded-md">
              <p class="text-xs text-neutral-600">
                <span class="font-medium">{{ $t('newRequest.daysRequested') }}:</span>
                {{ calculatePeriodDays(period) }} {{ $t('profile.days') }}
              </p>
            </div>

            <!-- Partial Absence Toggle -->
            <div>
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="period.isPartial"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <span class="ml-2 text-sm text-neutral-700">{{ $t('newRequest.partialAbsence') }}</span>
              </label>
              <p class="text-xs text-neutral-500 mt-1 ml-6">
                {{ $t('newRequest.partialHint') }}
              </p>
            </div>

            <!-- Time Range (for partial absences) -->
            <div v-if="period.isPartial" class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-primary-200">
              <div>
                <label :for="`startTime-${index}`" class="block text-sm font-medium text-neutral-700 mb-1">
                  {{ $t('newRequest.startTime') }} <span class="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  :id="`startTime-${index}`"
                  v-model="period.startTime"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label :for="`endTime-${index}`" class="block text-sm font-medium text-neutral-700 mb-1">
                  {{ $t('newRequest.endTime') }} <span class="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  :id="`endTime-${index}`"
                  v-model="period.endTime"
                  :min="period.startTime"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          <!-- Add period button -->
          <button
            type="button"
            @click="addPeriod"
            class="w-full py-2 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            {{ $t('requests.addPeriod') }}
          </button>
        </div>

        <!-- Total days summary -->
        <div v-if="totalDaysRequested > 0" class="p-3 bg-neutral-50 rounded-md border border-neutral-200">
          <p class="text-sm text-neutral-700">
            <span class="font-medium">{{ $t('newRequest.daysRequested') }}:</span>
            {{ totalDaysRequested }} {{ $t('profile.days') }}
          </p>

          <!-- Vacation validation messages -->
          <div v-if="affectsVacationBalance && vacationValidationStatus.message">
            <p
              v-if="vacationValidationStatus.type === 'error'"
              class="text-sm text-red-600 mt-2"
            >
              {{ $t(vacationValidationStatus.message) }}
            </p>
            <p
              v-if="vacationValidationStatus.type === 'warning'"
              class="text-sm text-amber-600 mt-2"
            >
              {{ $t(vacationValidationStatus.message, { days: vacationValidationStatus.days }) }}
            </p>
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
              {{ $t('newRequest.submitting') }}
            </span>
            <span v-else>{{ $t('newRequest.submit') }}</span>
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
