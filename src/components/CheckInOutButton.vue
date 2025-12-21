<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useOnline } from '@vueuse/core';
import { useToast } from 'vue-toastification';
import { useWorkStatusStore } from '../stores/workStatus';
import { savePendingAction } from '../utils/offlineManager';
import StatusBadge from './StatusBadge.vue';
import type { WorkLogCategory } from '../types';

const toast = useToast();
const workStatusStore = useWorkStatusStore();
const isOnline = useOnline();

const isMenuOpen = ref(false);

const isLoading = computed(() =>
  workStatusStore.checkingIn || workStatusStore.checkingOut || workStatusStore.gettingLocation
);

// Actions based on current state
const availableActions = computed(() => {
  const state = workStatusStore.currentState;

  if (state === 'not_working') {
    return [{
      id: 'start_shift',
      label: 'Start Shift',
      icon: '▶️',
      category: 'shift_start' as const,
      type: 'check-in' as const,
      colorClass: 'text-green-600 hover:bg-green-50'
    }];
  }

  if (state === 'working') {
    return [
      {
        id: 'start_break',
        label: 'Start Break',
        icon: '☕',
        category: 'break_start' as const,
        type: 'check-out' as const,
        colorClass: 'text-amber-600 hover:bg-amber-50'
      },
      {
        id: 'start_offsite',
        label: 'Go Offsite',
        icon: '🚗',
        category: 'offsite_start' as const,
        type: 'check-out' as const,
        colorClass: 'text-blue-600 hover:bg-blue-50'
      },
      {
        id: 'end_shift',
        label: 'End Shift',
        icon: '⏹️',
        category: 'shift_end' as const,
        type: 'check-out' as const,
        colorClass: 'text-red-600 hover:bg-red-50'
      }
    ];
  }

  if (state === 'on_break') {
    return [{
      id: 'end_break',
      label: 'Return from Break',
      icon: '↩️',
      category: 'break_end' as const,
      type: 'check-in' as const,
      colorClass: 'text-green-600 hover:bg-green-50'
    }];
  }

  if (state === 'offsite') {
    return [{
      id: 'end_offsite',
      label: 'Return to Office',
      icon: '🏢',
      category: 'offsite_end' as const,
      type: 'check-in' as const,
      colorClass: 'text-green-600 hover:bg-green-50'
    }];
  }

  return [];
});

// Button styling based on state
const buttonColorClass = computed(() => {
  switch (workStatusStore.currentState) {
    case 'working': return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
    case 'on_break': return 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400';
    case 'offsite': return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400';
    default: return 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500';
  }
});

function toggleMenu() {
  if (!isLoading.value) {
    isMenuOpen.value = !isMenuOpen.value;
  }
}

function closeMenu() {
  isMenuOpen.value = false;
}

async function handleAction(action: {
  category: WorkLogCategory;
  type: 'check-in' | 'check-out';
  label: string;
}) {
  closeMenu();

  if (!isOnline.value) {
    // Save for offline sync
    const employeeId = workStatusStore.getEmployeeId();
    if (employeeId) {
      savePendingAction({
        type: action.type,
        timestamp: Date.now(),
        employeeId,
        data: {
          category: action.category,
          notes: `${action.label} offline via Tiemply app`
        }
      });
      toast.info('Saved for syncing when connection is restored');

      // Update UI temporarily
      if (action.type === 'check-in') {
        workStatusStore.setOfflineCheckIn(action.category as 'shift_start' | 'break_end' | 'offsite_end');
      } else {
        workStatusStore.setOfflineCheckOut(action.category as 'shift_end' | 'break_start' | 'offsite_start');
      }
    }
    return;
  }

  // Execute online action
  switch (action.category) {
    case 'shift_start':
      await workStatusStore.startShift();
      break;
    case 'shift_end':
      await workStatusStore.endShift();
      break;
    case 'break_start':
      await workStatusStore.startBreak();
      break;
    case 'break_end':
      await workStatusStore.endBreak();
      break;
    case 'offsite_start':
      await workStatusStore.startOffsite();
      break;
    case 'offsite_end':
      await workStatusStore.endOffsite();
      break;
  }
}

