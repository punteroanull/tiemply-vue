<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAbsencesStore } from "../stores/absences";
import { useAuthStore } from "../stores/auth";
import { format, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { useToast } from "vue-toastification";
import api from "../services/api";

const { t, locale } = useI18n();

const router = useRouter();
const absencesStore = useAbsencesStore();
const authStore = useAuthStore();
const toast = useToast();

const isLoading = computed(() => absencesStore.loading);
const requests = computed(() => absencesStore.requests);

// Vacation days info
const remainingVacationDays = computed(() => authStore.remainingVacationDays);
const maxVacationDays = computed(() => authStore.currentCompany?.max_vacation_days ?? 22);

// Absences by type (excluding vacation, only approved)
const absenceCountsByType = computed(() => {
  const counts: Record<string, { name: string; count: number; code: string }> = {};

  absencesStore.absences
    .filter(absence =>
      absence.absenceType?.code !== 'vacation' &&
      (!absence.request || absence.request.status === 'approved')
    )
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
const statusFilter = ref<string>("all");

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

// Date locale
const dateLocale = computed(() => locale.value === "es" ? es : enUS);

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

// Helper to get date range text for requests with periods
function getDateRangeText(request: any): string {
  if (request.usesPeriods && request.periods?.length > 0) {
    const firstPeriod = request.periods[0];
    const lastPeriod = request.periods[request.periods.length - 1];
    return `${formatDate(firstPeriod.startDate)} - ${formatDate(lastPeriod.endDate)}`;
  }
  if (request.startDate) {
    if (request.startDate !== request.endDate) {
      return `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`;
    }
    return formatDate(request.startDate);
  }
  return "-";
}

function navigateToNewRequest() {
  router.push("/requests/new");
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
    await api.delete(`/requests/${requestToDelete.value}`);
    toast.success(t("requests.cancelSuccess"));
    await absencesStore.fetchAbsenceRequests();
    closeDeleteModal();
  } catch (error: any) {
    console.error("Error deleting request:", error);
    toast.error(error.response?.data?.message || t("requests.cancelError"));
  } finally {
    isDeleting.value = false;
  }
}

onMounted(async () => {
  await absencesStore.fetchAbsenceRequests();
  // Also fetch absences for the stats cards
  if (absencesStore.absences.length === 0) {
    await absencesStore.fetchAbsences();
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold text-neutral-800">{{ $t('requests.title') }}</h1>
      <button
        @click="navigateToNewRequest"
        class="flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        {{ $t('requests.newRequest') }}
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Vacation Days Card -->
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-neutral-500">{{ $t('absences.vacationAvailable') }}</p>
            <p class="text-xl font-bold text-blue-600">
              {{ $t('absences.daysAvailable', { remaining: remainingVacationDays, total: maxVacationDays }) }}
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
        <div class="flex items-center">
          <div
            class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
            :class="getTypeColorClasses(absenceType.code).icon"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="getTypeColorClasses(absenceType.code).text" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-neutral-500">{{ absenceType.name }}</p>
            <p class="text-xl font-bold" :class="getTypeColorClasses(absenceType.code).text">
              {{ $t('absences.daysUsed', { count: absenceType.count }) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Filter -->
    <div class="mb-4">
      <div class="flex space-x-2 bg-white rounded-lg shadow p-1 inline-flex">
        <button
          @click="statusFilter = 'all'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'all' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          {{ $t('requests.all') }}
        </button>
        <button
          @click="statusFilter = 'pending'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          {{ $t('requests.pending') }}
        </button>
        <button
          @click="statusFilter = 'approved'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'approved' ? 'bg-green-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          {{ $t('requests.approved') }}
        </button>
        <button
          @click="statusFilter = 'rejected'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'rejected' ? 'bg-red-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          {{ $t('requests.rejected') }}
        </button>
        <button
          @click="statusFilter = 'partial'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'partial' ? 'bg-indigo-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          {{ $t('requests.partialStatus') }}
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
      <h3 class="text-lg font-medium text-neutral-800 mb-2">{{ $t('requests.noRequests') }}</h3>
      <p class="text-neutral-600 mb-4">
        {{ statusFilter === 'all' ? $t('requests.noRequestsYet') : $t('requests.noFilterResults', { status: statusFilter }) }}
      </p>
      <button
        @click="navigateToNewRequest"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
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
            <tr v-for="request in filteredRequests" :key="request.id" class="hover:bg-neutral-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-medium text-neutral-800">{{ request.absenceType?.name || t('absences.absence') }}</span>
                <span v-if="request.isPartial && !request.usesPeriods" class="ml-2 text-xs text-neutral-500">({{ $t('requests.partial') }})</span>
                <span v-if="request.usesPeriods && request.periods?.length > 1" class="ml-2 text-xs text-neutral-500">
                  ({{ request.periods.length }} {{ $t('requests.periods') }})
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                {{ getDateRangeText(request) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                <span>{{ $t('requests.daysCount', { count: request.daysCount || 1 }) }}</span>
                <div v-if="request.status === 'partial'" class="text-xs mt-1">
                  <span class="text-green-600">{{ request.approvedDaysCount || 0 }} {{ $t('requests.approvedDays') }}</span>
                  <span class="text-neutral-400 mx-1">|</span>
                  <span class="text-amber-600">{{ request.pendingDaysCount || 0 }} {{ $t('requests.pendingDays') }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="getStatusBadgeClass(request.status)"
                >
                  {{ getStatusLabel(request.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-neutral-600 max-w-xs truncate">
                {{ request.notes || "-" }}
                <p v-if="request.status === 'rejected' && request.rejectionReason" class="text-red-600 text-xs mt-1">
                  {{ $t('requests.reason') }}: {{ request.rejectionReason }}
                </p>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  v-if="request.status === 'pending' || request.status === 'partial'"
                  @click="openDeleteModal(request.id)"
                  class="text-red-600 hover:text-red-800 font-medium"
                >
                  {{ $t('requests.cancel') }}
                </button>
                <span v-else class="text-neutral-400">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div class="md:hidden divide-y divide-neutral-200">
        <div v-for="request in filteredRequests" :key="request.id" class="p-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="font-medium text-neutral-800">{{ request.absenceType?.name || t('absences.absence') }}</span>
              <span v-if="request.isPartial && !request.usesPeriods" class="ml-2 text-xs text-neutral-500">({{ $t('requests.partial') }})</span>
              <span v-if="request.usesPeriods && request.periods?.length > 1" class="ml-2 text-xs text-neutral-500">
                ({{ request.periods.length }} {{ $t('requests.periods') }})
              </span>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="getStatusBadgeClass(request.status)"
            >
              {{ getStatusLabel(request.status) }}
            </span>
          </div>
          <div class="text-sm text-neutral-600 mb-2">
            {{ getDateRangeText(request) }}
            <span class="ml-2">({{ $t('requests.daysCount', { count: request.daysCount || 1 }) }})</span>
          </div>
          <div v-if="request.status === 'partial'" class="text-xs mb-2">
            <span class="text-green-600">{{ request.approvedDaysCount || 0 }} {{ $t('requests.approvedDays') }}</span>
            <span class="text-neutral-400 mx-1">|</span>
            <span class="text-amber-600">{{ request.pendingDaysCount || 0 }} {{ $t('requests.pendingDays') }}</span>
          </div>
          <p v-if="request.notes" class="text-sm text-neutral-500 mb-2">{{ request.notes }}</p>
          <p v-if="request.status === 'rejected' && request.rejectionReason" class="text-sm text-red-600 mb-2">
            {{ $t('requests.reason') }}: {{ request.rejectionReason }}
          </p>
          <button
            v-if="request.status === 'pending' || request.status === 'partial'"
            @click="openDeleteModal(request.id)"
            class="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            {{ $t('requests.cancelRequest') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="closeDeleteModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
          <div class="flex items-center mb-4">
            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="ml-3 text-lg font-medium text-neutral-900">{{ $t('requests.cancelConfirmTitle') }}</h3>
          </div>
          <p class="text-neutral-600 mb-6">
            {{ $t('requests.cancelConfirmMessage') }}
          </p>
          <div class="flex justify-end space-x-3">
            <button
              @click="closeDeleteModal"
              :disabled="isDeleting"
              class="px-4 py-2 bg-neutral-100 text-neutral-700 font-medium rounded-md hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {{ $t('requests.keepRequest') }}
            </button>
            <button
              @click="confirmDelete"
              :disabled="isDeleting"
              class="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <span v-if="isDeleting">{{ $t('requests.cancelling') }}</span>
              <span v-else>{{ $t('requests.yesCancelIt') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
