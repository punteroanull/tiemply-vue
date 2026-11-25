<script setup lang="ts">
import { computed, nextTick, ref, onMounted, onUnmounted } from 'vue';
import { useOnline } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { useWorkStatusStore } from '../stores/workStatus';
import StatusBadge from './StatusBadge.vue';
import NightShiftIndicator from './NightShiftIndicator.vue';
import BaseModal from './BaseModal.vue';
import type { WorkLogCategory } from '../types';

const { t } = useI18n();
const toast = useToast();
const workStatusStore = useWorkStatusStore();
const isOnline = useOnline();

const isMenuOpen = ref(false);
const mainButton = ref<HTMLButtonElement | null>(null);
const menu = ref<HTMLElement | null>(null);

const isLoading = computed(() =>
  workStatusStore.checkingIn || workStatusStore.checkingOut || workStatusStore.gettingLocation
);

// El botón solo se bloquea mientras hay una operación en curso. Bloquearlo también ante un error
// de ubicación dejaba al usuario sin salida: tras un único fallo no podía ni reintentar sin
// recargar la página, y sin ninguna explicación en pantalla.
const isButtonDisabled = computed(() => isLoading.value);

// Mensaje traducido del último fallo de ubicación, para mostrarlo de forma persistente.
const locationErrorMessage = computed(() => {
  const error = workStatusStore.locationError;
  if (!error) return null;

  return t(error.messageKey ?? 'geolocation.errors.unknown');
});

async function retryLocation() {
  const location = await workStatusStore.retryLocation();

  if (location) {
    toast.success(t('geolocation.locationAvailable'));
  }
}

const translatedStateLabel = computed(() => {
  switch (workStatusStore.currentState) {
    case 'working': return t('workStatus.working');
    case 'on_break': return t('workStatus.onBreak');
    case 'offsite': return t('workStatus.offsite');
    default: return t('workStatus.notWorking');
  }
});

// Lo que se ve mientras hay una operación en curso: obtener la posición puede tardar casi medio
// minuto y un spinner sin texto no decía qué estaba pasando.
const busyLabel = computed(() =>
  workStatusStore.gettingLocation ? t('geolocation.gettingLocation') : translatedStateLabel.value
);

const locationStatusLabel = computed(() => {
  if (workStatusStore.gettingLocation) return t('messages.gettingLocation');
  if (workStatusStore.locationError) return t('messages.locationError');
  if (workStatusStore.locationData) return t('messages.locationReady');
  return t('messages.locationPending');
});

const pendingLabel = computed(() =>
  t('workStatus.pendingSync', { count: workStatusStore.pendingCount }, workStatusStore.pendingCount)
);

interface WorkAction {
  id: string;
  label: string;
  icon: string;
  category: WorkLogCategory;
  colorClass: string;
}

// Actions based on current state
const availableActions = computed<WorkAction[]>(() => {
  const state = workStatusStore.currentState;

  if (state === 'not_working') {
    return [{
      id: 'start_shift',
      label: t('workStatus.startShift'),
      icon: '▶️',
      category: 'shift_start',
      colorClass: 'text-green-700 hover:bg-green-50'
    }];
  }

  if (state === 'working') {
    return [
      {
        id: 'start_break',
        label: t('workStatus.startBreak'),
        icon: '☕',
        category: 'break_start',
        colorClass: 'text-amber-700 hover:bg-amber-50'
      },
      {
        id: 'start_offsite',
        label: t('workStatus.goOffsite'),
        icon: '🚗',
        category: 'offsite_start',
        colorClass: 'text-blue-700 hover:bg-blue-50'
      },
      {
        id: 'end_shift',
        label: t('workStatus.endShift'),
        icon: '⏹️',
        category: 'shift_end',
        colorClass: 'text-red-700 hover:bg-red-50'
      }
    ];
  }

  if (state === 'on_break') {
    return [{
      id: 'end_break',
      label: t('workStatus.returnFromBreak'),
      icon: '↩️',
      category: 'break_end',
      colorClass: 'text-green-700 hover:bg-green-50'
    }];
  }

  if (state === 'offsite') {
    return [{
      id: 'end_offsite',
      label: t('workStatus.returnToOffice'),
      icon: '🏢',
      category: 'offsite_end',
      colorClass: 'text-green-700 hover:bg-green-50'
    }];
  }

  return [];
});

