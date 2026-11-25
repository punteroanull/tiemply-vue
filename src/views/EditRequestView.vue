<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAbsencesStore } from "../stores/absences";
import { useAuthStore } from "../stores/auth";
import { apiDateToYmd, formatApiDate, formatClockTime } from "../utils/apiDates";
import { countRequestDays, earliestRequestDate } from "../utils/requestDates";

const router = useRouter();
const route = useRoute();
const absencesStore = useAbsencesStore();
const authStore = useAuthStore();

// Request ID from route
const requestId = computed(() => route.params.id as string);

interface FormValues {
  startDate: string;
  endDate: string;
  isPartial: boolean;
  startTime: string;
  endTime: string;
  notes: string;
}

// Form data
const startDate = ref("");
const endDate = ref("");
const isPartial = ref(false);
const startTime = ref("");
const endTime = ref("");
const notes = ref("");
const originalStatus = ref("");
/** What the request held when it was loaded, to send only what actually changed. */
const original = ref<FormValues | null>(null);

// The type cannot be changed once requested (the API ignores it), so it is shown, not edited.
const absenceTypeId = ref("");
const absenceTypeName = ref("");

// UI state
const isSubmitting = computed(() => absencesStore.submitting);
const isLoading = ref(true);
const loadError = ref(false);

/** A period-based request: this single-range form cannot represent it. */
const unsupportedFormat = ref(false);

// Check if request can be edited (only pending requests)
const canEdit = computed(() => originalStatus.value === "pending");

// Get employee's remaining vacation days
const remainingVacationDays = computed(() => authStore.remainingVacationDays);

const businessDaysOnly = computed(
  () => authStore.currentCompany?.vacationType === "business_days"
);

// Get selected absence type details
const selectedTypeDetails = computed(() => {
  return absencesStore.absenceTypes.find((type) => type.id === absenceTypeId.value);
});

// Check if selected type affects vacation balance
const affectsVacationBalance = computed(() => {
  return selectedTypeDetails.value?.affectsVacationBalance ?? false;
});

// Days requested, counted as the API counts them
const daysRequested = computed(() =>
  countRequestDays(startDate.value, endDate.value, businessDaysOnly.value)
);

const datesChanged = computed(
  () =>
    !!original.value &&
    (startDate.value !== original.value.startDate || endDate.value !== original.value.endDate)
);

const timesChanged = computed(
  () =>
    !!original.value &&
    (isPartial.value !== original.value.isPartial ||
      (isPartial.value &&
        (startTime.value !== original.value.startTime || endTime.value !== original.value.endTime)))
);

const notesChanged = computed(() => !!original.value && notes.value !== original.value.notes);

const hasChanges = computed(() => datesChanged.value || timesChanged.value || notesChanged.value);

// Earliest start the API accepts. It only checks the start date when it is sent, so a
// request that already started can still have its notes or end date edited.
const minStartDate = computed(() =>
  earliestRequestDate(
    selectedTypeDetails.value?.code,
    authStore.currentCompany?.vacationRequestAdvanceDays ?? 0
  )
);

/** What still stops saving, as a translation key with its parameters; null when ready. */
const blockingProblem = computed<{ key: string; params?: Record<string, unknown> } | null>(() => {
  if (!startDate.value || !endDate.value) return { key: "newRequest.validation.datesRequired" };
  if (startDate.value > endDate.value) return { key: "newRequest.validation.endBeforeStart" };
  if (isPartial.value) {
    if (!startTime.value || !endTime.value) return { key: "newRequest.validation.timesRequired" };
    if (endTime.value <= startTime.value) return { key: "newRequest.validation.endTimeBeforeStart" };
  }
  if (datesChanged.value && startDate.value < minStartDate.value) {
    return {
      key: "newRequest.validation.startTooEarly",
      params: { date: formatApiDate(minStartDate.value) },
    };
  }
  return null;
});

const isValid = computed(() => blockingProblem.value === null);

// Keep the range coherent: the end never precedes the start, and a partial absence
// (a few hours off) is a single day.
watch([startDate, isPartial], ([newStartDate, partial]) => {
  if (!newStartDate) return;
  if (partial || !endDate.value || endDate.value < newStartDate) {
    endDate.value = newStartDate;
  }
});

async function loadRequest() {
  const request = await absencesStore.fetchRequestById(requestId.value);

  if (!request) {
    loadError.value = true;
    return;
  }

  // This form edits a single date range. A period-based request keeps its dates in
  // `periods` and has none of its own, so it cannot be represented here: loading it would
  // show empty dates and saving would collapse every period into one range.
  if (request.usesPeriods || request.periods?.length || !request.startDate) {
    unsupportedFormat.value = true;
    return;
  }

  // The API sends dates as instants; a date input only takes "yyyy-MM-dd".
  const start = apiDateToYmd(request.startDate) ?? "";
  const values: FormValues = {
    startDate: start,
    endDate: apiDateToYmd(request.endDate) ?? start,
    isPartial: !!request.isPartial,
    startTime: formatClockTime(request.startTime),
    endTime: formatClockTime(request.endTime),
    notes: request.notes || "",
  };

  original.value = values;
  startDate.value = values.startDate;
  endDate.value = values.endDate;
  isPartial.value = values.isPartial;
  startTime.value = values.startTime;
  endTime.value = values.endTime;
  notes.value = values.notes;
  absenceTypeId.value = request.absenceTypeId;
  absenceTypeName.value = request.absenceType?.name ?? "";
  originalStatus.value = request.status;
}

