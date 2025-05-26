<script setup lang="ts">
import { computed, ref } from "vue";
import { useToast } from "vue-toastification";
import { useWorkStatusStore } from "../stores/workStatus";
import { savePendingAction } from "../utils/offlineManager";

const props = defineProps({
  isCheckedIn: { type: Boolean, required: true },
  isLoading: { type: Boolean, default: false },
  currentDuration: { type: String, default: "" },
  lastCheckInTime: { type: String, default: "" },
});

const emit = defineEmits(["check-in", "check-out"]);
const toast = useToast();
const showConfirmation = ref(false);
const workStatusStore = useWorkStatusStore();

function handleClick() {
  if (props.isLoading || workStatusStore.gettingLocation) return;

  if (props.isCheckedIn) {
    showConfirmation.value = true;
  } else {
    handleCheckIn();
  }
}

async function handleCheckIn() {
  if (!navigator.onLine) {
    // Guardar para sincronización posterior
    const employeeId = workStatusStore.getEmployeeId();
    if (employeeId) {
      savePendingAction({
        type: "check-in",
        timestamp: Date.now(),
        employeeId,
        data: { notes: "Checked in offline via Tiemply app" },
      });
      toast.info("Saved check-in for syncing when connection is restored");
      // Actualizar UI temporalmente
      workStatusStore.setOfflineCheckIn();
    }
  } else {
    emit("check-in");
  }
}

async function confirmCheckOut() {
  if (!navigator.onLine) {
    // Guardar para sincronización posterior
    const employeeId = workStatusStore.getEmployeeId();
    if (employeeId) {
      savePendingAction({
        type: "check-out",
        timestamp: Date.now(),
        employeeId,
        data: {
          category: "shift_end",
          notes: "Checked out offline via Tiemply app",
        },
      });
      toast.info("Saved check-out for syncing when connection is restored");
      // Actualizar UI temporalmente
      workStatusStore.setOfflineCheckOut();
    }
  } else {
    emit("check-out");
  }
  showConfirmation.value = false;
}

function cancelCheckOut() {
  showConfirmation.value = false;
  toast.info("Check-out cancelled");
}

const buttonClasses = computed(() => {
  if (props.isCheckedIn) {
    return "bg-error hover:bg-red-600";
  } else {
    return "bg-secondary-600 hover:bg-secondary-700";
  }
});

const buttonText = computed(() => {
  if (workStatusStore.gettingLocation) {
    return "Getting location...";
  } else if (props.isLoading) {
    return props.isCheckedIn ? "Checking out..." : "Checking in...";
  } else {
    return props.isCheckedIn ? "Check out" : "Check in";
  }
});

const isButtonDisabled = computed(() => {
  return Boolean(
    props.isLoading ||
      workStatusStore.gettingLocation ||
      (workStatusStore.isGeolocationRequired && !!workStatusStore.locationError)
  );
});

const buttonIcon = computed(() => {
  if (workStatusStore.gettingLocation || props.isLoading) {
    return `<svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>`;
  } else if (props.isCheckedIn) {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
    </svg>`;
  } else {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
    </svg>`;
  }
});

