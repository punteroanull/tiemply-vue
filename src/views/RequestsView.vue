<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAbsencesStore } from "../stores/absences";
import type { AbsenceRequest } from "../stores/absences";
import { useAuthStore } from "../stores/auth";
import BaseModal from "../components/BaseModal.vue";
import ErrorState from "../components/ErrorState.vue";
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

const isLoading = computed(() => absencesStore.loading);
const requests = computed(() => absencesStore.requests);

// Vacation days info. /me arrives camelCased, so the company's yearly allowance is
// `maxVacationDays`; reading the snake_case name always fell back to 22.
const remainingVacationDays = computed(() => authStore.remainingVacationDays);
const maxVacationDays = computed(
  () => authStore.currentCompany?.maxVacationDays ?? null
);

// Absences by type (excluding vacation)
const absenceCountsByType = computed(() => {
  const counts: Record<string, { name: string; count: number; code: string }> = {};

  absencesStore.absences
    .filter(absence => absence.absenceType?.code !== 'vacation')
    .forEach(absence => {
      const typeId = absence.absenceType?.id;
      if (typeId && absence.absenceType) {
        if (!counts[typeId]) {
          counts[typeId] = {
            name: absence.absenceType.name,
            count: 0,
            code: absence.absenceType.code
          };
        }
        counts[typeId].count++;
      }
    });

  return Object.values(counts);
});

