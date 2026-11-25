<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAbsencesStore } from "../stores/absences";
import type { AbsenceRequest } from "../stores/absences";
import { useAuthStore } from "../stores/auth";
import { useDepartmentsStore } from "../stores/departments";
import { useToast } from "vue-toastification";
import BaseModal from "../components/BaseModal.vue";
import ErrorState from "../components/ErrorState.vue";
import { formatLocalized } from "../utils/apiDates";
import { sortPeriods } from "../utils/requestDates";
import {
  formatDateRange,
  formatRequestDates,
  requestStatusClass,
  requestStatusLabel,
} from "../utils/requestStatus";

const { t } = useI18n();

const router = useRouter();
const absencesStore = useAbsencesStore();
const authStore = useAuthStore();
const departmentsStore = useDepartmentsStore();
const toast = useToast();

const isLoading = computed(() => absencesStore.loading);
const isReviewing = computed(() => absencesStore.reviewing);

// Filter state
type StatusFilter = "pending" | "reviewed" | "all";
const statusFilter = ref<StatusFilter>("pending");
/** Reviewed requests come from a different endpoint and are only fetched when asked for. */
const reviewedLoaded = ref(false);

// Expandable requests state
const expandedRequests = ref<Set<string>>(new Set());

// What the confirmation / rejection dialogs act on
type ReviewTarget =
  | { kind: "period"; id: string; label: string }
  | { kind: "allPeriods"; id: string; label: string }
  | { kind: "request"; id: string; label: string };

const approveTarget = ref<ReviewTarget | null>(null);
const rejectTarget = ref<ReviewTarget | null>(null);
const rejectionReason = ref("");
const rejectionReasonTouched = ref(false);

const REASON_MAX_LENGTH = 500;

// Filtered requests
const filteredRequests = computed<AbsenceRequest[]>(() => {
  if (statusFilter.value === "pending") return absencesStore.teamPendingRequests;
  if (statusFilter.value === "reviewed") return absencesStore.teamReviewedRequests;
  return [...absencesStore.teamPendingRequests, ...absencesStore.teamReviewedRequests];
});

