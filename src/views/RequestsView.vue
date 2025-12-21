<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAbsencesStore } from "../stores/absences";
import { format, parseISO } from "date-fns";
import { useToast } from "vue-toastification";
import api from "../services/api";

const router = useRouter();
const absencesStore = useAbsencesStore();
const toast = useToast();

const isLoading = computed(() => absencesStore.loading);
const requests = computed(() => absencesStore.requests);

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

// Safe date formatting helper
function formatDate(dateValue: string | undefined | null): string {
  if (!dateValue) return "-";
  try {
    const date = parseISO(dateValue);
    return format(date, "MMM d, yyyy");
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
    default:
      return "bg-neutral-100 text-neutral-800";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
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
    toast.success("Request cancelled successfully");
    await absencesStore.fetchAbsenceRequests();
    closeDeleteModal();
  } catch (error: any) {
    console.error("Error deleting request:", error);
    toast.error(error.response?.data?.message || "Failed to cancel request");
  } finally {
    isDeleting.value = false;
  }
}

onMounted(async () => {
  await absencesStore.fetchAbsenceRequests();
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold text-neutral-800">Absence Requests</h1>
      <button
        @click="navigateToNewRequest"
        class="flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        New Request
      </button>
    </div>

    <!-- Status Filter -->
    <div class="mb-4">
      <div class="flex space-x-2 bg-white rounded-lg shadow p-1 inline-flex">
        <button
          @click="statusFilter = 'all'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'all' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          All
        </button>
        <button
          @click="statusFilter = 'pending'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          Pending
        </button>
        <button
          @click="statusFilter = 'approved'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'approved' ? 'bg-green-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          Approved
        </button>
        <button
          @click="statusFilter = 'rejected'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="statusFilter === 'rejected' ? 'bg-red-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'"
        >
          Rejected
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
      <h3 class="text-lg font-medium text-neutral-800 mb-2">No requests found</h3>
      <p class="text-neutral-600 mb-4">
        {{ statusFilter === 'all' ? "You haven't submitted any absence requests yet." : `No ${statusFilter} requests found.` }}
      </p>
      <button
        @click="navigateToNewRequest"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        Create your first request
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
                Type
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Dates
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Days
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Notes
              </th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-neutral-200">
            <tr v-for="request in filteredRequests" :key="request.id" class="hover:bg-neutral-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-medium text-neutral-800">{{ request.absenceType?.name || "Absence" }}</span>
                <span v-if="request.isPartial" class="ml-2 text-xs text-neutral-500">(Partial)</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                {{ formatDate(request.startDate) }}
                <span v-if="request.startDate !== request.endDate">
                  - {{ formatDate(request.endDate) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                {{ request.daysCount || 1 }} day(s)
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
                  Reason: {{ request.rejectionReason }}
                </p>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  v-if="request.status === 'pending'"
                  @click="openDeleteModal(request.id)"
                  class="text-red-600 hover:text-red-800 font-medium"
                >
                  Cancel
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
              <span class="font-medium text-neutral-800">{{ request.absenceType?.name || "Absence" }}</span>
              <span v-if="request.isPartial" class="ml-2 text-xs text-neutral-500">(Partial)</span>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="getStatusBadgeClass(request.status)"
            >
              {{ getStatusLabel(request.status) }}
            </span>
          </div>
          <div class="text-sm text-neutral-600 mb-2">
            {{ formatDate(request.startDate) }}
            <span v-if="request.startDate !== request.endDate">
              - {{ formatDate(request.endDate) }}
            </span>
            <span class="ml-2">({{ request.daysCount || 1 }} day(s))</span>
          </div>
          <p v-if="request.notes" class="text-sm text-neutral-500 mb-2">{{ request.notes }}</p>
          <p v-if="request.status === 'rejected' && request.rejectionReason" class="text-sm text-red-600 mb-2">
            Reason: {{ request.rejectionReason }}
          </p>
          <button
            v-if="request.status === 'pending'"
            @click="openDeleteModal(request.id)"
            class="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Cancel request
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
            <h3 class="ml-3 text-lg font-medium text-neutral-900">Cancel Request</h3>
          </div>
          <p class="text-neutral-600 mb-6">
            Are you sure you want to cancel this absence request? This action cannot be undone.
          </p>
          <div class="flex justify-end space-x-3">
            <button
              @click="closeDeleteModal"
              :disabled="isDeleting"
              class="px-4 py-2 bg-neutral-100 text-neutral-700 font-medium rounded-md hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              Keep Request
            </button>
            <button
              @click="confirmDelete"
              :disabled="isDeleting"
              class="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <span v-if="isDeleting">Cancelling...</span>
              <span v-else>Yes, Cancel It</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