// Close menu on escape key
function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMenu();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});
</script>

<template>
  <div class="relative" v-click-outside="closeMenu">
    <!-- Main Button -->
    <button
      @click="toggleMenu"
      :disabled="isLoading"
      :class="[
        'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white font-medium',
        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
        buttonColorClass,
        isLoading ? 'opacity-75 cursor-wait' : 'hover:shadow-xl hover:scale-105'
      ]"
    >
      <!-- Loading Spinner -->
      <svg
        v-if="isLoading"
        class="animate-spin h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>

      <!-- State Label -->
      <span v-else>{{ workStatusStore.stateLabel }}</span>

      <!-- Duration -->
      <span
        v-if="workStatusStore.isCheckedIn && workStatusStore.formattedCurrentDuration"
        class="text-sm opacity-90"
      >
        ({{ workStatusStore.formattedCurrentDuration }})
      </span>

      <!-- Dropdown Indicator -->
      <svg
        :class="['w-4 h-4 transition-transform', isMenuOpen ? 'rotate-180' : '']"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>

      <!-- Geolocation Indicator -->
      <div
        v-if="workStatusStore.isGeolocationEnabled"
        class="absolute -top-1 -right-1"
        :title="
          workStatusStore.locationError
            ? `Location error: ${workStatusStore.locationError.message}`
            : workStatusStore.locationData
            ? 'Location ready'
            : 'Location will be requested'
        "
      >
        <span
          :class="[
            'flex h-3 w-3 rounded-full border-2 border-white shadow-sm',
            workStatusStore.locationError ? 'bg-red-500' :
            workStatusStore.locationData ? 'bg-green-500' :
            workStatusStore.gettingLocation ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
          ]"
        />
      </div>
    </button>

    <!-- Dropdown Menu -->
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isMenuOpen"
        class="absolute bottom-full left-0 mb-2 w-56 rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden z-50"
      >
        <!-- Status Header -->
        <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <StatusBadge :state="workStatusStore.currentState" size="sm" />
            <span
              v-if="workStatusStore.formattedCurrentDuration"
              class="text-xs text-gray-500"
            >
              {{ workStatusStore.formattedCurrentDuration }}
            </span>
          </div>
        </div>

        <!-- Actions List -->
        <div class="py-1">
          <button
            v-for="action in availableActions"
            :key="action.id"
            @click="handleAction(action)"
            :disabled="isLoading"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
              action.colorClass,
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
          >
            <span class="text-lg">{{ action.icon }}</span>
            <span class="font-medium">{{ action.label }}</span>
          </button>
        </div>

        <!-- Geolocation Info -->
        <div
          v-if="workStatusStore.isGeolocationEnabled"
          class="px-4 py-2 bg-gray-50 border-t border-gray-200"
        >
          <div class="flex items-center gap-2 text-xs">
            <span
              :class="[
                'w-2 h-2 rounded-full',
                workStatusStore.locationError ? 'bg-red-500' :
                workStatusStore.locationData ? 'bg-green-500' :
                workStatusStore.gettingLocation ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
              ]"
            />
            <span class="text-gray-500">
              {{ workStatusStore.gettingLocation ? 'Getting location...' :
                 workStatusStore.locationError ? 'Location error' :
                 workStatusStore.locationData ? 'Location ready' : 'Location pending' }}
            </span>
          </div>
          <div
            v-if="workStatusStore.locationData && !workStatusStore.gettingLocation"
            class="text-xs text-gray-400 mt-1 truncate"
          >
            {{ workStatusStore.formattedLocation }}
          </div>
        </div>

        <!-- Offline Indicator -->
        <div
          v-if="!isOnline"
          class="px-4 py-2 bg-amber-50 border-t border-amber-200"
        >
          <div class="flex items-center gap-2 text-xs text-amber-700">
            <span class="w-2 h-2 rounded-full bg-amber-500" />
            Offline - actions will sync later
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