// Button styling based on state
const buttonColorClass = computed(() => {
  switch (workStatusStore.currentState) {
    case 'working': return 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500';
    case 'on_break': return 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400';
    case 'offsite': return 'bg-blue-500 hover:bg-blue-600 focus-visible:ring-blue-400';
    default: return 'bg-gray-600 hover:bg-gray-700 focus-visible:ring-gray-500';
  }
});

function menuItems(): HTMLElement[] {
  return menu.value ? Array.from(menu.value.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
}

async function toggleMenu() {
  if (isButtonDisabled.value) return;

  isMenuOpen.value = !isMenuOpen.value;

  if (isMenuOpen.value) {
    await nextTick();
    menuItems()[0]?.focus();
  }
}

function closeMenu(returnFocus = false) {
  if (!isMenuOpen.value) return;
  isMenuOpen.value = false;
  if (returnFocus) mainButton.value?.focus();
}

function onClickOutside() {
  closeMenu();
}

// Arrow keys move between the actions, as in any menu.
function onMenuKeydown(event: KeyboardEvent) {
  const items = menuItems();
  if (items.length === 0) return;

  const index = items.indexOf(document.activeElement as HTMLElement);

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    items[(index + 1) % items.length].focus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    items[(index - 1 + items.length) % items.length].focus();
  } else if (event.key === 'Home') {
    event.preventDefault();
    items[0].focus();
  } else if (event.key === 'End') {
    event.preventDefault();
    items[items.length - 1].focus();
  }
}

// Every action goes through the store, which queues it when there is no connection and asks
// for confirmation before ending the shift. The dashboard buttons use the same entry point.
async function handleAction(action: WorkAction) {
  closeMenu(true);
  await workStatusStore.requestAction(action.category);
}

