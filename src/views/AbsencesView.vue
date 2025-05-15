<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAbsencesStore } from '../stores/absences';
import { format, parseISO, subMonths } from 'date-fns';
import AbsenceCalendar from '../components/AbsenceCalendar.vue';

const absencesStore = useAbsencesStore();
const loading = computed(() => absencesStore.loading);
const viewMode = ref('list'); // or 'calendar'

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
  if (!absence.is_partial) return 'Full day';
  
  if (absence.start_time && absence.end_time) {
    return `${format(parseISO(absence.start_time), 'h:mm a')} - ${format(parseISO(absence.end_time), 'h:mm a')}`;
  }
  
  return 'Partial day';
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
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-neutral-800">Absences</h1>
      <p class="text-neutral-600 mt-1">View and filter your absences</p>
    </div>
    
    <!-- View Mode Toggle -->
    <div class="flex justify-end mb-4">
      <div class="bg-white rounded-lg shadow p-1 inline-flex">
        <button
          @click="viewMode = 'list'"
          class="px-3 py-1 rounded-md text-sm font-medium transition-colors"
          :class="viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          List
        </button>
        <button
          @click="viewMode = 'calendar'"
          class="px-3 py-1 rounded-md text-sm font-medium transition-colors"
          :class="viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          Calendar
        </button>
      </div>
    </div>
    
    <!-- Calendar View -->
    <div v-if="viewMode === 'calendar'" class="mb-6">
      <AbsenceCalendar :absences="absencesStore.absences" />
    </div>
    
    <!-- List View -->
    <div v-if="viewMode === 'list'">
      <div class="bg-white rounded-lg shadow-subtle overflow-hidden">
        <!-- Filters -->
        <div class="border-b border-neutral-200 p-4 bg-neutral-50">
          <div class="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
            <div class="w-full md:w-1/3">
              <label for="type-filter" class="label">Absence Type</label>
              <select 
                id="type-filter" 
                v-model="selectedType" 
                class="input"
              >
                <option value="all">All Types</option>
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
              <label for="start-date" class="label">From</label>
              <input 
                id="start-date" 
                v-model="startDate" 
                type="date" 
                class="input"
              />
            </div>
            
            <div class="w-full md:w-1/3">
              <label for="end-date" class="label">To</label>
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
          <h3 class="text-lg font-medium text-neutral-800">No absences found</h3>
          <p class="text-neutral-600 mt-1">
            {{ absencesStore.absences.length === 0 ? 'You have no recorded absences.' : 'No absences match your filter criteria.' }}
          </p>
        </div>
        
        <!-- Absences Table -->
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-neutral-200">
            <thead class="bg-neutral-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-neutral-200">
              <tr v-for="absence in filteredAbsences" :key="absence.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800">
                  {{ format(parseISO(absence.date), 'MMM d, yyyy') }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="getAbsenceTypeClass(absence.absenceType?.code)">
                    {{ absence.absenceType?.name || 'Unknown' }}
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