function formatDateTime(dateValue: string | undefined | null): string {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? "-" : formatLocalized(date, "PPp");
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

function getEmployeeName(request: AbsenceRequest): string {
  return request.employee?.user?.name || request.employee?.name || t("teamRequests.employee");
}

function getEmployeeEmail(request: AbsenceRequest): string {
  return request.employee?.user?.email || "";
}

function periodsOf(request: AbsenceRequest) {
  return sortPeriods(request.periods);
}

/**
 * The API refuses to let anyone but an administrator review their own request, so the
 * buttons are not offered on it.
 */
function isOwnRequest(request: AbsenceRequest): boolean {
  const ownerUserId = request.employee?.userId ?? request.employee?.user?.id;
  return !!ownerUserId && ownerUserId === authStore.user?.id;
}

function canReview(request: AbsenceRequest): boolean {
  return authStore.isAdmin || !isOwnRequest(request);
}

// Check if request has pending periods
function hasPendingPeriods(request: AbsenceRequest): boolean {
  return (request.periods ?? []).some((p) => p.status === "pending");
}

/** A pending request with one plain date range and no periods: reviewed as a whole. */
function isSimplePending(request: AbsenceRequest): boolean {
  return request.status === "pending" && !request.periods?.length && !!request.startDate;
}

// Dialog handlers
function askApprove(target: ReviewTarget) {
  approveTarget.value = target;
}

function askReject(target: ReviewTarget) {
  rejectTarget.value = target;
  rejectionReason.value = "";
  rejectionReasonTouched.value = false;
}

function closeApproveModal() {
  approveTarget.value = null;
}

function closeRejectionModal() {
  rejectTarget.value = null;
  rejectionReason.value = "";
  rejectionReasonTouched.value = false;
}

const rejectionReasonError = computed(() =>
  rejectionReasonTouched.value && !rejectionReason.value.trim()
    ? t("teamRequests.rejectionReasonRequired")
    : ""
);

// Review actions. The store reports failures; the one success toast comes from here.
async function confirmApprove() {
  const target = approveTarget.value;
  if (!target) return;

  let success = false;
  let message = "";
  if (target.kind === "period") {
    success = await absencesStore.reviewPeriod(target.id, "approved");
    message = t("teamRequests.approveSuccess");
  } else if (target.kind === "allPeriods") {
    success = await absencesStore.approveAllPeriods(target.id);
    message = t("teamRequests.approveAllSuccess");
  } else {
    success = await absencesStore.approveRequest(target.id);
    message = t("teamRequests.approveRequestSuccess");
  }

  if (success) {
    toast.success(message);
    closeApproveModal();
    refreshReviewed();
  }
}

async function confirmReject() {
  const target = rejectTarget.value;
  if (!target) return;

  rejectionReasonTouched.value = true;
  const reason = rejectionReason.value.trim();
  if (!reason) return;

  let success = false;
  let message = "";
  if (target.kind === "period") {
    success = await absencesStore.reviewPeriod(target.id, "rejected", reason);
    message = t("teamRequests.rejectSuccess");
  } else if (target.kind === "allPeriods") {
    success = await absencesStore.rejectAllPeriods(target.id, reason);
    message = t("teamRequests.rejectAllSuccess");
  } else {
    success = await absencesStore.rejectRequest(target.id, reason);
    message = t("teamRequests.rejectRequestSuccess");
  }

  if (success) {
    toast.success(message);
    closeRejectionModal();
    refreshReviewed();
  }
}

/** Keep the reviewed list current once it is on screen, without a spinner. */
function refreshReviewed() {
  if (reviewedLoaded.value) {
    absencesStore.fetchTeamReviewedRequests({ silent: true });
  }
}

async function load() {
  const work: Promise<unknown>[] = [absencesStore.fetchTeamPendingRequests()];
  if (statusFilter.value !== "pending") {
    reviewedLoaded.value = true;
    work.push(absencesStore.fetchTeamReviewedRequests());
  }
  await Promise.all(work);
}

watch(statusFilter, (filter) => {
  if (filter !== "pending" && !reviewedLoaded.value) {
    reviewedLoaded.value = true;
    absencesStore.fetchTeamReviewedRequests();
  }
});

onMounted(async () => {
  // Managers, administrators and supervisors of any department
  if (!departmentsStore.canManageDepartment && !authStore.supervisesAnyDepartment) {
    toast.error(t("teamRequests.accessDenied"));
    router.push({ name: "dashboard" });
    return;
  }

  await load();
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold text-neutral-800">{{ $t('teamRequests.title') }}</h1>
    </div>

    <!-- Status Filter -->
    <div class="mb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div class="inline-flex space-x-2 bg-white rounded-lg shadow p-1 min-w-max" role="group" :aria-label="$t('absences.status')">
        <button
          type="button"
          @click="statusFilter = 'pending'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
          :aria-pressed="statusFilter === 'pending'"
        >
          {{ $t('teamRequests.pendingReview') }}
        </button>
        <button
          type="button"
          @click="statusFilter = 'reviewed'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="statusFilter === 'reviewed' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
          :aria-pressed="statusFilter === 'reviewed'"
        >
          {{ $t('teamRequests.reviewed') }}
        </button>
        <button
          type="button"
          @click="statusFilter = 'all'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="statusFilter === 'all' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
          :aria-pressed="statusFilter === 'all'"
        >
          {{ $t('requests.all') }}
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64" role="status">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      <span class="sr-only">{{ $t('common.loading') }}</span>
    </div>

    <!-- Error state: a failed load is not "nothing to review" -->
    <ErrorState v-else-if="absencesStore.teamRequestsError" @retry="load" />

    <!-- Empty state -->
    <div v-else-if="filteredRequests.length === 0" class="bg-white rounded-lg shadow p-8 text-center">
      <div class="inline-flex items-center justify-center h-16 w-16 rounded-full bg-neutral-100 text-neutral-500 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-neutral-800 mb-2">{{ $t(`teamRequests.empty.${statusFilter}.title`) }}</h3>
      <p class="text-neutral-600">{{ $t(`teamRequests.empty.${statusFilter}.description`) }}</p>
    </div>

    <!-- Requests list -->
    <div v-else class="space-y-4">
      <div
        v-for="request in filteredRequests"
        :key="request.id"
        class="bg-white rounded-lg shadow overflow-hidden"
      >
        <div class="px-4 sm:px-6 py-4">
          <!-- Request header: a real button when there are periods to unfold -->
          <component
            :is="request.periods?.length ? 'button' : 'div'"
            :type="request.periods?.length ? 'button' : undefined"
            class="w-full text-left flex justify-between items-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            :class="{ 'hover:bg-neutral-50 -m-2 p-2 transition-colors': request.periods?.length }"
            :aria-expanded="request.periods?.length ? isRequestExpanded(request.id) : undefined"
            :aria-controls="request.periods?.length ? `periods-${request.id}` : undefined"
            @click="request.periods?.length && toggleRequestExpansion(request.id)"
          >
            <span class="flex-1 min-w-0 block">
              <span class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                <span class="text-lg font-semibold text-neutral-800">
                  {{ getEmployeeName(request) }}
                </span>
                <span
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="requestStatusClass(request.status)"
                >
                  {{ requestStatusLabel(request.status) }}
                </span>
              </span>
              <span v-if="getEmployeeEmail(request)" class="block text-sm text-neutral-500 mb-1 truncate">
                {{ getEmployeeEmail(request) }}
              </span>
              <span class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                <span class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {{ request.absenceType?.name || $t('absences.absence') }}
                </span>
                <span class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ formatRequestDates(request) }}
                </span>
                <span class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ $t('requests.daysCount', { count: request.daysCount ?? 0 }) }}
                </span>
                <span v-if="request.periods && request.periods.length > 1" class="flex items-center text-indigo-600">
                  {{ request.periods.length }} {{ $t('requests.periods') }}
                </span>
              </span>
            </span>

            <!-- Expand icon -->
            <span v-if="request.periods?.length" class="ml-4 flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-neutral-400 transition-transform"
                :class="{ 'transform rotate-180': isRequestExpanded(request.id) }"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </component>

          <!-- Notes (if any) -->
          <p v-if="request.notes" class="mt-2 text-sm text-neutral-600 italic break-words">
            "{{ request.notes }}"
          </p>

          <p v-if="request.status === 'rejected' && request.rejectionReason" class="mt-2 text-sm text-red-600 break-words">
            {{ $t('requests.reason') }}: {{ request.rejectionReason }}
          </p>

          <!-- Own request: nobody reviews their own -->
          <p
            v-if="!canReview(request) && (hasPendingPeriods(request) || isSimplePending(request))"
            class="mt-3 text-sm text-neutral-500"
          >
            {{ $t('teamRequests.ownRequest') }}
          </p>

          <!-- Bulk actions for requests with pending periods -->
          <div
            v-else-if="hasPendingPeriods(request)"
            class="mt-4 flex flex-col sm:flex-row gap-3"
          >
            <button
              type="button"
              @click="askApprove({ kind: 'allPeriods', id: request.id, label: getEmployeeName(request) })"
              :disabled="isReviewing"
              class="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            >
              <span class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ request.periods && request.periods.length > 1 ? $t('teamRequests.approveAll') : $t('teamRequests.approve') }}
              </span>
            </button>
            <button
              type="button"
              @click="askReject({ kind: 'allPeriods', id: request.id, label: getEmployeeName(request) })"
              :disabled="isReviewing"
              class="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <span class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                {{ request.periods && request.periods.length > 1 ? $t('teamRequests.rejectAll') : $t('teamRequests.reject') }}
              </span>
            </button>
          </div>

          <!-- A request with a single range and no periods is reviewed as a whole -->
          <div
            v-else-if="isSimplePending(request)"
            class="mt-4 flex flex-col sm:flex-row gap-3"
          >
            <button
              type="button"
              @click="askApprove({ kind: 'request', id: request.id, label: getEmployeeName(request) })"
              :disabled="isReviewing"
              class="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            >
              {{ $t('teamRequests.approve') }}
            </button>
            <button
              type="button"
              @click="askReject({ kind: 'request', id: request.id, label: getEmployeeName(request) })"
              :disabled="isReviewing"
              class="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              {{ $t('teamRequests.reject') }}
            </button>
          </div>
        </div>

        <!-- Periods list (expandable content) -->
        <div
          v-if="isRequestExpanded(request.id) && request.periods?.length"
          :id="`periods-${request.id}`"
          class="border-t border-neutral-200 bg-neutral-50"
        >
          <div class="px-4 sm:px-6 py-4">
            <h4 class="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              {{ $t('requests.periods') }}
            </h4>
            <div class="space-y-3">
              <div
                v-for="(period, index) in periodsOf(request)"
                :key="period.id"
                class="bg-white rounded-lg p-4 border border-neutral-200"
              >
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <span class="text-sm font-medium text-neutral-700">
                    {{ $t('requests.periodOf', { current: index + 1, total: request.periods.length }) }}
                  </span>
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="requestStatusClass(period.status)"
                  >
                    {{ requestStatusLabel(period.status) }}
                  </span>
                </div>
                <div class="space-y-1 text-sm text-neutral-600">
                  <p class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {{ formatDateRange(period) }}
                  </p>
                  <p class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ $t('requests.daysCount', { count: period.daysCount ?? 0 }) }}
                  </p>
                  <p v-if="period.reviewedAt" class="flex items-center text-xs text-neutral-500 mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {{ $t('teamRequests.reviewedAt') }}: {{ formatDateTime(period.reviewedAt) }}
                  </p>
                  <p v-if="period.status === 'rejected' && period.rejectionReason" class="text-red-600 text-xs mt-2 break-words">
                    {{ $t('requests.reason') }}: {{ period.rejectionReason }}
                  </p>
                </div>

                <!-- Period actions (only for pending periods the user may review) -->
                <div v-if="period.status === 'pending' && canReview(request)" class="mt-3 flex gap-2">
                  <button
                    type="button"
                    @click="askApprove({ kind: 'period', id: period.id, label: formatDateRange(period) })"
                    :disabled="isReviewing"
                    class="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                  >
                    {{ $t('teamRequests.approve') }}
                  </button>
                  <button
                    type="button"
                    @click="askReject({ kind: 'period', id: period.id, label: formatDateRange(period) })"
                    :disabled="isReviewing"
                    class="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
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

    <!-- Approval confirmation: approving creates the absences and takes the days -->
    <BaseModal
      :open="approveTarget !== null"
      :title="$t('teamRequests.confirmApproveTitle')"
      :busy="isReviewing"
      @close="closeApproveModal"
    >
      <p class="text-neutral-600">
        {{
          approveTarget?.kind === 'period'
            ? $t('teamRequests.confirmApprovePeriod', { dates: approveTarget.label })
            : $t('teamRequests.confirmApproveRequest', { name: approveTarget?.label })
        }}
      </p>
      <p class="mt-2 text-sm text-neutral-500">{{ $t('teamRequests.confirmApproveHint') }}</p>
      <template #footer>
        <button type="button" class="btn-outline" :disabled="isReviewing" @click="closeApproveModal">
          {{ $t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn bg-green-600 text-white hover:bg-green-700"
          :disabled="isReviewing"
          @click="confirmApprove"
        >
          {{ isReviewing ? $t('common.loading') : $t('teamRequests.approve') }}
        </button>
      </template>
    </BaseModal>

    <!-- Rejection dialog -->
    <BaseModal
      :open="rejectTarget !== null"
      :title="rejectTarget?.kind === 'allPeriods' ? $t('teamRequests.rejectAll') : $t('teamRequests.confirmReject')"
      :busy="isReviewing"
      @close="closeRejectionModal"
    >
      <p v-if="rejectTarget" class="text-sm text-neutral-600 mb-3">{{ rejectTarget.label }}</p>
      <label for="rejectionReason" class="block text-sm font-medium text-neutral-700 mb-2">
        {{ $t('teamRequests.rejectionReason') }} <span class="text-red-500" aria-hidden="true">*</span>
      </label>
      <textarea
        id="rejectionReason"
        v-model="rejectionReason"
        rows="4"
        autofocus
        required
        :maxlength="REASON_MAX_LENGTH"
        :aria-invalid="rejectionReasonError ? 'true' : undefined"
        :aria-describedby="rejectionReasonError ? 'rejectionReasonError' : undefined"
        class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        :class="rejectionReasonError ? 'border-red-400' : 'border-neutral-300'"
        :placeholder="$t('teamRequests.rejectionReasonPlaceholder')"
        @blur="rejectionReasonTouched = true"
      ></textarea>
      <div class="mt-1 flex justify-between gap-3 text-xs">
        <p id="rejectionReasonError" class="text-red-600">{{ rejectionReasonError }}</p>
        <p class="text-neutral-500 whitespace-nowrap">
          {{ rejectionReason.length }}/{{ REASON_MAX_LENGTH }} {{ $t('newRequest.characters') }}
        </p>
      </div>
      <template #footer>
        <button type="button" class="btn-outline" :disabled="isReviewing" @click="closeRejectionModal">
          {{ $t('common.cancel') }}
        </button>
        <button type="button" class="btn-danger" :disabled="isReviewing" @click="confirmReject">
          {{ isReviewing ? $t('common.loading') : $t('teamRequests.reject') }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
