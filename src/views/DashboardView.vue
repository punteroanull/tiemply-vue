<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useWorkStatusStore } from "../stores/workStatus";
import { useWorkLogsStore } from "../stores/workLogs";
import { useAbsencesStore } from "../stores/absences";
import { useSchedulesStore } from "../stores/schedules";
import { useIncidentsStore } from "../stores/incidents";
import { useAuthStore } from "../stores/auth";
import { format, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";
import StatusBadge from '../components/StatusBadge.vue';
import AbsenceCalendar from '../components/AbsenceCalendar.vue';
import ScheduleBlock from '../components/ScheduleBlock.vue';
import NightShiftIndicator from '../components/NightShiftIndicator.vue';

const { t, locale } = useI18n();

// Safe date formatting helper
function formatDate(dateValue: string | undefined | null, formatStr: string): string {
  if (!dateValue) return '-';
  try {
    const date = parseISO(dateValue);
    return format(date, formatStr);
  } catch {
    return '-';
  }
}

const router = useRouter();
const workStatusStore = useWorkStatusStore();
const workLogsStore = useWorkLogsStore();
const absencesStore = useAbsencesStore();
const schedulesStore = useSchedulesStore();
const incidentsStore = useIncidentsStore();
const authStore = useAuthStore();

const loading = ref(true);

// Computed properties for user info
const userName = computed(() => authStore.user?.name || "User");
const dateLocale = computed(() => locale.value === "es" ? es : enUS);
const todayDate = computed(() => format(new Date(), "EEEE, MMMM d, yyyy", { locale: dateLocale.value }));

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
      absencesStore.fetchAbsences(),
      schedulesStore.fetchCurrentSchedule(),
      schedulesStore.fetchWeeklySchedule(),
      incidentsStore.fetchIncidents({ status: 'pending' }),
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  } finally {
    loading.value = false;
  }
});

function navigateToAbsences() {
  router.push("/absences");
}

function navigateToRequests() {
  router.push("/requests");
}

function navigateToWorkLogs() {
  router.push("/work-logs");
}

function navigateToNewRequest() {
  router.push("/requests/new");
}

function navigateToSchedule() {
  router.push("/schedule");
}

function navigateToIncidents() {
  router.push("/incidents");
}
</script>

