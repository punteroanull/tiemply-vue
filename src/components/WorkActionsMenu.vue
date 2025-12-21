<script setup lang="ts">
import { computed, ref } from 'vue';
import { useWorkStatusStore } from '../stores/workStatus';
import StatusBadge from './StatusBadge.vue';

const workStatusStore = useWorkStatusStore();

const isMenuOpen = ref(false);
const isLoading = computed(() =>
  workStatusStore.checkingIn || workStatusStore.checkingOut || workStatusStore.gettingLocation
);

const actions = computed(() => {
  const state = workStatusStore.currentState;

  if (state === 'not_working') {
    return [{
      id: 'start_shift',
      label: 'Start Shift',
      icon: '▶',
      action: () => workStatusStore.startShift(),
      class: 'bg-green-600 hover:bg-green-700 text-white'
    }];
  }

  if (state === 'working') {
    return [
      {
        id: 'start_break',
        label: 'Start Break',
        icon: '☕',
        action: () => workStatusStore.startBreak(),
        class: 'bg-amber-500 hover:bg-amber-600 text-white'
      },
      {
        id: 'start_offsite',
        label: 'Go Offsite',
        icon: '📍',
        action: () => workStatusStore.startOffsite(),
        class: 'bg-blue-500 hover:bg-blue-600 text-white'
      },
      {
        id: 'end_shift',
        label: 'End Shift',
        icon: '⏹',
        action: () => workStatusStore.endShift(),
        class: 'bg-red-500 hover:bg-red-600 text-white'
      }
    ];
  }

  if (state === 'on_break') {
    return [{
      id: 'end_break',
      label: 'Return from Break',
      icon: '↩',
      action: () => workStatusStore.endBreak(),
      class: 'bg-green-600 hover:bg-green-700 text-white'
    }];
  }

  if (state === 'offsite') {
    return [{
      id: 'end_offsite',
      label: 'Return to Office',
      icon: '↩',
      action: () => workStatusStore.endOffsite(),
      class: 'bg-green-600 hover:bg-green-700 text-white'
    }];
  }

  return [];
});

async function handleAction(action: () => Promise<boolean>) {
  await action();
  isMenuOpen.value = false;
}

function toggleMenu() {
  if (!isLoading.value) {
    isMenuOpen.value = !isMenuOpen.value;
  }
}

function closeMenu() {
  isMenuOpen.value = false;
}
</script>

<template>
  <div class="relative" v-click-outside="closeMenu">
    <!-- Main Button -->
    <button
      @click="toggleMenu"
      :disabled="isLoading"
      :class="[
        'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        isLoading ? 'opacity-75 cursor-wait' : 'hover:shadow-xl',
        workStatusStore.currentState === 'working' ? 'bg-green-600 text-white focus:ring-green-500' :
        workStatusStore.currentState === 'on_break' ? 'bg-amber-500 text-white focus:ring-amber-400' :
        workStatusStore.currentState === 'offsite' ? 'bg-blue-500 text-white focus:ring-blue-400' :
        'bg-gray-600 text-white focus:ring-gray-500'
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

      <!-- Status Badge inline -->
      <span v-else class="font-medium">
        {{ workStatusStore.stateLabel }}
      </span>

      <!-- Duration if checked in -->
      <span v-if="workStatusStore.isCheckedIn && workStatusStore.formattedCurrentDuration" class="text-sm opacity-90">
        ({{ workStatusStore.formattedCurrentDuration }})
      </span>

      <!-- Dropdown indicator -->
      <svg
        :class="['w-4 h-4 transition-transform', isMenuOpen ? 'rotate-180' : '']"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
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
        class="absolute bottom-full left-0 mb-2 w-56 rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden"
      >
        <!-- Status Header -->
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <StatusBadge :state="workStatusStore.currentState" size="sm" />
            <span v-if="workStatusStore.formattedCurrentDuration" class="text-xs text-gray-500 dark:text-gray-400">
              {{ workStatusStore.formattedCurrentDuration }}
            </span>
          </div>
        </div>

        <!-- Actions List -->
        <div class="py-2">
          <button
            v-for="action in actions"
            :key="action.id"
            @click="handleAction(action.action)"
            :disabled="isLoading"
            :class="[
              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-700/50',
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
          >
            <span class="text-lg">{{ action.icon }}</span>
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ action.label }}</span>
          </button>
        </div>

        <!-- Geolocation Status -->
        <div
          v-if="workStatusStore.isGeolocationEnabled"
          class="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-2 text-xs">
            <span
              :class="[
                'w-2 h-2 rounded-full',
                workStatusStore.locationError ? 'bg-red-500' :
                workStatusStore.locationData ? 'bg-green-500' : 'bg-gray-400'
              ]"
            />
            <span class="text-gray-500 dark:text-gray-400">
              {{ workStatusStore.locationError ? 'Location error' :
                 workStatusStore.locationData ? 'Location available' : 'Location pending' }}
            </span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
