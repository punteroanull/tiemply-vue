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
import { formatApiDate, formatLocalized, apiDateToYmd } from "../utils/apiDates";
import type { WorkLogCategory } from "../types";
import StatusBadge from '../components/StatusBadge.vue';
import AbsenceCalendar from '../components/AbsenceCalendar.vue';
import ScheduleBlock from '../components/ScheduleBlock.vue';
import NightShiftIndicator from '../components/NightShiftIndicator.vue';

const { t } = useI18n();

// A request made from the app carries its dates in `periods`; older ones on the request.
function requestRange(request: any): string {
  const periods: any[] = Array.isArray(request.periods) ? request.periods : [];
  const starts = periods.map((p) => apiDateToYmd(p.startDate)).filter(Boolean) as string[];
  const ends = periods.map((p) => apiDateToYmd(p.endDate)).filter(Boolean) as string[];

  const start = starts.length ? starts.sort()[0] : apiDateToYmd(request.startDate);
  const end = ends.length ? ends.sort()[ends.length - 1] : apiDateToYmd(request.endDate);

  if (!start) return "-";
  const from = formatApiDate(start, "PP");
  const to = end && end !== start ? formatApiDate(end, "PP") : "";
  return to ? `${from} - ${to}` : from;
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
const userName = computed(() => authStore.user?.name || "");
const todayDate = computed(() => formatLocalized(new Date(), "PPPP"));

// Worked versus expected time this week. Null when the API expects nothing (flexible
// contracts on some periods), in which case no bar is drawn.
const weeklyProgress = computed(() => {
  const percent = workLogsStore.weeklyReport?.progressPercent;
  return percent === null || percent === undefined || !Number.isFinite(percent)
    ? null
    : Math.max(0, Math.round(percent));
});

// A second tap while a clock action (or its location lookup) is running must do nothing.
const actionsDisabled = computed(
  () => workStatusStore.isBusy || workStatusStore.gettingLocation
);

function clock(category: WorkLogCategory) {
  // Same entry point as the floating button: offline queue and end-of-shift confirmation.
  workStatusStore.requestAction(category);
}

onMounted(async () => {
  try {
    await Promise.all([
      workStatusStore.fetchStatus({ silent: true }),
      workLogsStore.fetchWeeklyReport(),
      absencesStore.fetchPendingRequests(),
      absencesStore.fetchAbsences(),
      schedulesStore.fetchCurrentSchedule(),
      schedulesStore.fetchWeeklySchedule(),
      incidentsStore.fetchIncidents({ status: 'pending' }),
    ]);
  } catch {
    // Each store reports its own failure.
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
        <div v-if="workStatusStore.formattedShiftDate" class="mb-4 p-2 bg-purple-50 rounded-md text-sm text-purple-700">
          {{ $t('workLog.shiftDateDifferent', { date: workStatusStore.formattedShiftDate }) }}
        </div>

        <div class="space-y-4">
          <!-- Working State -->
          <div v-if="workStatusStore.currentState === 'working'" class="flex items-center text-green-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <div>
              <p class="text-sm text-neutral-600">{{ $t('dashboard.workingSince') }}</p>
              <p class="font-semibold">{{ workStatusStore.formattedLastCheckIn }}</p>
              <p v-if="workStatusStore.formattedCurrentDuration" class="text-sm text-green-700 mt-1 tabular-nums">
                {{ $t('dashboard.duration') }}: {{ workStatusStore.formattedCurrentDuration }}
              </p>
            </div>
          </div>

          <!-- On Break State -->
          <div v-else-if="workStatusStore.currentState === 'on_break'" class="flex items-center text-amber-700">
            <span class="text-2xl mr-2" aria-hidden="true">☕</span>
            <div>
              <p class="text-sm text-neutral-600">{{ $t('dashboard.onBreak') }}</p>
              <p class="font-semibold">{{ $t('dashboard.startedAt') }} {{ workStatusStore.formattedLastCheckOut }}</p>
              <p v-if="workStatusStore.formattedCurrentDuration" class="text-sm text-amber-700 mt-1 tabular-nums">
                {{ $t('dashboard.breakTime') }}: {{ workStatusStore.formattedCurrentDuration }}
              </p>
            </div>
          </div>

          <!-- Offsite State -->
          <div v-else-if="workStatusStore.currentState === 'offsite'" class="flex items-center text-blue-700">
            <span class="text-2xl mr-2" aria-hidden="true">🚗</span>
            <div>
              <p class="text-sm text-neutral-600">{{ $t('dashboard.offsite') }}</p>
              <p class="font-semibold">{{ $t('dashboard.leftAt') }} {{ workStatusStore.formattedLastCheckOut }}</p>
              <p v-if="workStatusStore.formattedCurrentDuration" class="text-sm text-blue-700 mt-1 tabular-nums">
                {{ $t('dashboard.timeOffsite') }}: {{ workStatusStore.formattedCurrentDuration }}
              </p>
            </div>
          </div>

          <!-- Not Working State -->
          <div v-else-if="workStatusStore.formattedLastCheckOut" class="flex items-center text-neutral-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
          <div v-if="workLogsStore.weeklyReport.expectedDuration" class="flex justify-between mb-2">
            <span class="text-neutral-600">{{ $t('dashboard.expectedHours') }}</span>
            <span class="font-semibold">{{ workLogsStore.weeklyReport.expectedDuration }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-600">{{ $t('dashboard.daysWorked') }}</span>
            <span class="font-semibold">{{ workLogsStore.weeklyReport.totalDays || 0 }}</span>
          </div>

          <!-- Hours worked against the hours the contract or schedule expects this week,
               instead of assuming everyone works five days. -->
          <div v-if="weeklyProgress !== null" class="mt-4 pt-4 border-t border-neutral-200">
            <div class="flex items-center">
              <div
                class="flex-1 bg-neutral-200 rounded-full h-2"
                role="progressbar"
                :aria-label="$t('dashboard.weeklyProgress')"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="Math.min(weeklyProgress, 100)"
              >
                <div
                  class="bg-primary-600 h-2 rounded-full"
                  :style="`width: ${Math.min(weeklyProgress, 100)}%`"
                ></div>
              </div>
              <span class="text-sm text-neutral-600 ml-2 tabular-nums">{{ weeklyProgress }}%</span>
            </div>
          </div>
        </div>
        <div v-else-if="workLogsStore.errors.weekly" class="text-neutral-600" role="alert">
          <p>{{ $t('dashboard.weeklyLoadError') }}</p>
          <button
            type="button"
            class="mt-2 text-sm text-primary-600 hover:text-primary-700 hover:underline"
            @click="workLogsStore.fetchWeeklyReport()"
          >
            {{ $t('common.retry') }}
          </button>
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
                {{ requestRange(request) }}
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
              type="button"
              :disabled="actionsDisabled"
              @click="clock('shift_start')"
              class="disabled:opacity-50 disabled:cursor-not-allowed flex items-center p-3 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors text-green-700 sm:col-span-2"
            >
              <span class="text-xl mr-2" aria-hidden="true">▶️</span>
              <span>{{ $t('workStatus.startYourShift') }}</span>
            </button>
          </template>

          <template v-else-if="workStatusStore.currentState === 'working'">
            <button
              type="button"
              :disabled="actionsDisabled"
              @click="clock('break_start')"
              class="disabled:opacity-50 disabled:cursor-not-allowed flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors text-amber-700"
            >
              <span class="text-xl mr-2" aria-hidden="true">☕</span>
              <span>{{ $t('workStatus.takeBreak') }}</span>
            </button>
            <button
              type="button"
              :disabled="actionsDisabled"
              @click="clock('offsite_start')"
              class="disabled:opacity-50 disabled:cursor-not-allowed flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-blue-700"
            >
              <span class="text-xl mr-2" aria-hidden="true">🚗</span>
              <span>{{ $t('workStatus.goOffsiteAction') }}</span>
            </button>
            <button
              type="button"
              :disabled="actionsDisabled"
              @click="clock('shift_end')"
              class="disabled:opacity-50 disabled:cursor-not-allowed flex items-center p-3 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors text-red-700 sm:col-span-2"
            >
              <span class="text-xl mr-2" aria-hidden="true">⏹️</span>
              <span>{{ $t('workStatus.endYourShift') }}</span>
            </button>
          </template>

          <template v-else-if="workStatusStore.currentState === 'on_break'">
            <button
              type="button"
              :disabled="actionsDisabled"
              @click="clock('break_end')"
              class="disabled:opacity-50 disabled:cursor-not-allowed flex items-center p-3 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors text-green-700 sm:col-span-2"
            >
              <span class="text-xl mr-2" aria-hidden="true">↩️</span>
              <span>{{ $t('workStatus.returnFromBreak') }}</span>
            </button>
          </template>

          <template v-else-if="workStatusStore.currentState === 'offsite'">
            <button
              type="button"
              :disabled="actionsDisabled"
              @click="clock('offsite_end')"
              class="disabled:opacity-50 disabled:cursor-not-allowed flex items-center p-3 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors text-green-700 sm:col-span-2"
            >
              <span class="text-xl mr-2" aria-hidden="true">🏢</span>
              <span>{{ $t('workStatus.returnToOfficeAction') }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