<template>
  <div>
    <div class="mb-6 md:flex md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-neutral-800">
          {{ $t('dashboard.welcome', { name: userName }) }}
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
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-medium text-neutral-800">{{ $t('dashboard.currentStatus') }}</h2>
            <NightShiftIndicator v-if="workStatusStore.isNightShift" size="sm" />
          </div>
          <StatusBadge :state="workStatusStore.currentState" />
        </div>

        <!-- Night Shift Info -->
        <div v-if="workStatusStore.isNightShift && workStatusStore.shiftDate" class="mb-4 p-2 bg-purple-50 rounded-md text-sm text-purple-700">
          {{ $t('workLog.shiftDateDifferent', { date: workStatusStore.shiftDate }) }}
        </div>

        <div class="space-y-4">
          <!-- Working State -->
          <div v-if="workStatusStore.currentState === 'working'" class="flex items-center text-green-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <div>
              <p class="text-sm text-neutral-600">{{ $t('dashboard.workingSince') }}</p>
              <p class="font-semibold">{{ workStatusStore.formattedLastCheckIn }}</p>
              <p v-if="workStatusStore.formattedCurrentDuration" class="text-sm text-green-600 mt-1">
                {{ $t('dashboard.duration') }}: {{ workStatusStore.formattedCurrentDuration }}
              </p>
            </div>
          </div>

          <!-- On Break State -->
          <div v-else-if="workStatusStore.currentState === 'on_break'" class="flex items-center text-amber-700">
            <span class="text-2xl mr-2">☕</span>
            <div>
              <p class="text-sm text-neutral-600">{{ $t('dashboard.onBreak') }}</p>
              <p class="font-semibold">{{ $t('dashboard.startedAt') }} {{ workStatusStore.formattedLastCheckOut }}</p>
              <p v-if="workStatusStore.formattedCurrentDuration" class="text-sm text-amber-600 mt-1">
                {{ $t('dashboard.breakTime') }}: {{ workStatusStore.formattedCurrentDuration }}
              </p>
            </div>
          </div>

          <!-- Offsite State -->
          <div v-else-if="workStatusStore.currentState === 'offsite'" class="flex items-center text-blue-700">
            <span class="text-2xl mr-2">🚗</span>
            <div>
              <p class="text-sm text-neutral-600">{{ $t('dashboard.offsite') }}</p>
              <p class="font-semibold">{{ $t('dashboard.leftAt') }} {{ workStatusStore.formattedLastCheckOut }}</p>
              <p v-if="workStatusStore.formattedCurrentDuration" class="text-sm text-blue-600 mt-1">
                {{ $t('dashboard.timeOffsite') }}: {{ workStatusStore.formattedCurrentDuration }}
              </p>
            </div>
          </div>

          <!-- Not Working State -->
          <div v-else-if="workStatusStore.formattedLastCheckOut" class="flex items-center text-neutral-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <div>
              <p class="text-sm text-neutral-600">{{ $t('dashboard.lastCheckedOut') }}</p>
              <p class="font-semibold">{{ workStatusStore.formattedLastCheckOut }}</p>
            </div>
          </div>

          <!-- Never Checked In -->
          <div v-else class="text-neutral-600">
            <p>{{ $t('dashboard.notCheckedIn') }}</p>
          </div>
        </div>
      </div>

      <!-- Weekly Summary Card -->
      <div class="card">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-lg font-medium text-neutral-800">{{ $t('dashboard.weeklySummary') }}</h2>
          <button
            @click="navigateToWorkLogs"
            class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            {{ $t('dashboard.viewAll') }}
          </button>
        </div>

        <div v-if="workLogsStore.weeklyReport">
          <div class="flex justify-between mb-2">
            <span class="text-neutral-600">{{ $t('dashboard.totalHours') }}</span>
            <span class="font-semibold">{{
              workLogsStore.weeklyReport.totalDuration || "0:00"
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-600">{{ $t('dashboard.daysWorked') }}</span>
            <span class="font-semibold"
              >{{ workLogsStore.weeklyReport.totalDays || 0 }}/5</span
            >
          </div>

          <div class="mt-4 pt-4 border-t border-neutral-200">
            <div class="flex items-center">
              <div class="flex-1 bg-neutral-200 rounded-full h-2">
                <div
                  class="bg-primary-600 h-2 rounded-full"
                  :style="`width: ${Math.min(
                    (workLogsStore.weeklyReport.totalDays || 0) * 20,
                    100
                  )}%`"
                ></div>
              </div>
              <span class="text-sm text-neutral-600 ml-2"
                >{{ (workLogsStore.weeklyReport.totalDays || 0) * 20 }}%</span
              >
            </div>
          </div>
        </div>
        <div v-else class="text-neutral-600">
          <p>{{ $t('dashboard.noWorkLogs') }}</p>
        </div>
      </div>

      <!-- Today's Schedule Card -->
      <div v-if="schedulesStore.todaySchedule" class="card">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-lg font-medium text-neutral-800">{{ $t('schedule.todaySchedule') }}</h2>
          <button
            @click="navigateToSchedule"
            class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            {{ $t('dashboard.viewAll') }}
          </button>
        </div>

        <div v-if="schedulesStore.todaySchedule.blocks?.length" class="space-y-2">
          <ScheduleBlock
            v-for="block in schedulesStore.todaySchedule.blocks"
            :key="block.id"
            :block="block"
          />
          <div class="mt-3 pt-3 border-t border-neutral-200 text-sm text-neutral-600">
            {{ $t('schedule.totalDailyHours') }}: <span class="font-medium">{{ schedulesStore.todaySchedule.totalHours }}h</span>
          </div>
        </div>
        <div v-else class="text-neutral-600">
          <p>{{ $t('schedule.noBlocksToday') }}</p>
        </div>
      </div>

      <!-- Incidents Alert -->
      <div v-if="incidentsStore.hasPendingIncidents" class="card border-amber-200 bg-amber-50 md:col-span-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-amber-800">{{ $t('incidents.pendingCount', { count: incidentsStore.pendingCount }) }}</p>
              <p class="text-sm text-amber-600">{{ $t('incidents.title') }}</p>
            </div>
          </div>
          <button
            @click="navigateToIncidents"
            class="px-4 py-2 bg-amber-200 text-amber-800 rounded-md hover:bg-amber-300 transition-colors text-sm font-medium"
          >
            {{ $t('dashboard.viewAll') }}
          </button>
        </div>
      </div>

      <!-- Pending Requests Card -->
      <div class="card">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-lg font-medium text-neutral-800">{{ $t('dashboard.pendingRequests') }}</h2>
          <button
            @click="navigateToRequests"
            class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            {{ $t('dashboard.viewAll') }}
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
                  request.absenceType?.name || t('absences.absence')
                }}</span>
                <span class="badge-warning">{{ $t('dashboard.pending') }}</span>
              </div>
              <div class="text-sm text-neutral-600 mt-1">
                {{ formatDate(request.startDate, "MMM d, yyyy") }} -
                {{ formatDate(request.endDate, "MMM d, yyyy") }}
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="text-neutral-600">
          <p>{{ $t('dashboard.noPendingRequests') }}</p>
          <button
            @click="navigateToNewRequest"
            class="mt-3 text-sm bg-primary-50 text-primary-700 px-3 py-2 rounded-md hover:bg-primary-100 transition-colors"
          >
            {{ $t('dashboard.createNewRequest') }}
          </button>
        </div>
      </div>

      <!-- Absence Calendar Card -->
      <div class="card">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-lg font-medium text-neutral-800">{{ $t('absences.thisMonth') }}</h2>
          <button
            @click="navigateToAbsences"
            class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            {{ $t('dashboard.viewAll') }}
          </button>
        </div>
        <AbsenceCalendar
          :absences="absencesStore.absences"
          :requests="absencesStore.pendingRequests"
          :compact="true"
        />
      </div>

      <!-- Quick Actions Card -->
      <div class="card">
        <h2 class="text-lg font-medium text-neutral-800 mb-4">{{ $t('dashboard.quickActions') }}</h2>

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
            <span>{{ $t('newRequest.newAbsenceRequest') }}</span>
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
            <span>{{ $t('newRequest.viewWorkLogs') }}</span>
          </button>

          <!-- Quick Actions based on state -->
          <template v-if="workStatusStore.currentState === 'not_working'">
            <button
              @click="workStatusStore.startShift"
              class="flex items-center p-3 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors text-green-700 sm:col-span-2"
            >
              <span class="text-xl mr-2">▶️</span>
              <span>{{ $t('workStatus.startYourShift') }}</span>
            </button>
          </template>

          <template v-else-if="workStatusStore.currentState === 'working'">
            <button
              @click="workStatusStore.startBreak"
              class="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors text-amber-700"
            >
              <span class="text-xl mr-2">☕</span>
              <span>{{ $t('workStatus.takeBreak') }}</span>
            </button>
            <button
              @click="workStatusStore.startOffsite"
              class="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-blue-700"
            >
              <span class="text-xl mr-2">🚗</span>
              <span>{{ $t('workStatus.goOffsiteAction') }}</span>
            </button>
            <button
              @click="workStatusStore.endShift"
              class="flex items-center p-3 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors text-red-700 sm:col-span-2"
            >
              <span class="text-xl mr-2">⏹️</span>
              <span>{{ $t('workStatus.endYourShift') }}</span>
            </button>
          </template>

          <template v-else-if="workStatusStore.currentState === 'on_break'">
            <button
              @click="workStatusStore.endBreak"
              class="flex items-center p-3 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors text-green-700 sm:col-span-2"
            >
              <span class="text-xl mr-2">↩️</span>
              <span>{{ $t('workStatus.returnFromBreak') }}</span>
            </button>
          </template>

          <template v-else-if="workStatusStore.currentState === 'offsite'">
            <button
              @click="workStatusStore.endOffsite"
              class="flex items-center p-3 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors text-green-700 sm:col-span-2"
            >
              <span class="text-xl mr-2">🏢</span>
              <span>{{ $t('workStatus.returnToOfficeAction') }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
