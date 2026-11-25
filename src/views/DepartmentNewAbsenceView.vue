<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDepartmentsStore } from "../stores/departments";
import { useAbsencesStore } from "../stores/absences";

const router = useRouter();
const departmentsStore = useDepartmentsStore();
const absencesStore = useAbsencesStore();

// Form data
const selectedEmployee = ref("");
const selectedAbsenceType = ref("");
const absenceDate = ref("");
const isPartial = ref(false);
const startTime = ref("");
const endTime = ref("");
const notes = ref("");

const isSubmitting = computed(() => departmentsStore.submitting);
const loading = computed(() => departmentsStore.loading);
const employees = computed(() => departmentsStore.employees);
const canManage = computed(() => departmentsStore.canManageDepartment);
const hasDepartment = computed(() => !!departmentsStore.currentDepartmentId);

/**
 * What still stops the absence from being registered, as a translation key, so a disabled
 * button never goes unexplained. Null when the form is ready.
 */
const blockingProblem = computed<string | null>(() => {
  if (!selectedEmployee.value) return "department.validation.selectEmployee";
  if (!selectedAbsenceType.value) return "newRequest.validation.selectType";
  if (!absenceDate.value) return "department.validation.dateRequired";
  if (isPartial.value) {
    if (!startTime.value || !endTime.value) return "newRequest.validation.timesRequired";
    // The API rejects an end time that is not after the start; say so before sending.
    if (endTime.value <= startTime.value) return "newRequest.validation.endTimeBeforeStart";
  }
  return null;
});

const isValid = computed(() => blockingProblem.value === null);

async function handleSubmit() {
  if (!isValid.value) return;

  const data = {
    employee_id: selectedEmployee.value,
    absence_type_id: selectedAbsenceType.value,
    date: absenceDate.value,
    is_partial: isPartial.value,
    start_time: isPartial.value ? startTime.value : undefined,
    end_time: isPartial.value ? endTime.value : undefined,
    notes: notes.value || undefined,
  };

  const success = await departmentsStore.createDirectAbsence(data);

  if (success) {
    router.push("/department/absences");
  }
}

function goBack() {
  router.push("/department/absences");
}

onMounted(async () => {
  if (!canManage.value) {
    router.push("/department");
    return;
  }
  if (!hasDepartment.value) return;

  await Promise.all([
    departmentsStore.fetchEmployees(),
    absencesStore.absenceTypes.length === 0 ? absencesStore.fetchAbsenceTypes() : Promise.resolve(),
  ]);
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
        <svg class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clip-rule="evenodd"
          />
        </svg>
        {{ $t("common.back") }}
      </button>
      <h1 class="text-2xl font-bold text-neutral-800">
        {{ $t("department.registerAbsence") }}
      </h1>
      <p class="text-neutral-600 mt-1">
        {{ $t("department.registerAbsenceDescription") }}
      </p>
    </div>

    <!-- Not in a department: there is nobody to register an absence for -->
    <div v-if="!hasDepartment" class="bg-white rounded-lg shadow p-8 text-center max-w-2xl">
      <h3 class="text-lg font-medium text-neutral-800 mb-2">
        {{ $t("department.noDepartment") }}
      </h3>
      <p class="text-neutral-600">{{ $t("department.noDepartmentDescription") }}</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex justify-center items-center h-64" role="status">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"
      ></div>
      <span class="sr-only">{{ $t("common.loading") }}</span>
    </div>

    <!-- Form -->
    <div v-else class="bg-white rounded-lg shadow p-6 max-w-2xl">
      <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
        <!-- Employee Select -->
        <div>
          <label for="new-absence-employee" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ $t("department.employee") }}
            <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="new-absence-employee"
            v-model="selectedEmployee"
            required
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="" disabled>
              {{ $t("department.selectEmployee") }}
            </option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.user?.name || $t("common.unknown") }}
            </option>
          </select>
        </div>

        <!-- Absence Type -->
        <div>
          <label for="new-absence-type" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ $t("newRequest.absenceType") }}
            <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="new-absence-type"
            v-model="selectedAbsenceType"
            required
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="" disabled>{{ $t("newRequest.selectType") }}</option>
            <option
              v-for="type in absencesStore.absenceTypes"
              :key="type.id"
              :value="type.id"
            >
              {{ type.name }}
            </option>
          </select>
        </div>

        <!-- Date -->
        <div>
          <label for="new-absence-date" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ $t("workLogs.date") }}
            <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="new-absence-date"
            type="date"
            v-model="absenceDate"
            required
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <!-- Partial Checkbox -->
        <div>
          <label class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="isPartial"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
            />
            <span class="ml-2 text-sm text-neutral-700">{{
              $t("newRequest.partialAbsence")
            }}</span>
          </label>
          <p class="text-xs text-neutral-500 mt-1 ml-6">
            {{ $t("newRequest.partialHint") }}
          </p>
        </div>

        <!-- Time Range (if partial) -->
        <div
          v-if="isPartial"
          class="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 border-l-2 border-primary-200"
        >
          <div>
            <label for="new-absence-start-time" class="block text-sm font-medium text-neutral-700 mb-1">
              {{ $t("newRequest.startTime") }}
              <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="new-absence-start-time"
              type="time"
              v-model="startTime"
              required
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label for="new-absence-end-time" class="block text-sm font-medium text-neutral-700 mb-1">
              {{ $t("newRequest.endTime") }}
              <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="new-absence-end-time"
              type="time"
              :min="startTime || undefined"
              v-model="endTime"
              required
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label for="new-absence-notes" class="block text-sm font-medium text-neutral-700 mb-1">{{
            $t("newRequest.notes")
          }}</label>
          <textarea
            id="new-absence-notes"
            v-model="notes"
            rows="3"
            maxlength="500"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            :placeholder="$t('newRequest.notesPlaceholder')"
          ></textarea>
          <p class="text-xs text-neutral-500 mt-1">
            {{ notes.length }}/500 {{ $t("newRequest.characters") }}
          </p>
        </div>

        <!-- Submit -->
        <p v-if="blockingProblem" id="new-absence-problem" class="text-sm text-neutral-600" role="status">
          {{ $t(blockingProblem) }}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <button
            type="submit"
            :disabled="!isValid || isSubmitting"
            :aria-describedby="blockingProblem ? 'new-absence-problem' : undefined"
            class="flex-1 px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="isSubmitting" class="flex items-center justify-center">
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
              {{ $t("common.loading") }}
            </span>
            <span v-else>{{ $t("department.registerAbsence") }}</span>
          </button>
          <button
            type="button"
            @click="goBack"
            class="px-4 py-2 bg-neutral-100 text-neutral-700 font-medium rounded-md hover:bg-neutral-200 transition-colors"
          >
            {{ $t("common.cancel") }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