// Close menu on escape key
function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMenu(true);
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
  <div class="relative" v-click-outside="onClickOutside">
    <!-- Aviso persistente de ubicación: un toast se desvanece y deja al usuario sin saber por
         qué no puede fichar. Aquí el motivo se queda en pantalla, con opción de reintentar.
         Se oculta mientras el menú está abierto: ocupan el mismo sitio. -->
    <div
      v-if="locationErrorMessage && workStatusStore.isGeolocationEnabled && !isMenuOpen"
      class="absolute bottom-full right-0 mb-2 w-72 max-w-[calc(100vw-3rem)] rounded-lg border border-red-300 bg-red-50 p-3 text-sm shadow-lg"
      role="alert"
    >
      <p class="font-medium text-red-800">
        {{ t('geolocation.locationError') }}
      </p>
      <p class="mt-1 text-red-700">
        {{ locationErrorMessage }}
      </p>
      <button
        type="button"
        class="mt-2 rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        :disabled="workStatusStore.gettingLocation"
        @click="retryLocation"
      >
        {{ workStatusStore.gettingLocation ? t('geolocation.gettingLocation') : t('geolocation.retry') }}
      </button>
    </div>

    <!-- Main Button -->
    <button
      ref="mainButton"
      type="button"
      @click="toggleMenu"
      :disabled="isButtonDisabled"
      aria-haspopup="menu"
      :aria-expanded="isMenuOpen"
      :aria-busy="isLoading"
      :aria-label="`${t('workStatus.actionsMenu')}: ${translatedStateLabel}`"
      :class="[
        'relative flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white font-medium',
        'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        buttonColorClass,
        isButtonDisabled ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105'
      ]"
    >
      <!-- Loading Spinner -->
      <svg
        v-if="isLoading"
        class="animate-spin h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>

      <!-- State Label -->
      <span>{{ isLoading ? busyLabel : translatedStateLabel }}</span>

      <!-- Duration -->
      <span
        v-if="!isLoading && workStatusStore.formattedCurrentDuration"
        class="text-sm opacity-90 tabular-nums"
      >
        ({{ workStatusStore.formattedCurrentDuration }})
      </span>

      <!-- Dropdown Indicator -->
      <svg
        :class="['w-4 h-4 transition-transform', isMenuOpen ? 'rotate-180' : '']"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>

      <!-- Entries waiting in the offline queue -->
      <span
        v-if="workStatusStore.pendingCount > 0"
        class="absolute -top-2 -left-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-white bg-amber-500 px-1 text-xs font-semibold text-white"
        :title="pendingLabel"
      >
        <span aria-hidden="true">{{ workStatusStore.pendingCount }}</span>
        <span class="sr-only">{{ pendingLabel }}</span>
      </span>

      <!-- Geolocation Indicator -->
      <span
        v-if="workStatusStore.isGeolocationEnabled"
        class="absolute -top-1 -right-1"
        :title="
          locationErrorMessage
            ? `${t('messages.locationError')}: ${locationErrorMessage}`
            : locationStatusLabel
        "
      >
        <span
          aria-hidden="true"
          :class="[
            'flex h-3 w-3 rounded-full border-2 border-white shadow-sm',
            workStatusStore.locationError ? 'bg-red-500' :
            workStatusStore.locationData ? 'bg-green-500' :
            workStatusStore.gettingLocation ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
          ]"
        />
        <span class="sr-only">{{ locationStatusLabel }}</span>
      </span>
    </button>

    <!-- Dropdown Menu. Anchored to the right edge: the button sits in the bottom-right corner
         and is often narrower than the menu, which used to run off the screen. -->
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
        class="absolute bottom-full right-0 mb-2 w-64 max-w-[calc(100vw-3rem)] rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden z-50"
      >
        <!-- Status Header -->
        <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <StatusBadge :state="workStatusStore.currentState" size="sm" />
              <NightShiftIndicator v-if="workStatusStore.isNightShift" size="sm" />
            </div>
            <span
              v-if="workStatusStore.formattedCurrentDuration"
              class="text-xs text-gray-600 tabular-nums"
              :title="t('workStatus.elapsed')"
            >
              {{ workStatusStore.formattedCurrentDuration }}
            </span>
          </div>
          <p
            v-if="workStatusStore.currentState !== 'not_working' && workStatusStore.formattedLastCheckIn"
            class="mt-1 text-xs text-gray-600"
          >
            {{ t('workStatus.shiftStartedAt', { time: workStatusStore.formattedLastCheckIn }) }}
          </p>
          <!-- Night Shift Date Info -->
          <div v-if="workStatusStore.formattedShiftDate" class="mt-2 text-xs text-purple-700">
            {{ t('workLog.shiftDateDifferent', { date: workStatusStore.formattedShiftDate }) }}
          </div>
        </div>

        <!-- Actions List -->
        <div
          ref="menu"
          class="py-1"
          role="menu"
          :aria-label="t('workStatus.actionsMenu')"
          @keydown="onMenuKeydown"
        >
          <button
            v-for="action in availableActions"
            :key="action.id"
            type="button"
            role="menuitem"
            @click="handleAction(action)"
            :disabled="isLoading"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:bg-gray-100',
              action.colorClass,
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
          >
            <span class="text-lg" aria-hidden="true">{{ action.icon }}</span>
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
              aria-hidden="true"
              :class="[
                'w-2 h-2 rounded-full',
                workStatusStore.locationError ? 'bg-red-500' :
                workStatusStore.locationData ? 'bg-green-500' :
                workStatusStore.gettingLocation ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
              ]"
            />
            <span class="text-gray-600">{{ locationStatusLabel }}</span>
          </div>
          <div
            v-if="workStatusStore.locationData && !workStatusStore.gettingLocation"
            class="text-xs text-gray-500 mt-1 truncate"
          >
            {{ workStatusStore.formattedLocation }}
          </div>
        </div>

        <!-- Entries waiting to sync -->
        <div
          v-if="workStatusStore.pendingCount > 0"
          class="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-800"
        >
          {{ pendingLabel }}
        </div>

        <!-- Offline Indicator -->
        <div
          v-if="!isOnline"
          class="px-4 py-2 bg-amber-50 border-t border-amber-200"
        >
          <div class="flex items-center gap-2 text-xs text-amber-800">
            <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
            {{ t('messages.offlineActionsWillSync') }}
          </div>
        </div>
      </div>
    </transition>

    <!-- Ending the shift cannot be undone by the employee, and it sits right below "Break". -->
    <BaseModal
      :open="workStatusStore.confirmingEndShift"
      :title="t('workStatus.confirmEndShiftTitle')"
      size="sm"
      @close="workStatusStore.cancelEndShift()"
    >
      <p class="text-sm text-neutral-600">{{ t('workStatus.confirmEndShiftBody') }}</p>
      <template #footer>
        <button type="button" class="btn-outline" @click="workStatusStore.cancelEndShift()">
          {{ t('common.cancel') }}
        </button>
        <button type="button" class="btn-danger" @click="workStatusStore.confirmEndShift()">
          {{ t('workStatus.confirmEndShiftAction') }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
