<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAbsencesStore } from '../stores/absences';
import { useAuthStore } from '../stores/auth';
import { format, parseISO, subMonths } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import AbsenceCalendar from '../components/AbsenceCalendar.vue';

const { t, locale } = useI18n();

const absencesStore = useAbsencesStore();
const authStore = useAuthStore();
const loading = computed(() => absencesStore.loading);
const viewMode = ref('list'); // or 'calendar'

// Vacation days info
const remainingVacationDays = computed(() => authStore.remainingVacationDays);
const maxVacationDays = computed(() => authStore.currentCompany?.max_vacation_days ?? 22);

// Absences by type (excluding vacation, only approved)
const absenceCountsByType = computed(() => {
  const counts: Record<string, { name: string; count: number; code: string }> = {};

  absencesStore.absences
    .filter(absence =>
      absence.absenceType?.code !== 'vacation' &&
      (!absence.request || absence.request.status === 'approved')
    )
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

// Date locale
const dateLocale = computed(() => locale.value === "es" ? es : enUS);

// Filter states
const selectedType = ref('all');
const startDate = ref(format(subMonths(new Date(), 6), 'yyyy-MM-dd'));
const endDate = ref(format(new Date(), 'yyyy-MM-dd'));

// Filtered absences
const filteredAbsences = computed(() => {
  if (!absencesStore.absences.length) return [];
  
  return absencesStore.absences.filter(absence => {
    const matchesType = selectedType.value === 'all' || 
      absence.absenceType?.id === selectedType.value;
    
    const absenceDate = parseISO(absence.date);
    const isAfterStart = parseISO(startDate.value) <= absenceDate;
    const isBeforeEnd = parseISO(endDate.value) >= absenceDate;
    
    return matchesType && isAfterStart && isBeforeEnd;
  });
});

// Format absence duration
function formatAbsenceDuration(absence: any) {
  if (!absence.is_partial) return t('absences.fullDay');

  if (absence.start_time && absence.end_time) {
    return `${format(parseISO(absence.start_time), 'h:mm a')} - ${format(parseISO(absence.end_time), 'h:mm a')}`;
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

onMounted(async () => {
  if (absencesStore.absenceTypes.length === 0) {
    await absencesStore.fetchAbsenceTypes();
  }

  if (absencesStore.absences.length === 0) {
    await absencesStore.fetchAbsences();
  }

  // Also fetch pending requests for the calendar
  await absencesStore.fetchPendingRequests();
});
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
              {{ $t('absences.daysAvailable', { remaining: remainingVacationDays, total: maxVacationDays }) }}
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
      <div class="bg-white rounded-lg shadow p-1 inline-flex">
        <button
          @click="viewMode = 'list'"
          class="px-3 py-1 rounded-md text-sm font-medium transition-colors"
          :class="viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          {{ $t('absences.list') }}
        </button>
        <button
          @click="viewMode = 'calendar'"
          class="px-3 py-1 rounded-md text-sm font-medium transition-colors"
          :class="viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
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
        <div v-if="loading" class="p-8 flex justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="filteredAbsences.length === 0" class="p-8 text-center">
          <div class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 text-neutral-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-neutral-800">{{ $t('absences.noAbsences') }}</h3>
          <p class="text-neutral-600 mt-1">
            {{ absencesStore.absences.length === 0 ? $t('absences.noRecordedAbsences') : $t('absences.noMatchFilter') }}
          </p>
        </div>
        
        <!-- Absences Table -->
        <div v-else class="overflow-x-auto">
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
                  {{ $t('absences.status') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {{ $t('workLogs.notes') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-neutral-200">
              <tr v-for="absence in filteredAbsences" :key="absence.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800">
                  {{ format(parseISO(absence.date), 'MMM d, yyyy', { locale: dateLocale }) }}
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
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span v-if="absence.request?.status" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="{
                          'bg-green-100 text-green-800': absence.request.status === 'approved',
                          'bg-yellow-100 text-yellow-800': absence.request.status === 'pending',
                          'bg-red-100 text-red-800': absence.request.status === 'rejected'
                        }">
                    {{ absence.request.status.charAt(0).toUpperCase() + absence.request.status.slice(1) }}
                  </span>
                  <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Approved
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {{ absence.notes || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>