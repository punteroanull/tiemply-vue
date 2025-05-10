<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useWorkStatusStore } from "../stores/workStatus";
import { useWorkLogsStore } from "../stores/workLogs";
import { useAbsencesStore } from "../stores/absences";
import { useAuthStore } from "../stores/auth";
//import { format, subDays, addDays } from "date-fns";
import { format } from "date-fns";

const router = useRouter();
const workStatusStore = useWorkStatusStore();
const workLogsStore = useWorkLogsStore();
const absencesStore = useAbsencesStore();
const authStore = useAuthStore();

const loading = ref(true);

// Computed properties for user info
const userName = computed(() => authStore.user?.name || "User");
const todayDate = computed(() => format(new Date(), "EEEE, MMMM d, yyyy"));

// Today's date formatted for API
//const today = format(new Date(), "yyyy-MM-dd");
//const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd')
//const weekEnd = today

onMounted(async () => {
  try {
    await Promise.all([
      workStatusStore.fetchStatus(),
      workLogsStore.fetchDailyReport(),
      workLogsStore.fetchWeeklyReport(),
      absencesStore.fetchPendingRequests(),
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  } finally {
    loading.value = false;
  }
});

function navigateToRequests() {
  router.push("/requests");
}

function navigateToWorkLogs() {
  router.push("/work-logs");
}

function navigateToNewRequest() {
  router.push("/requests/new");
}
</script>

<template>
  <div>
    <div class="mb-6 md:flex md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-neutral-800">
          Welcome, {{ userName }}
        </h1>
        <p class="text-neutral-500 mt-1">{{ todayDate }}</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center h-64">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"
      ></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Current Status Card -->
      <div class="card">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-lg font-medium text-neutral-800">Current Status</h2>
          <span
            :class="[
              'badge',
              workStatusStore.isCheckedIn ? 'badge-success' : 'badge-info',
            ]"
          >
            {{ workStatusStore.isCheckedIn ? "Working" : "Not working" }}
          </span>
        </div>

        <div class="space-y-4">
          <div
            v-if="workStatusStore.isCheckedIn"
            class="flex items-center text-secondary-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clip-rule="evenodd"
              />
            </svg>
            <div>
              <p class="text-sm text-neutral-600">Checked in at</p>
              <p class="font-semibold">
                {{ workStatusStore.formattedLastCheckIn }}
              </p>
            </div>
          </div>
          <div
            v-else-if="workStatusStore.formattedLastCheckOut"
            class="flex items-center text-neutral-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clip-rule="evenodd"
              />
            </svg>
            <div>
              <p class="text-sm text-neutral-600">Last checked out</p>
              <p class="font-semibold">
                {{ workStatusStore.formattedLastCheckOut }}
              </p>
            </div>
          </div>
          <div v-else class="text-neutral-600">
            <p>You haven't checked in today.</p>
          </div>
        </div>
      </div>

      <!-- Weekly Summary Card -->
      <div class="card">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-lg font-medium text-neutral-800">Weekly Summary</h2>
          <button
            @click="navigateToWorkLogs"
            class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            View all
          </button>
        </div>

        <div v-if="workLogsStore.weeklyReport">
          <div class="flex justify-between mb-2">
            <span class="text-neutral-600">Total hours</span>
            <span class="font-semibold">{{
              workLogsStore.weeklyReport.total_duration || "0:00"
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-600">Days worked</span>
            <span class="font-semibold"
              >{{ workLogsStore.weeklyReport.total_days || 0 }}/5</span
            >
          </div>

          <div class="mt-4 pt-4 border-t border-neutral-200">
            <div class="flex items-center">
              <div class="flex-1 bg-neutral-200 rounded-full h-2">
                <div
                  class="bg-primary-600 h-2 rounded-full"
                  :style="`width: ${Math.min(
                    (workLogsStore.weeklyReport.total_days || 0) * 20,
                    100
                  )}%`"
                ></div>
              </div>
              <span class="text-sm text-neutral-600 ml-2"
                >{{ (workLogsStore.weeklyReport.total_days || 0) * 20 }}%</span
              >
            </div>
          </div>
        </div>
        <div v-else class="text-neutral-600">
          <p>No work logs available for this week.</p>
        </div>
      </div>

      <!-- Pending Requests Card -->
      <div class="card">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-lg font-medium text-neutral-800">Pending Requests</h2>
          <button
            @click="navigateToRequests"
            class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            View all
          </button>
        </div>

        <div
          v-if="
            absencesStore.pendingRequests &&
            absencesStore.pendingRequests.length > 0
          "
        >
          <ul class="space-y-3">
            <li
              v-for="request in absencesStore.pendingRequests.slice(0, 3)"
              :key="request.id"
              class="border-b border-neutral-200 pb-3 last:border-0"
            >
              <div class="flex justify-between">
                <span class="font-medium">{{
                  request.absenceType?.name || "Absence"
                }}</span>
                <span class="badge-warning">Pending</span>
              </div>
              <div class="text-sm text-neutral-600 mt-1">
                {{ format(new Date(request.start_date), "MMM d, yyyy") }} -
                {{ format(new Date(request.end_date), "MMM d, yyyy") }}
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="text-neutral-600">
          <p>No pending requests.</p>
          <button
            @click="navigateToNewRequest"
            class="mt-3 text-sm bg-primary-50 text-primary-700 px-3 py-2 rounded-md hover:bg-primary-100 transition-colors"
          >
            Create new request
          </button>
        </div>
      </div>

      <!-- Quick Actions Card -->
      <div class="card">
        <h2 class="text-lg font-medium text-neutral-800 mb-4">Quick Actions</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            @click="navigateToNewRequest"
            class="flex items-center p-3 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-primary-600 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clip-rule="evenodd"
              />
            </svg>
            <span>New absence request</span>
          </button>

          <button
            @click="navigateToWorkLogs"
            class="flex items-center p-3 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-primary-600 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clip-rule="evenodd"
              />
            </svg>
            <span>View work logs</span>
          </button>

          <button
            v-if="!workStatusStore.isCheckedIn"
            @click="workStatusStore.checkIn"
            class="flex items-center p-3 bg-secondary-50 border border-secondary-200 rounded-md hover:bg-secondary-100 transition-colors text-secondary-700 sm:col-span-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Check in for today</span>
          </button>

          <button
            v-else
            @click="workStatusStore.checkOut"
            class="flex items-center p-3 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors text-red-700 sm:col-span-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Check out</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