// Get color classes for absence type
function getTypeColorClasses(code: string) {
  switch (code) {
    case 'sick_leave':
      return { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100' };
    case 'personal_leave':
      return { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' };
    default:
      return { bg: 'bg-neutral-50', text: 'text-neutral-600', icon: 'bg-neutral-100' };
  }
}

// Filter state
type StatusFilter = "all" | "pending" | "approved" | "rejected" | "partial";
const statusFilter = ref<StatusFilter>("all");

const filterTabs: { value: StatusFilter; label: string; active: string }[] = [
  { value: "all", label: "requests.all", active: "bg-primary-600 text-white" },
  { value: "pending", label: "requests.pending", active: "bg-amber-500 text-white" },
  { value: "approved", label: "requests.approved", active: "bg-green-600 text-white" },
  { value: "rejected", label: "requests.rejected", active: "bg-red-600 text-white" },
  { value: "partial", label: "requests.partialStatus", active: "bg-indigo-600 text-white" },
];

// Filtered requests
const filteredRequests = computed(() => {
  if (statusFilter.value === "all") {
    return requests.value;
  }
  return requests.value.filter((req) => req.status === statusFilter.value);
});

// Delete confirmation
const showDeleteModal = ref(false);
const requestToDelete = ref<string | null>(null);
const isDeleting = ref(false);

/** Periods in date order, shown one by one when a request has several or one was rejected. */
function periodsOf(request: AbsenceRequest) {
  return sortPeriods(request.periods);
}

function showsPeriodBreakdown(request: AbsenceRequest): boolean {
  const periods = request.periods ?? [];
  return periods.length > 1 || periods.some((period) => period.status === "rejected");
}

/**
 * Why a request was turned down. A period-based request (every one made from this app)
 * keeps the reason on each period, not on the request.
 */
function rejectionReasons(request: AbsenceRequest): string[] {
  const reasons = [
    request.rejectionReason,
    ...(request.periods ?? []).map((period) => period.rejectionReason),
  ].filter((reason): reason is string => !!reason);
  return [...new Set(reasons)];
}

/** The API only withdraws a request nobody has started reviewing. */
function canCancel(request: AbsenceRequest): boolean {
  return request.status === "pending";
}

/** The edit form (and the API) only handle a pending request made of one plain range. */
function canEdit(request: AbsenceRequest): boolean {
  return (
    request.status === "pending" &&
    !request.usesPeriods &&
    !request.periods?.length &&
    !!request.startDate
  );
}

function navigateToNewRequest() {
  router.push("/requests/new");
}

function editRequest(requestId: string) {
  router.push(`/requests/${requestId}/edit`);
}

function openDeleteModal(requestId: string) {
  requestToDelete.value = requestId;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  requestToDelete.value = null;
}

async function confirmDelete() {
  if (!requestToDelete.value) return;

  isDeleting.value = true;
  try {
    const cancelled = await absencesStore.cancelRequest(requestToDelete.value);
    if (cancelled) closeDeleteModal();
  } finally {
    isDeleting.value = false;
  }
}

async function load() {
  // Always refetch: requests get reviewed and absences appear while the app stays open.
  await Promise.all([
    absencesStore.fetchAbsenceRequests(),
    absencesStore.fetchAbsences(),
  ]);
}

onMounted(load);
</script>

<template>
  <div class="container mx-auto px-4 py-4 overflow-x-hidden">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold text-neutral-800">{{ $t('requests.title') }}</h1>
      <button
        type="button"
        @click="navigateToNewRequest"
        class="btn-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        {{ $t('requests.newRequest') }}
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Vacation Days Card -->
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
        <div class="flex items-center min-w-0">
          <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-4 min-w-0">
            <p class="text-sm font-medium text-neutral-500 truncate">{{ $t('absences.vacationAvailable') }}</p>
            <p class="text-xl font-bold text-blue-600">
              <template v-if="maxVacationDays !== null">
                {{ $t('absences.daysAvailable', { remaining: remainingVacationDays, total: maxVacationDays }) }}
              </template>
              <template v-else>
                {{ $t('requests.daysCount', { count: remainingVacationDays }) }}
              </template>
            </p>
          </div>
        </div>
      </div>

      <!-- Other Absence Types Cards -->
      <div
        v-for="absenceType in absenceCountsByType"
        :key="absenceType.code"
        class="bg-white rounded-lg shadow p-4 border-l-4"
        :class="{
          'border-red-500': absenceType.code === 'sick_leave',
          'border-purple-500': absenceType.code === 'personal_leave',
          'border-neutral-400': absenceType.code !== 'sick_leave' && absenceType.code !== 'personal_leave'
        }"
      >
        <div class="flex items-center min-w-0">
          <div
            class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
            :class="getTypeColorClasses(absenceType.code).icon"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="getTypeColorClasses(absenceType.code).text" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-4 min-w-0">
            <p class="text-sm font-medium text-neutral-500 truncate">{{ absenceType.name }}</p>
            <p class="text-xl font-bold" :class="getTypeColorClasses(absenceType.code).text">
              {{ $t('absences.daysUsed', { count: absenceType.count }) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Filter - scrollable on mobile -->
    <div class="mb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div class="flex space-x-2 bg-white rounded-lg shadow p-1 min-w-max" role="group" :aria-label="$t('absences.status')">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          type="button"
          @click="statusFilter = tab.value"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="statusFilter === tab.value ? tab.active : 'text-neutral-600 hover:bg-neutral-100'"
          :aria-pressed="statusFilter === tab.value"
        >
          {{ $t(tab.label) }}
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64" role="status">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      <span class="sr-only">{{ $t('common.loading') }}</span>
    </div>

    <!-- Error state: a failed load is not "no requests" -->
    <ErrorState v-else-if="absencesStore.requestsError" @retry="load" />

    <!-- Empty state -->
    <div v-else-if="filteredRequests.length === 0" class="bg-white rounded-lg shadow p-8 text-center">
      <div class="inline-flex items-center justify-center h-16 w-16 rounded-full bg-neutral-100 text-neutral-500 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-neutral-800 mb-2">{{ $t('requests.noRequests') }}</h3>
      <p class="text-neutral-600 mb-4">
        {{ statusFilter === 'all' ? $t('requests.noRequestsYet') : $t(`requests.noResultsByStatus.${statusFilter}`) }}
      </p>
      <button
        v-if="requests.length === 0"
        type="button"
        @click="navigateToNewRequest"
        class="btn-primary inline-flex"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        {{ $t('requests.createFirst') }}
      </button>
    </div>

    <!-- Requests list -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <!-- Desktop table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-neutral-200">
          <thead class="bg-neutral-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {{ $t('requests.type') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {{ $t('requests.dates') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {{ $t('requests.days') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {{ $t('absences.status') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {{ $t('workLogs.notes') }}
              </th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {{ $t('requests.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-neutral-200">
            <tr v-for="request in filteredRequests" :key="request.id" class="hover:bg-neutral-50 align-top">
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-medium text-neutral-800">{{ request.absenceType?.name || t('absences.absence') }}</span>
                <span v-if="request.isPartial && !request.usesPeriods" class="ml-2 text-xs text-neutral-500">({{ $t('requests.partial') }})</span>
                <span v-if="request.periods && request.periods.length > 1" class="ml-2 text-xs text-neutral-500">
                  ({{ request.periods.length }} {{ $t('requests.periods') }})
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-neutral-600">
                <span class="whitespace-nowrap">{{ formatRequestDates(request) }}</span>
                <!-- Each period with its own outcome -->
                <ul v-if="showsPeriodBreakdown(request)" class="mt-2 space-y-1">
                  <li
                    v-for="period in periodsOf(request)"
                    :key="period.id"
                    class="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <span class="whitespace-nowrap">{{ formatDateRange(period) }}</span>
                    <span class="px-2 py-0.5 font-medium rounded-full" :class="requestStatusClass(period.status)">
                      {{ requestStatusLabel(period.status) }}
                    </span>
                  </li>
                </ul>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                <span>{{ $t('requests.daysCount', { count: request.daysCount ?? 0 }) }}</span>
                <div v-if="request.status === 'partial'" class="text-xs mt-1">
                  <span class="text-green-600">{{ request.approvedDaysCount || 0 }} {{ $t('requests.approvedDays') }}</span>
                  <span class="text-neutral-400 mx-1">|</span>
                  <span class="text-amber-600">{{ request.pendingDaysCount || 0 }} {{ $t('requests.pendingDays') }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="requestStatusClass(request.status)"
                >
                  {{ requestStatusLabel(request.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-neutral-600 max-w-xs">
                <p class="truncate" :title="request.notes || undefined">{{ request.notes || "-" }}</p>
                <p
                  v-for="reason in rejectionReasons(request)"
                  :key="reason"
                  class="text-red-600 text-xs mt-1 break-words"
                >
                  {{ $t('requests.reason') }}: {{ reason }}
                </p>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <div v-if="canEdit(request) || canCancel(request)" class="flex justify-end gap-4">
                  <button
                    v-if="canEdit(request)"
                    type="button"
                    @click="editRequest(request.id)"
                    class="text-primary-600 hover:text-primary-800 font-medium"
                  >
                    {{ $t('requests.edit') }}
                  </button>
                  <button
                    v-if="canCancel(request)"
                    type="button"
                    @click="openDeleteModal(request.id)"
                    class="text-red-600 hover:text-red-800 font-medium"
                  >
                    {{ $t('requests.cancel') }}
                  </button>
                </div>
                <span v-else class="text-neutral-400" aria-hidden="true">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div class="md:hidden divide-y divide-neutral-200">
        <div v-for="request in filteredRequests" :key="request.id" class="p-4">
          <div class="flex justify-between items-start gap-2 mb-2">
            <div class="min-w-0">
              <span class="font-medium text-neutral-800">{{ request.absenceType?.name || t('absences.absence') }}</span>
              <span v-if="request.isPartial && !request.usesPeriods" class="ml-2 text-xs text-neutral-500">({{ $t('requests.partial') }})</span>
              <span v-if="request.periods && request.periods.length > 1" class="ml-2 text-xs text-neutral-500">
                ({{ request.periods.length }} {{ $t('requests.periods') }})
              </span>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
              :class="requestStatusClass(request.status)"
            >
              {{ requestStatusLabel(request.status) }}
            </span>
          </div>
          <div class="text-sm text-neutral-600 mb-2">
            {{ formatRequestDates(request) }}
            <span class="ml-2">({{ $t('requests.daysCount', { count: request.daysCount ?? 0 }) }})</span>
          </div>
          <ul v-if="showsPeriodBreakdown(request)" class="mb-2 space-y-1">
            <li
              v-for="period in periodsOf(request)"
              :key="period.id"
              class="flex flex-wrap items-center gap-2 text-xs text-neutral-600"
            >
              <span>{{ formatDateRange(period) }}</span>
              <span class="px-2 py-0.5 font-medium rounded-full" :class="requestStatusClass(period.status)">
                {{ requestStatusLabel(period.status) }}
              </span>
            </li>
          </ul>
          <div v-if="request.status === 'partial'" class="text-xs mb-2">
            <span class="text-green-600">{{ request.approvedDaysCount || 0 }} {{ $t('requests.approvedDays') }}</span>
            <span class="text-neutral-400 mx-1">|</span>
            <span class="text-amber-600">{{ request.pendingDaysCount || 0 }} {{ $t('requests.pendingDays') }}</span>
          </div>
          <p v-if="request.notes" class="text-sm text-neutral-500 mb-2 break-words">{{ request.notes }}</p>
          <p
            v-for="reason in rejectionReasons(request)"
            :key="reason"
            class="text-sm text-red-600 mb-2 break-words"
          >
            {{ $t('requests.reason') }}: {{ reason }}
          </p>
          <div v-if="canEdit(request) || canCancel(request)" class="flex gap-6">
            <button
              v-if="canEdit(request)"
              type="button"
              @click="editRequest(request.id)"
              class="py-2 text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              {{ $t('requests.edit') }}
            </button>
            <button
              v-if="canCancel(request)"
              type="button"
              @click="openDeleteModal(request.id)"
              class="py-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              {{ $t('requests.cancelRequest') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel confirmation -->
    <BaseModal
      :open="showDeleteModal"
      :title="$t('requests.cancelConfirmTitle')"
      :busy="isDeleting"
      @close="closeDeleteModal"
    >
      <p class="text-neutral-600">{{ $t('requests.cancelConfirmMessage') }}</p>
      <template #footer>
        <button type="button" class="btn-outline" :disabled="isDeleting" @click="closeDeleteModal">
          {{ $t('requests.keepRequest') }}
        </button>
        <button type="button" class="btn-danger" :disabled="isDeleting" @click="confirmDelete">
          {{ isDeleting ? $t('requests.cancelling') : $t('requests.yesCancelIt') }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
