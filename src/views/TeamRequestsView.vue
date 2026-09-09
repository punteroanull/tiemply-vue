<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAbsencesStore } from "../stores/absences";
import { useAuthStore } from "../stores/auth";
import { useDepartmentsStore } from "../stores/departments";
import { format, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { useToast } from "vue-toastification";

const { t, locale } = useI18n();

const router = useRouter();
const absencesStore = useAbsencesStore();
const authStore = useAuthStore();
const departmentsStore = useDepartmentsStore();
const toast = useToast();

const isLoading = computed(() => absencesStore.loading);
const isReviewing = computed(() => absencesStore.reviewing);
const teamRequests = computed(() => absencesStore.teamPendingRequests);

// Filter state
const statusFilter = ref<string>("pending");

// Expandable requests state
const expandedRequests = ref<Set<string>>(new Set());

// Rejection modal state
const showRejectionModal = ref(false);
const rejectionPeriodId = ref<string | null>(null);
const rejectionRequestId = ref<string | null>(null);
const rejectionReason = ref("");
const isRejectingAll = ref(false);

// Date locale
const dateLocale = computed(() => locale.value === "es" ? es : enUS);

// Filtered requests
const filteredRequests = computed(() => {
  if (statusFilter.value === "all") {
    return teamRequests.value;
  }
  if (statusFilter.value === "pending") {
    return teamRequests.value.filter(req =>
      req.status === "pending" || req.status === "partial"
    );
  }
  if (statusFilter.value === "reviewed") {
    return teamRequests.value.filter(req =>
      req.status === "approved" || req.status === "rejected"
    );
  }
  return teamRequests.value;
});

// Safe date formatting helper
function formatDate(dateValue: string | undefined | null): string {
  if (!dateValue) return "-";
  try {
    const date = parseISO(dateValue);
    return format(date, "MMM d, yyyy", { locale: dateLocale.value });
  } catch {
    return "-";
  }
}

function formatDateTime(dateValue: string | undefined | null): string {
  if (!dateValue) return "-";
  try {
    const date = parseISO(dateValue);
    return format(date, "MMM d, yyyy HH:mm", { locale: dateLocale.value });
  } catch {
    return "-";
  }
}

function formatTime(timeValue: string | undefined | null): string {
  if (!timeValue) return "";
  try {
    // Time is in HH:mm:ss format, just return HH:mm
    return timeValue.substring(0, 5);
  } catch {
    return "";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "partial":
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-neutral-100 text-neutral-800";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return t("requests.pending");
    case "approved":
      return t("requests.approved");
    case "rejected":
      return t("requests.rejected");
    case "partial":
      return t("requests.partialStatus");
    default:
      return status;
  }
}

function toggleRequestExpansion(requestId: string) {
  if (expandedRequests.value.has(requestId)) {
    expandedRequests.value.delete(requestId);
  } else {
    expandedRequests.value.add(requestId);
  }
}

function isRequestExpanded(requestId: string): boolean {
  return expandedRequests.value.has(requestId);
}

function getEmployeeName(request: any): string {
  return request.employee?.user?.name || request.employee?.name || t("teamRequests.employee");
}

function getEmployeeEmail(request: any): string {
  return request.employee?.user?.email || "-";
}

// Period date range text
function getPeriodDateText(period: any): string {
  if (period.isPartial) {
    return `${formatDate(period.startDate)} (${formatTime(period.startTime)} - ${formatTime(period.endTime)})`;
  }
  if (period.startDate === period.endDate) {
    return formatDate(period.startDate);
  }
  return `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;
}

// Request date range text
function getRequestDateText(request: any): string {
  if (request.usesPeriods && request.periods?.length > 0) {
    const firstPeriod = request.periods[0];
    const lastPeriod = request.periods[request.periods.length - 1];
    return `${formatDate(firstPeriod.startDate)} - ${formatDate(lastPeriod.endDate)}`;
  }
  return "-";
}

// Modal handlers
function openRejectPeriodModal(periodId: string) {
  rejectionPeriodId.value = periodId;
  rejectionRequestId.value = null;
  isRejectingAll.value = false;
  rejectionReason.value = "";
  showRejectionModal.value = true;
}

function openRejectAllModal(requestId: string) {
  rejectionRequestId.value = requestId;
  rejectionPeriodId.value = null;
  isRejectingAll.value = true;
  rejectionReason.value = "";
  showRejectionModal.value = true;
}

function closeRejectionModal() {
  showRejectionModal.value = false;
  rejectionPeriodId.value = null;
  rejectionRequestId.value = null;
  rejectionReason.value = "";
  isRejectingAll.value = false;
}

// Review actions
async function approvePeriod(periodId: string) {
  const success = await absencesStore.reviewPeriod(periodId, "approved");
  if (success) {
    toast.success(t("teamRequests.approveSuccess"));
  }
}

async function confirmRejectPeriod() {
  if (!rejectionReason.value.trim()) {
    toast.error(t("teamRequests.rejectionReason"));
    return;
  }

  if (rejectionPeriodId.value) {
    const success = await absencesStore.reviewPeriod(
      rejectionPeriodId.value,
      "rejected",
      rejectionReason.value
    );
    if (success) {
      toast.success(t("teamRequests.rejectSuccess"));
      closeRejectionModal();
    }
  }
}

async function approveAllPeriods(requestId: string) {
  const success = await absencesStore.approveAllPeriods(requestId);
  if (success) {
    toast.success(t("teamRequests.approveAllSuccess"));
  }
}

async function confirmRejectAll() {
  if (!rejectionReason.value.trim()) {
    toast.error(t("teamRequests.rejectionReason"));
    return;
  }

  if (rejectionRequestId.value) {
    const success = await absencesStore.rejectAllPeriods(
      rejectionRequestId.value,
      rejectionReason.value
    );
    if (success) {
      toast.success(t("teamRequests.rejectAllSuccess"));
      closeRejectionModal();
    }
  }
}

// Check if request has pending periods
function hasPendingPeriods(request: any): boolean {
  if (!request.periods) return false;
  return request.periods.some((p: any) => p.status === "pending");
}

onMounted(async () => {
  // Check if user is manager or admin
  if (!authStore.isManager && !authStore.isAdmin && !authStore.isSupervisor && !departmentsStore.isSupervisor) {
    toast.error(t("teamRequests.accessDenied"));
    router.push({ name: "dashboard" });
    return;
  }

  await absencesStore.fetchTeamPendingRequests();
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold text-neutral-800">{{ $t('teamRequests.title') }}</h1>
    </div>

    <!-- Status Filter -->
    <div class="mb-4">
      <div class="flex space-x-2 bg-white rounded-lg shadow p-1 inline-flex">
        <button
          @click="statusFilter = 'pending'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          {{ $t('teamRequests.pendingReview') }}
        </button>
        <button
          @click="statusFilter = 'reviewed'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'reviewed' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          {{ $t('teamRequests.reviewed') }}
        </button>
        <button
          @click="statusFilter = 'all'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'all' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          {{ $t('requests.all') }}
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredRequests.length === 0" class="bg-white rounded-lg shadow p-8 text-center">
      <div class="inline-flex items-center justify-center h-16 w-16 rounded-full bg-neutral-100 text-neutral-500 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-neutral-800 mb-2">{{ $t('teamRequests.noTeamRequests') }}</h3>
      <p class="text-neutral-600">
        {{ statusFilter === 'pending' ? $t('teamRequests.noTeamRequests') : $t('requests.noFilterResults', { status: statusFilter }) }}
      </p>
    </div>

    <!-- Requests list -->
    <div v-else class="space-y-4">
      <div
        v-for="request in filteredRequests"
        :key="request.id"
        class="bg-white rounded-lg shadow overflow-hidden"
      >
        <!-- Request header (expandable) -->
        <div
          class="px-6 py-4 cursor-pointer hover:bg-neutral-50 transition-colors"
          @click="toggleRequestExpansion(request.id)"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <h3 class="text-lg font-semibold text-neutral-800">
                  {{ getEmployeeName(request) }}
                </h3>
                <span
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="getStatusBadgeClass(request.status)"
                >
                  {{ getStatusLabel(request.status) }}
                </span>
              </div>
              <p class="text-sm text-neutral-500 mb-1">{{ getEmployeeEmail(request) }}</p>
              <div class="flex flex-wrap gap-4 text-sm text-neutral-600">
                <span class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {{ request.absenceType?.name || $t('absences.absence') }}
                </span>
                <span class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ getRequestDateText(request) }}
                </span>
                <span class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ $t('requests.daysCount', { count: request.daysCount || 0 }) }}
                </span>
                <span v-if="request.periods?.length" class="flex items-center text-indigo-600">
                  {{ request.periods.length }} {{ $t('requests.periods') }}
                </span>
              </div>
            </div>

            <!-- Expand icon -->
            <div class="ml-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-neutral-400 transition-transform"
                :class="{ 'transform rotate-180': isRequestExpanded(request.id) }"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <!-- Notes (if any) -->
          <p v-if="request.notes" class="mt-2 text-sm text-neutral-600 italic">
            "{{ request.notes }}"
          </p>

          <!-- Bulk actions for pending requests -->
          <div
            v-if="hasPendingPeriods(request)"
            class="mt-4 flex gap-3"
            @click.stop
          >
            <button
              @click="approveAllPeriods(request.id)"
              :disabled="isReviewing"
              class="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ $t('teamRequests.approveAll') }}
              </span>
            </button>
            <button
              @click="openRejectAllModal(request.id)"
              :disabled="isReviewing"
              class="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                {{ $t('teamRequests.rejectAll') }}
              </span>
            </button>
          </div>
        </div>

        <!-- Periods list (expandable content) -->
        <div
          v-if="isRequestExpanded(request.id) && request.periods?.length"
          class="border-t border-neutral-200 bg-neutral-50"
        >
          <div class="px-6 py-4">
            <h4 class="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              {{ $t('requests.periods') }}
            </h4>
            <div class="space-y-3">
              <div
                v-for="(period, index) in request.periods"
                :key="period.id"
                class="bg-white rounded-lg p-4 border border-neutral-200"
              >
                <div class="flex justify-between items-start mb-2">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                      <span class="text-sm font-medium text-neutral-700">
                        {{ $t('requests.periodOf', { current: index + 1, total: request.periods.length }) }}
                      </span>
                      <span
                        class="px-2 py-1 text-xs font-medium rounded-full"
                        :class="getStatusBadgeClass(period.status)"
                      >
                        {{ getStatusLabel(period.status) }}
                      </span>
                    </div>
                    <div class="space-y-1 text-sm text-neutral-600">
                      <p class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {{ getPeriodDateText(period) }}
                      </p>
                      <p class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ $t('requests.daysCount', { count: period.daysCount || 1 }) }}
                      </p>
                      <p v-if="period.reviewedBy && period.reviewedAt" class="flex items-center text-xs text-neutral-500 mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {{ $t('teamRequests.reviewedAt') }}: {{ formatDateTime(period.reviewedAt) }}
                      </p>
                      <p v-if="period.status === 'rejected' && period.rejectionReason" class="text-red-600 text-xs mt-2">
                        {{ $t('requests.reason') }}: {{ period.rejectionReason }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Period actions (only for pending periods) -->
                <div v-if="period.status === 'pending'" class="mt-3 flex gap-2">
                  <button
                    @click="approvePeriod(period.id)"
                    :disabled="isReviewing"
                    class="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ $t('teamRequests.approve') }}
                  </button>
                  <button
                    @click="openRejectPeriodModal(period.id)"
                    :disabled="isReviewing"
                    class="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ $t('teamRequests.reject') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Rejection modal -->
    <div v-if="showRejectionModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="closeRejectionModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
          <div class="flex items-center mb-4">
            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 class="ml-3 text-lg font-medium text-neutral-900">
              {{ isRejectingAll ? $t('teamRequests.rejectAll') : $t('teamRequests.confirmReject') }}
            </h3>
          </div>

          <div class="mb-4">
            <label for="rejectionReason" class="block text-sm font-medium text-neutral-700 mb-2">
              {{ $t('teamRequests.rejectionReason') }}
            </label>
            <textarea
              id="rejectionReason"
              v-model="rejectionReason"
              rows="4"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              :placeholder="$t('teamRequests.rejectionReasonPlaceholder')"
            ></textarea>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              @click="closeRejectionModal"
              :disabled="isReviewing"
              class="px-4 py-2 bg-neutral-100 text-neutral-700 font-medium rounded-md hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              @click="isRejectingAll ? confirmRejectAll() : confirmRejectPeriod()"
              :disabled="isReviewing || !rejectionReason.trim()"
              class="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <span v-if="isReviewing">{{ $t('common.loading') }}</span>
              <span v-else>{{ $t('teamRequests.reject') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
