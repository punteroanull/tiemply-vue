<script setup lang="ts">
import { computed, ref } from "vue";
import { useToast } from "vue-toastification";

const props = defineProps({
  isCheckedIn: {
    type: Boolean,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  currentDuration: {
    type: String,
    default: "",
  },
  lastCheckInTime: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["check-in", "check-out"]);
const toast = useToast();
const showConfirmation = ref(false);

function handleClick() {
  if (props.isLoading) return;

  if (props.isCheckedIn) {
    // When checking out, show confirmation
    showConfirmation.value = true;
  } else {
    // When checking in, just do it
    emit("check-in");
  }
}

function confirmCheckOut() {
  emit("check-out");
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
  if (props.isLoading) {
    return props.isCheckedIn ? "Checking out..." : "Checking in...";
  } else {
    return props.isCheckedIn ? "Check out" : "Check in";
  }
});

const buttonIcon = computed(() => {
  if (props.isCheckedIn) {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
    </svg>`;
  } else {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
    </svg>`;
  }
});
</script>

<template>
  <div class="relative">
    <!-- Main Button -->
    <button
      @click="handleClick"
      :class="[
        'text-white font-medium rounded-full shadow-lg flex items-center transition-all duration-300 transform hover:scale-105 focus:outline-none px-5 py-3',
        buttonClasses,
        { 'opacity-75 cursor-not-allowed': isLoading },
      ]"
    >
      <span v-if="isLoading" class="inline-block h-5 w-5 mr-2">
        <svg
          class="animate-spin h-5 w-5 text-white"
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
      </span>
      <span v-else v-html="buttonIcon"></span>
      {{ buttonText }}
    </button>

    <!-- Work Duration Tooltip (only shown when checked in) -->
    <div
      v-if="isCheckedIn && currentDuration && !showConfirmation"
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
          >
            Check Out
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
