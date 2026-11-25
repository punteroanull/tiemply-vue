<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAbsencesStore } from "../stores/absences";
import { useAuthStore } from "../stores/auth";
import {
  checkVacationBalance,
  countRequestDays,
  earliestRequestDate,
  rangesOverlap,
} from "../utils/requestDates";
import { unwrap } from "../utils/apiResponse";
import api from "../services/api";

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

function emptyPeriod(): Period {
  return { startDate: "", endDate: "", isPartial: false, startTime: "", endTime: "" };
}

// Form data
const selectedAbsenceType = ref("");
const periods = ref<Period[]>([emptyPeriod()]);
const notes = ref("");

// Company rules the API applies when it validates the request
const companyAdvanceDays = ref<number>(0);
const allowVacationExcess = ref(false);
const maxVacationExcessDays = ref<number | null>(null);
/** False if the settings could not be read: then the balance check is left to the API. */
const settingsLoaded = ref(false);

// UI state
const isSubmitting = computed(() => absencesStore.submitting);
const isLoading = ref(true);

// Earliest start date, as the API enforces it (see earliestRequestDate)
const minDate = computed(() =>
  earliestRequestDate(selectedTypeDetails.value?.code, companyAdvanceDays.value)
);

// Get employee's remaining vacation days
const remainingVacationDays = computed(() => authStore.remainingVacationDays);

/** Companies on business days only spend Monday to Friday; the API counts the same way. */
const businessDaysOnly = computed(
  () => authStore.currentCompany?.vacationType === "business_days"
);

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
  return countRequestDays(period.startDate, period.endDate, businessDaysOnly.value);
}

// Calculate total days requested across all periods
const totalDaysRequested = computed(() => {
  return periods.value.reduce((sum, period) => sum + calculatePeriodDays(period), 0);
});

const hasCompleteDates = computed(() =>
  periods.value.every((period) => period.startDate && period.endDate)
);

// Balance check, mirroring the API (which stays the final authority)
const vacationCheck = computed(() => {
  if (!affectsVacationBalance.value || !settingsLoaded.value) {
    return { valid: true as const, excess: 0 };
  }
  return checkVacationBalance(
    totalDaysRequested.value,
    remainingVacationDays.value,
    allowVacationExcess.value,
    maxVacationExcessDays.value
  );
});

/** First thing wrong with one period, as a translation key; null when it is fine. */
function periodProblem(period: Period): string | null {
  if (!period.startDate || !period.endDate) return "newRequest.validation.datesRequired";
  if (period.startDate > period.endDate) return "newRequest.validation.endBeforeStart";
  if (period.isPartial) {
    if (!period.startTime || !period.endTime) return "newRequest.validation.timesRequired";
    if (period.endTime <= period.startTime) return "newRequest.validation.endTimeBeforeStart";
  }
  return null;
}

/** True when this period shares a day with another one (approving both duplicates absences). */
function overlapsAnother(index: number): boolean {
  return periods.value.some(
    (other, otherIndex) => otherIndex !== index && rangesOverlap(periods.value[index], other)
  );
}

/**
 * What still stops the request from being sent, so a disabled button never goes
 * unexplained. Null when the form is ready.
 */
const blockingProblem = computed<string | null>(() => {
  if (!selectedAbsenceType.value) return "newRequest.validation.selectType";

  for (const period of periods.value) {
    const problem = periodProblem(period);
    if (problem) return problem;
  }
  if (periods.value.some((_, index) => overlapsAnother(index))) {
    return "newRequest.validation.periodsOverlap";
  }
  if (totalDaysRequested.value === 0) return "newRequest.validation.noWorkingDays";

  if (!vacationCheck.value.valid) {
    return vacationCheck.value.reason === "exceeds_max_excess"
      ? "requests.exceedsAllowed"
      : "requests.exceedsAvailable";
  }
  return null;
});

const isValid = computed(() => blockingProblem.value === null);

// Add a new period
function addPeriod() {
  periods.value.push(emptyPeriod());
}

// Remove a period
function removePeriod(index: number) {
  if (periods.value.length > 1) {
    periods.value.splice(index, 1);
  }
}

// Keep each period coherent: the end never precedes the start, and a partial absence
// (a few hours off) is a single day.
watch(
  () => periods.value,
  (newPeriods) => {
    newPeriods.forEach((period) => {
      if (!period.startDate) return;
      if (period.isPartial || !period.endDate || period.endDate < period.startDate) {
        if (period.endDate !== period.startDate) period.endDate = period.startDate;
      }
    });
  },
  { deep: true }
);

async function handleSubmit() {
  if (!isValid.value) return;

  // Get overall date range from all periods
  const allStartDates = periods.value.map(p => p.startDate).filter(Boolean).sort();
  const allEndDates = periods.value.map(p => p.endDate).filter(Boolean).sort();
  const single = periods.value.length === 1 && periods.value[0].isPartial ? periods.value[0] : null;

  const requestData = {
    absence_type_id: selectedAbsenceType.value,
    start_date: allStartDates[0] ?? null,
    end_date: allEndDates[allEndDates.length - 1] ?? null,
    is_partial: !!single,
    start_time: single ? single.startTime : null,
    end_time: single ? single.endTime : null,
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
  } else {
    // Bring the reasons into view: on a phone the form is taller than the screen.
    await nextTick();
    serverErrors.value?.scrollIntoView?.({ block: "center" });
    serverErrors.value?.focus();
  }
}