async function handleSubmit() {
  if (!isValid.value || !canEdit.value) return;

  if (!hasChanges.value) {
    router.push("/requests");
    return;
  }

  // Only what changed. The API re-validates the start date against the notice rule
  // whenever it receives one, so sending untouched dates made a notes-only edit fail.
  const requestData: Record<string, unknown> = {};
  if (datesChanged.value) {
    requestData.start_date = startDate.value;
    requestData.end_date = endDate.value;
  }
  if (timesChanged.value) {
    requestData.is_partial = isPartial.value;
    requestData.start_time = isPartial.value ? startTime.value : null;
    requestData.end_time = isPartial.value ? endTime.value : null;
  }
  if (notesChanged.value) {
    requestData.notes = notes.value || null;
  }

  const success = await absencesStore.updateRequest(requestId.value, requestData);

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

const serverErrors = ref<HTMLElement | null>(null);

onMounted(async () => {
  // Left over from an earlier visit to either request form.
  absencesStore.submitErrors = [];
  try {
    await Promise.all([absencesStore.fetchAbsenceTypes(), loadRequest()]);
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
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
        {{ $t('newRequest.backToRequests') }}
      </button>
      <h1 class="text-2xl font-bold text-neutral-800">{{ $t('requests.editRequest') }}</h1>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64" role="status">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      <span class="sr-only">{{ $t('common.loading') }}</span>
    </div>

    <!-- Error state -->
    <div v-else-if="loadError" class="bg-red-50 rounded-lg p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-lg font-medium text-red-800 mb-2">{{ $t('requests.requestNotFound') }}</h3>
      <button type="button" @click="goBack" class="text-primary-600 hover:text-primary-800 font-medium">
        {{ $t('newRequest.backToRequests') }}
      </button>
    </div>

    <!-- Period-based request: not editable from this single-range form -->
    <div v-else-if="unsupportedFormat" class="bg-amber-50 rounded-lg p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 class="text-lg font-medium text-amber-800 mb-2">{{ $t('requests.cannotEditPeriods') }}</h3>
      <button type="button" @click="goBack" class="text-primary-600 hover:text-primary-800 font-medium">
        {{ $t('newRequest.backToRequests') }}
      </button>
    </div>

    <!-- Cannot edit warning -->
    <div v-else-if="!canEdit" class="bg-amber-50 rounded-lg p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 class="text-lg font-medium text-amber-800 mb-2">{{ $t('requests.cannotEditApproved') }}</h3>
      <button type="button" @click="goBack" class="text-primary-600 hover:text-primary-800 font-medium">
        {{ $t('newRequest.backToRequests') }}
      </button>
    </div>

    <!-- Form -->
    <div v-else class="bg-white rounded-lg shadow p-6 max-w-2xl">
      <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
        <!-- Absence Type: fixed once requested -->
        <div>
          <span class="block text-sm font-medium text-neutral-700 mb-1">
            {{ $t('newRequest.absenceType') }}
          </span>
          <p class="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-neutral-800">
            {{ absenceTypeName || selectedTypeDetails?.name || $t('absences.absence') }}
          </p>
          <p class="text-xs text-neutral-500 mt-1">{{ $t('requests.typeLocked') }}</p>

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
              {{ $t('newRequest.startDate') }} <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              v-model="startDate"
              :min="original && original.startDate < minStartDate ? original.startDate : minStartDate"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label for="endDate" class="block text-sm font-medium text-neutral-700 mb-1">
              {{ $t('newRequest.endDate') }} <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              v-model="endDate"
              :min="startDate"
              :disabled="isPartial"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100 disabled:text-neutral-500"
              required
            />
          </div>
        </div>

        <!-- Days summary -->
        <div v-if="startDate && endDate" class="p-3 bg-neutral-50 rounded-md">
          <p class="text-sm text-neutral-700">
            <span class="font-medium">{{ $t('newRequest.daysRequested') }}:</span> {{ daysRequested }} {{ $t('profile.days') }}
          </p>
          <p v-if="businessDaysOnly" class="text-xs text-neutral-500 mt-1">
            {{ $t('newRequest.businessDaysHint') }}
          </p>
          <!-- A warning only: whether the excess is allowed is the API's call on review -->
          <p v-if="affectsVacationBalance && daysRequested > remainingVacationDays" class="text-sm text-amber-700 mt-1">
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
              {{ $t('newRequest.startTime') }} <span class="text-red-500" aria-hidden="true">*</span>
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
              {{ $t('newRequest.endTime') }} <span class="text-red-500" aria-hidden="true">*</span>
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
        <p v-if="blockingProblem" id="edit-blocking-problem" class="text-sm text-red-600" role="status">
          {{ $t(blockingProblem.key, blockingProblem.params ?? {}) }}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
          <button
            type="submit"
            :disabled="!isValid || isSubmitting"
            :aria-describedby="blockingProblem ? 'edit-blocking-problem' : undefined"
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
