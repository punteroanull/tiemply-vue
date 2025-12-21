<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useWorkStatusStore } from "../stores/workStatus";
import {
  isGeolocationAvailable,
  checkGeolocationPermission,
} from "../utils/geolocation";

const workStatusStore = useWorkStatusStore();
const hasGeolocationPermission = ref(false);

const geolocationStatus = computed(() => {
  if (!isGeolocationAvailable()) {
    return {
      available: false,
      status: "unavailable",
      message: "Geolocation is not supported by your browser",
      icon: "unavailable",
    };
  }

  if (!workStatusStore.isGeolocationEnabled) {
    return {
      available: true,
      status: "disabled",
      message: "Geolocation is disabled for your company",
      icon: "disabled",
    };
  }

  if (!hasGeolocationPermission.value) {
    return {
      available: true,
      status: "permission-needed",
      message: "Location permission is needed for check-in/check-out",
      icon: "permission",
    };
  }

  return {
    available: true,
    status: "enabled",
    message: workStatusStore.isGeolocationRequired
      ? "Location is required for check-in/check-out"
      : "Location will be requested during check-in/check-out",
    icon: "enabled",
  };
});

const statusClasses = computed(() => {
  switch (geolocationStatus.value.status) {
    case "enabled":
      return "bg-green-50 border-green-200 text-green-800";
    case "permission-needed":
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
    case "disabled":
      return "bg-gray-50 border-gray-200 text-gray-600";
    case "unavailable":
      return "bg-red-50 border-red-200 text-red-800";
    default:
      return "bg-gray-50 border-gray-200 text-gray-600";
  }
});

const statusIcon = computed(() => {
  switch (geolocationStatus.value.icon) {
    case "enabled":
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
      </svg>`;
    case "permission":
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>`;
    case "disabled":
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd" />
      </svg>`;
    case "unavailable":
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
      </svg>`;
  }
});

async function requestLocationPermission() {
  try {
    await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
      }
    );

    hasGeolocationPermission.value = true;
  } catch (error) {
    console.error("Failed to get location permission:", error);
  }
}

async function checkPermissions() {
  hasGeolocationPermission.value = await checkGeolocationPermission();
}

onMounted(async () => {
  await checkPermissions();
});
</script>

<template>
  <div class="card">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-lg font-medium text-neutral-800">Location Services</h3>
        <p class="text-sm text-neutral-600 mt-1">
          Manage location tracking for check-in and check-out
        </p>
      </div>
    </div>

    <div
      :class="[
        'border rounded-lg p-4 flex items-start space-x-3',
        statusClasses,
      ]"
    >
      <div v-html="statusIcon" class="flex-shrink-0 mt-0.5"></div>

      <div class="flex-1">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">
              {{
                geolocationStatus.status === "enabled"
                  ? "Location Enabled"
                  : geolocationStatus.status === "permission-needed"
                  ? "Permission Required"
                  : geolocationStatus.status === "disabled"
                  ? "Location Disabled"
                  : "Location Unavailable"
              }}
            </p>
            <p class="text-sm mt-1">{{ geolocationStatus.message }}</p>
          </div>

          <button
            v-if="geolocationStatus.status === 'permission-needed'"
            @click="requestLocationPermission"
            class="btn-primary text-sm px-3 py-1"
          >
            Grant Permission
          </button>
        </div>

        <!-- Additional info for enabled status -->
        <div
          v-if="geolocationStatus.status === 'enabled'"
          class="mt-3 space-y-2"
        >
          <div class="text-sm">
            <span class="font-medium">Settings:</span>
            <ul class="mt-1 space-y-1 text-xs">
              <li class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3 mr-1"
                  :class="
                    workStatusStore.isGeolocationRequired
                      ? 'text-red-500'
                      : 'text-yellow-500'
                  "
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{
                  workStatusStore.isGeolocationRequired
                    ? "Required"
                    : "Optional"
                }}
              </li>
              <li class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3 mr-1 text-blue-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clip-rule="evenodd"
                  />
                </svg>
                Used for both check-in and check-out
              </li>
              <li class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3 mr-1 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                Data is stored securely
              </li>
            </ul>
          </div>
        </div>

        <!-- Troubleshooting for permission issues -->
        <div
          v-if="geolocationStatus.status === 'permission-needed'"
          class="mt-3"
        >
          <details class="text-sm">
            <summary class="cursor-pointer font-medium hover:text-neutral-900">
              Troubleshooting
            </summary>
            <div class="mt-2 space-y-2 text-xs">
              <p>If you're having trouble with location permissions:</p>
              <ol class="list-decimal list-inside space-y-1 ml-2">
                <li>Click the location icon in your browser's address bar</li>
                <li>Select "Allow" for location access</li>
                <li>Refresh the page and try again</li>
                <li>For mobile: Check your browser's location settings</li>
              </ol>
            </div>
          </details>
        </div>
      </div>
    </div>

    <!-- Current location data if available -->
    <div
      v-if="workStatusStore.locationData"
      class="mt-4 p-3 bg-neutral-50 rounded-lg"
    >
      <h4 class="text-sm font-medium text-neutral-800 mb-2">
        Last Known Location
      </h4>
      <div class="space-y-1 text-xs text-neutral-600">
        <p>
          <span class="font-medium">Coordinates:</span>
          {{ workStatusStore.formattedLocation }}
        </p>
        <p v-if="workStatusStore.locationData.address">
          <span class="font-medium">Address:</span>
          {{ workStatusStore.locationData.address }}
        </p>
        <p>
          <span class="font-medium">Obtained:</span>
          {{
            new Date(workStatusStore.locationData.timestamp).toLocaleString()
          }}
        </p>
      </div>
    </div>
  </div>
</template>