function goBack() {
  router.push("/requests");
}

async function loadCompanySettings() {
  const employeeId = authStore.currentEmployee?.id;
  if (!employeeId) return;

  try {
    const response = await api.get(`/employees/${employeeId}/company-settings`);
    const data = unwrap<any>(response);
    companyAdvanceDays.value = data?.vacationRequestAdvanceDays ?? 0;
    allowVacationExcess.value = data?.allowVacationExcess === true;
    maxVacationExcessDays.value = data?.maxVacationExcessDays ?? null;
    settingsLoaded.value = true;
  } catch {
    // Without the settings the form cannot pre-check notice days or balance; the API
    // still does, and its message is shown on submit.
    settingsLoaded.value = false;
  }
}

const serverErrors = ref<HTMLElement | null>(null);

onMounted(async () => {
  // Left over from an earlier visit to either request form.
  absencesStore.submitErrors = [];
  try {
    await Promise.all([absencesStore.fetchAbsenceTypes(), loadCompanySettings()]);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <div class="mb-6">
      <button
        type="button"
        @click="goBack"
        class="flex items-center text-neutral-600 hover:text-neutral-800 mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
        {{ $t('newRequest.backToRequests') }}
      </button>
      <h1 class="text-2xl font-bold text-neutral-800">{{ $t('newRequest.title') }}</h1>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64" role="status">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      <span class="sr-only">{{ $t('common.loading') }}</span>
    </div>

    <!-- Form -->
    <div v-else class="bg-white rounded-lg shadow p-6 max-w-2xl">
      <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
        <!-- Absence Type -->
        <div>
          <label for="absenceType" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ $t('newRequest.absenceType') }} <span class="text-red-500" aria-hidden="true">*</span>
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
            class="border rounded-lg p-4 space-y-4"
            :class="overlapsAnother(index) ? 'border-red-300' : 'border-neutral-200'"
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
                class="text-red-600 hover:text-red-700 p-2.5 -m-1.5 rounded hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                :title="$t('requests.removePeriod')"
                :aria-label="`${$t('requests.removePeriod')} ${index + 1}`"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <!-- Date Range -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label :for="`startDate-${index}`" class="block text-sm font-medium text-neutral-700 mb-1">
                  {{ $t('newRequest.startDate') }} <span class="text-red-500" aria-hidden="true">*</span>
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
                  {{ $t('newRequest.endDate') }} <span class="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  type="date"
                  :id="`endDate-${index}`"
                  v-model="period.endDate"
                  :min="period.startDate || minDate"
                  :disabled="period.isPartial"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100 disabled:text-neutral-500"
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
                  {{ $t('newRequest.startTime') }} <span class="text-red-500" aria-hidden="true">*</span>
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
                  {{ $t('newRequest.endTime') }} <span class="text-red-500" aria-hidden="true">*</span>
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

            <p v-if="overlapsAnother(index)" class="text-sm text-red-600">
              {{ $t('newRequest.validation.periodsOverlap') }}
            </p>
          </div>

          <!-- Add period button -->
          <button
            type="button"
            @click="addPeriod"
            class="w-full py-2 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            {{ $t('requests.addPeriod') }}
          </button>
        </div>

        <!-- Total days summary -->
        <div v-if="hasCompleteDates" class="p-3 bg-neutral-50 rounded-md border border-neutral-200">
          <p class="text-sm text-neutral-700">
            <span class="font-medium">{{ $t('newRequest.daysRequested') }}:</span>
            {{ totalDaysRequested }} {{ $t('profile.days') }}
          </p>
          <p v-if="businessDaysOnly" class="text-xs text-neutral-500 mt-1">
            {{ $t('newRequest.businessDaysHint') }}
          </p>

          <!-- Within the company's allowed excess: fine, but worth knowing -->
          <p
            v-if="affectsVacationBalance && vacationCheck.valid && vacationCheck.excess > 0"
            class="text-sm text-amber-700 mt-2"
          >
            {{ $t('requests.willUseExcess', { days: vacationCheck.excess }) }}
          </p>
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
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-amber-700">
              {{ $t('newRequest.requiresApproval') }}
            </p>
          </div>
        </div>

        <!-- What the API refused, all of it, where the form is: a toast showed one and left -->
        <div
          v-if="absencesStore.submitErrors.length"
          ref="serverErrors"
          class="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700"
          role="alert"
          tabindex="-1"
        >
          <p class="font-medium">{{ $t('newRequest.serverErrorsTitle') }}</p>
          <ul class="mt-1 list-disc pl-5 space-y-0.5">
            <li v-for="message in absencesStore.submitErrors" :key="message">{{ message }}</li>
          </ul>
        </div>

        <!-- Submit buttons -->
        <div class="pt-4 border-t border-neutral-200">
          <!-- Says why the button is disabled instead of leaving it unexplained -->
          <p
            v-if="blockingProblem"
            id="request-blocking-problem"
            class="text-sm mb-3"
            :class="vacationCheck.valid ? 'text-neutral-600' : 'text-red-600'"
            role="status"
          >
            {{ $t(blockingProblem) }}
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              :disabled="!isValid || isSubmitting"
              :aria-describedby="blockingProblem ? 'request-blocking-problem' : undefined"
              class="flex-1 px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="isSubmitting" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
        </div>
      </form>
    </div>
  </div>
</template>
