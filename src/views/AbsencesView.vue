<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAbsencesStore } from '../stores/absences';
import type { Absence } from '../stores/absences';
import { useAuthStore } from '../stores/auth';
import { addMonths, format, subMonths } from 'date-fns';
import AbsenceCalendar from '../components/AbsenceCalendar.vue';
import ErrorState from '../components/ErrorState.vue';
import { apiDateToYmd, formatApiDate, formatClockTime } from '../utils/apiDates';

const { t } = useI18n();

const absencesStore = useAbsencesStore();
const authStore = useAuthStore();
const loading = computed(() => absencesStore.loading);
const viewMode = ref<'list' | 'calendar'>('list');

// Vacation days info. /me arrives camelCased, so the company's yearly allowance is
// `maxVacationDays`; reading the snake_case name always fell back to 22.
const remainingVacationDays = computed(() => authStore.remainingVacationDays);
const maxVacationDays = computed(
  () => authStore.currentCompany?.maxVacationDays ?? null
);

// Absences by type (excluding vacation)
const absenceCountsByType = computed(() => {
  const counts: Record<string, { name: string; count: number; code: string }> = {};

  absencesStore.absences
    .filter(absence => absence.absenceType?.code !== 'vacation')
    .forEach(absence => {
      const typeId = absence.absenceType?.id;
      if (typeId && absence.absenceType) {
        if (!counts[typeId]) {
          counts[typeId] = {
            name: absence.absenceType.name,
            count: 0,
            code: absence.absenceType.code
          };
        }
        counts[typeId].count++;
      }
    });

  return Object.values(counts);
});