// Función para obtener el icono de geolocalización
function getLocationIcon(hasLocation: boolean, hasError: boolean) {
  if (hasError) {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
    </svg>`;
  } else if (hasLocation) {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
    </svg>`;
  } else {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
    </svg>`;
  }
}
</script>

<template>
  <div class="relative">
    <!-- Main Button -->
    <button
      @click="handleClick"
      :disabled="isButtonDisabled"
      :class="[
        'text-white font-medium rounded-full shadow-lg flex items-center transition-all duration-300 transform hover:scale-105 focus:outline-none px-5 py-3 relative',
        buttonClasses,
        { 'opacity-75 cursor-not-allowed': isButtonDisabled },
      ]"
    >
      <span v-html="buttonIcon"></span>
      {{ buttonText }}

      <!-- Indicador de geolocalización -->
      <div
        v-if="workStatusStore.isGeolocationEnabled"
        class="absolute -top-1 -right-1 flex items-center justify-center"
        :title="
          workStatusStore.locationError
            ? `Location error: ${workStatusStore.locationError.message}`
            : workStatusStore.locationData
            ? `Location: ${workStatusStore.formattedLocation}`
            : 'Location will be requested'
        "
      >
        <div
          v-html="
            getLocationIcon(
              !!workStatusStore.locationData,
              !!workStatusStore.locationError
            )
          "
          class="bg-white rounded-full p-1 shadow-sm"
        ></div>
      </div>
    </button>

    <!-- Geolocation Status Tooltip -->
    <div
      v-if="
        workStatusStore.isGeolocationEnabled &&
        (workStatusStore.gettingLocation ||
          workStatusStore.locationData ||
          workStatusStore.locationError)
      "
      class="absolute -top-20 right-0 bg-white rounded-lg shadow-lg px-3 py-2 text-sm text-neutral-800 whitespace-nowrap max-w-xs z-50"
    >
      <!-- Getting location -->
      <div
        v-if="workStatusStore.gettingLocation"
        class="flex items-center text-blue-600"
      >
        <svg
          class="animate-spin h-4 w-4 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Getting location...
      </div>

      <!-- Location obtained -->
      <div v-else-if="workStatusStore.locationData" class="text-green-600">
        <div class="flex items-center mb-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="font-medium">Location ready</span>
        </div>
        <div class="text-xs text-neutral-600 break-words">
          {{ workStatusStore.formattedLocation }}
        </div>
        <div
          v-if="workStatusStore.locationData.address"
          class="text-xs text-neutral-500 mt-1 break-words"
        >
          {{ workStatusStore.locationData.address }}
        </div>
      </div>

      <!-- Location error -->
      <div v-else-if="workStatusStore.locationError" class="text-red-600">
        <div class="flex items-center mb-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="font-medium">Location error</span>
        </div>
        <div class="text-xs text-neutral-600 break-words">
          {{ workStatusStore.locationError.message }}
        </div>
        <div
          v-if="!workStatusStore.isGeolocationRequired"
          class="text-xs text-neutral-500 mt-1"
        >
          Will proceed without location
        </div>
      </div>

      <div
        class="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-white"
      ></div>
    </div>

    <!-- Work Duration Tooltip (only shown when checked in and no geolocation tooltip) -->
    <div
      v-if="
        isCheckedIn &&
        currentDuration &&
        !showConfirmation &&
        !workStatusStore.gettingLocation &&
        !workStatusStore.locationData &&
        !workStatusStore.locationError
      "
      class="absolute -top-12 right-0 bg-white rounded-lg shadow-lg px-3 py-2 text-sm text-neutral-800 whitespace-nowrap"
    >
      <div class="flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 text-secondary-600 mr-1"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clip-rule="evenodd"
          />
        </svg>
        <span
          >Working for:
          <span class="font-bold">{{ currentDuration }}</span></span
        >
      </div>
      <div class="mt-1 text-xs text-neutral-500">
        Since {{ lastCheckInTime }}
      </div>
      <div
        class="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-white"
      ></div>
    </div>

    <!-- Check-out Confirmation Modal -->
    <div
      v-if="showConfirmation"
      class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <div class="text-center mb-4">
          <div
            class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 mb-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-neutral-800">
            Confirm Check-Out
          </h3>
          <p class="text-neutral-600 mt-2">
            Are you sure you want to check out?
            <span v-if="currentDuration" class="block mt-1 font-medium">
              You've been working for {{ currentDuration }}
            </span>
          </p>

          <!-- Location warning if geolocation is enabled -->
          <div
            v-if="workStatusStore.isGeolocationEnabled"
            class="mt-3 p-2 bg-blue-50 rounded-md"
          >
            <div class="flex items-center text-blue-800 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>{{
                workStatusStore.isGeolocationRequired
                  ? "Location will be required"
                  : "Location will be requested"
              }}</span>
            </div>
          </div>
        </div>

        <div class="flex space-x-3">
          <button
            @click="cancelCheckOut"
            class="flex-1 py-2 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            @click="confirmCheckOut"
            class="flex-1 py-2 bg-error text-white rounded-md hover:bg-red-700"
            :disabled="
              !!(
                workStatusStore.isGeolocationRequired &&
                workStatusStore.locationError
              )
            "
          >
            Check Out
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
