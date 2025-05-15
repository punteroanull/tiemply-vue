<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay } from 'date-fns';
import { useAbsencesStore } from '../stores/absences';

const absencesStore = useAbsencesStore();

const props = defineProps({
  absences: {
    type: Array,
    default: () => []
  }
});

const currentDate = ref(new Date());
const currentMonth = computed(() => format(currentDate.value, 'MMMM yyyy'));

// Calendar days
const calendarDays = computed(() => {
  const monthStart = startOfMonth(currentDate.value);
  const monthEnd = endOfMonth(currentDate.value);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: startDate, end: endDate });
});

// Week days
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Navigate to previous month
function previousMonth() {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() - 1;
  currentDate.value = new Date(year, month, 1);
}

// Navigate to next month
function nextMonth() {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  currentDate.value = new Date(year, month, 1);
}

// Navigate to current month
function resetToCurrentMonth() {
  currentDate.value = new Date();
}

// Get day class
function getDayClass(day: Date) {
  return {
    'bg-neutral-50': !isSameMonth(day, currentDate.value),
    'bg-primary-50 font-semibold': isToday(day),
    'has-absence': hasAbsence(day)
  };
}

// Check if day has absence
function hasAbsence(day: Date) {
  return props.absences.some((absence: any) => {
    return isSameDay(parseISO(absence.date), day);
  });
}

// Get absences for day
function getAbsencesForDay(day: Date) {
  return props.absences.filter((absence: any) => {
    return isSameDay(parseISO(absence.date), day);
  });
}

// Get absence type color
function getTypeColor(type: string | undefined) {
  switch (type) {
    case 'vacation':
      return 'bg-blue-500';
    case 'sick_leave':
      return 'bg-red-500';
    case 'personal_leave':
      return 'bg-purple-500';
    default:
      return 'bg-neutral-500';
  }
}

onMounted(() => {
  if (absencesStore.absences.length === 0) {
    absencesStore.fetchAbsences();
  }
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-subtle overflow-hidden">
    <div class="flex justify-between items-center p-4 border-b border-neutral-200">
      <button @click="previousMonth" class="p-2 rounded-full hover:bg-neutral-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
      
      <div class="text-center">
        <h2 class="text-lg font-medium text-neutral-800">{{ currentMonth }}</h2>
        <button @click="resetToCurrentMonth" class="text-sm text-primary-600 hover:text-primary-700 mt-1">Today</button>
      </div>
      
      <button @click="nextMonth" class="p-2 rounded-full hover:bg-neutral-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    
    <div class="overflow-x-auto">
      <div class="grid grid-cols-7 min-w-full">
        <!-- Week days header -->
        <div v-for="day in weekDays" :key="day" class="py-2 text-center text-xs font-medium text-neutral-500 border-b border-neutral-200">
          {{ day }}
        </div>
        
        <!-- Calendar days -->
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          :class="[
            'h-24 border-b border-r border-neutral-200 p-1 relative',
            getDayClass(day)
          ]"
        >
          <div class="text-right text-sm p-1" :class="{ 'text-neutral-400': !isSameMonth(day, currentDate) }">
            {{ format(day, 'd') }}
          </div>
          
          <!-- Absence indicators -->
          <div class="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1">
            <div 
              v-for="(absence, i) in getAbsencesForDay(day).slice(0, 2)" 
              :key="i"
              :class="[
                'h-2 w-2 rounded-full',
                getTypeColor((absence as any).absenceType?.code)
              ]"
              :title="(absence as any).absenceType?.name"
            ></div>
            <div 
              v-if="getAbsencesForDay(day).length > 2" 
              class="text-xs text-neutral-500"
            >
              +{{ getAbsencesForDay(day).length - 2 }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Legend -->
    <div class="p-3 border-t border-neutral-200 bg-neutral-50 flex flex-wrap gap-4">
      <div class="flex items-center">
        <div class="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
        <span class="text-xs text-neutral-600">Vacation</span>
      </div>
      <div class="flex items-center">
        <div class="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
        <span class="text-xs text-neutral-600">Sick Leave</span>
      </div>
      <div class="flex items-center">
        <div class="h-3 w-3 rounded-full bg-purple-500 mr-2"></div>
        <span class="text-xs text-neutral-600">Personal Leave</span>
      </div>
    </div>
  </div>
</template>