// Get color classes for absence type
function getTypeColorClasses(code: string) {
  switch (code) {
    case 'sick_leave':
      return { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100' };
    case 'personal_leave':
      return { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' };
    default:
      return { bg: 'bg-neutral-50', text: 'text-neutral-600', icon: 'bg-neutral-100' };
  }
}

// Filter states. The window looks ahead as well as back: approved vacation is almost
// always in the future, and a range ending today hid exactly that.
const selectedType = ref('all');
const startDate = ref(format(subMonths(new Date(), 6), 'yyyy-MM-dd'));
const endDate = ref(format(addMonths(new Date(), 12), 'yyyy-MM-dd'));

// Filtered absences, soonest first within the window
const filteredAbsences = computed(() => {
  return absencesStore.absences
    .filter(absence => {
      const matchesType = selectedType.value === 'all' ||
        absence.absenceType?.id === selectedType.value;

      // Compare calendar days as "yyyy-MM-dd": the API date is an instant, not a day.
      const day = apiDateToYmd(absence.date);
      if (!day) return false;
      const isAfterStart = !startDate.value || startDate.value <= day;
      const isBeforeEnd = !endDate.value || endDate.value >= day;

      return matchesType && isAfterStart && isBeforeEnd;
    })
    .sort((a, b) => (apiDateToYmd(b.date) ?? '').localeCompare(apiDateToYmd(a.date) ?? ''));
});

// Format absence duration. Times arrive as "HH:mm" strings, not as dates.
function formatAbsenceDuration(absence: Absence) {
  if (!absence.isPartial) return t('absences.fullDay');

  if (absence.startTime && absence.endTime) {
    return `${formatClockTime(absence.startTime)} - ${formatClockTime(absence.endTime)}`;
  }

  return t('absences.partialDay');
}

// Get absence type badge class
function getAbsenceTypeClass(type: string | undefined) {
  switch (type) {
    case 'vacation':
      return 'bg-blue-100 text-blue-800';
    case 'sick_leave':
      return 'bg-red-100 text-red-800';
    case 'personal_leave':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-neutral-100 text-neutral-800';
  }
}

async function load() {
  // Always refetch: absences get approved while the app stays open.
  await Promise.all([
    absencesStore.absenceTypes.length === 0 ? absencesStore.fetchAbsenceTypes() : Promise.resolve(),
    absencesStore.fetchAbsences(),
    // Pending requests, for the calendar
    absencesStore.fetchPendingRequests(),
  ]);
}

onMounted(load);
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-neutral-800">{{ $t('absences.title') }}</h1>
      <p class="text-neutral-600 mt-1">{{ $t('absences.viewAndFilter') }}</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Vacation Days Card -->
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-neutral-500">{{ $t('absences.vacationAvailable') }}</p>
            <p class="text-xl font-bold text-blue-600">
              <template v-if="maxVacationDays !== null">
                {{ $t('absences.daysAvailable', { remaining: remainingVacationDays, total: maxVacationDays }) }}
              </template>
              <template v-else>
                {{ $t('requests.daysCount', { count: remainingVacationDays }) }}
              </template>
            </p>
          </div>
        </div>
      </div>

      <!-- Other Absence Types Cards -->
      <div
        v-for="absenceType in absenceCountsByType"
        :key="absenceType.code"
        class="bg-white rounded-lg shadow p-4 border-l-4"
        :class="{
          'border-red-500': absenceType.code === 'sick_leave',
          'border-purple-500': absenceType.code === 'personal_leave',
          'border-neutral-400': absenceType.code !== 'sick_leave' && absenceType.code !== 'personal_leave'
        }"
      >
        <div class="flex items-center">
          <div
            class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
            :class="getTypeColorClasses(absenceType.code).icon"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="getTypeColorClasses(absenceType.code).text" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-neutral-500">{{ absenceType.name }}</p>
            <p class="text-xl font-bold" :class="getTypeColorClasses(absenceType.code).text">
              {{ $t('absences.daysUsed', { count: absenceType.count }) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- View Mode Toggle -->
    <div class="flex justify-end mb-4">
      <div class="bg-white rounded-lg shadow p-1 inline-flex" role="group">
        <button
          type="button"
          @click="viewMode = 'list'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
          :aria-pressed="viewMode === 'list'"
        >
          {{ $t('absences.list') }}
        </button>
        <button
          type="button"
          @click="viewMode = 'calendar'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
          :aria-pressed="viewMode === 'calendar'"
        >
          {{ $t('absences.calendar') }}
        </button>
      </div>
    </div>
    
    <!-- Calendar View -->
    <div v-if="viewMode === 'calendar'" class="mb-6">
      <AbsenceCalendar :absences="absencesStore.absences" :requests="absencesStore.pendingRequests" />
    </div>
    
    <!-- List View -->
    <div v-if="viewMode === 'list'">
      <div class="bg-white rounded-lg shadow-subtle overflow-hidden">
        <!-- Filters -->
        <div class="border-b border-neutral-200 p-4 bg-neutral-50">
          <div class="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
            <div class="w-full md:w-1/3">
              <label for="type-filter" class="label">{{ $t('absences.absenceType') }}</label>
              <select
                id="type-filter"
                v-model="selectedType"
                class="input"
              >
                <option value="all">{{ $t('absences.allTypes') }}</option>
                <option
                  v-for="type in absencesStore.absenceTypes"
                  :key="type.id"
                  :value="type.id"
                >
                  {{ type.name }}
                </option>
              </select>
            </div>

            <div class="w-full md:w-1/3">
              <label for="start-date" class="label">{{ $t('absences.from') }}</label>
              <input
                id="start-date"
                v-model="startDate"
                type="date"
                class="input"
              />
            </div>

            <div class="w-full md:w-1/3">
              <label for="end-date" class="label">{{ $t('absences.to') }}</label>
              <input
                id="end-date"
                v-model="endDate"
                type="date"
                class="input"
              />
            </div>
          </div>
        </div>
        
        <!-- Loading state -->
        <div v-if="loading" class="p-8 flex justify-center" role="status">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          <span class="sr-only">{{ $t('common.loading') }}</span>
        </div>

        <!-- Error state: a failed load is not "no absences" -->
        <ErrorState v-else-if="absencesStore.absencesError" class="shadow-none" @retry="load" />

        <!-- Empty state -->
        <div v-else-if="filteredAbsences.length === 0" class="p-8 text-center">
          <div class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 text-neutral-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-neutral-800">{{ $t('absences.noAbsences') }}</h3>
          <p class="text-neutral-600 mt-1">
            {{ absencesStore.absences.length === 0 ? $t('absences.noRecordedAbsences') : $t('absences.noMatchFilter') }}
          </p>
        </div>

        <template v-else>
          <!-- Absences Table - Desktop -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead class="bg-neutral-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ $t('workLogs.date') }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ $t('requests.type') }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ $t('absences.duration') }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ $t('workLogs.notes') }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-neutral-200">
                <tr v-for="absence in filteredAbsences" :key="absence.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800">
                    {{ formatApiDate(absence.date) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getAbsenceTypeClass(absence.absenceType?.code)">
                      {{ absence.absenceType?.name || t('absences.absence') }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {{ formatAbsenceDuration(absence) }}
                  </td>
                  <td class="px-6 py-4 text-sm text-neutral-600 max-w-xs truncate" :title="absence.notes || undefined">
                    {{ absence.notes || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="md:hidden divide-y divide-neutral-200">
            <div v-for="absence in filteredAbsences" :key="absence.id" class="p-4">
              <div class="flex items-start justify-between gap-2 mb-1">
                <span class="font-medium text-neutral-800">{{ formatApiDate(absence.date) }}</span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                      :class="getAbsenceTypeClass(absence.absenceType?.code)">
                  {{ absence.absenceType?.name || t('absences.absence') }}
                </span>
              </div>
              <p class="text-sm text-neutral-600">{{ formatAbsenceDuration(absence) }}</p>
              <p v-if="absence.notes" class="mt-1 text-sm text-neutral-500 break-words">{{ absence.notes }}</p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
