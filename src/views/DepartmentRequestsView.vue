<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useDepartmentsStore } from "../stores/departments";
import { format, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";

const { t, locale } = useI18n();
const router = useRouter();
const departmentsStore = useDepartmentsStore();

const loading = computed(() => departmentsStore.loading);
const requests = computed(() => departmentsStore.requests);
const canManage = computed(() => departmentsStore.canManageDepartment);

// Filter
const statusFilter = ref("all");

const dateLocale = computed(() => (locale.value === "es" ? es : enUS));

// Filtered requests
const filteredRequests = computed(() => {
  if (statusFilter.value === "all") {
    return requests.value;
  }
  return requests.value.filter((req) => req.status === statusFilter.value);
});

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy", { locale: dateLocale.value });
  } catch {
    return dateStr;
  }
}

function getStatusClass(status: string) {
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

function getStatusText(status: string) {
  switch (status) {
    case "pending":
      return t("requests.pending");
    case "approved":
      return t("requests.approved");
    case "rejected":
      return t("requests.rejected");
    default:
      return status;
  }
}

function getEmployeeName(request: any): string {
  return request.employee?.user?.name || request.employee?.name || "Unknown";
}

function goBack() {
  router.push("/department");
}

async function changeFilter(status: string) {
  statusFilter.value = status;
  await departmentsStore.fetchDepartmentRequests(
    undefined,
    status === "all" ? undefined : status
  );
}

onMounted(async () => {
  if (!canManage.value) {
    router.push("/department");
    return;
  }

  await departmentsStore.fetchDepartmentRequests();
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <!-- Header -->
    <div class="mb-6">
      <button
        @click="goBack"
        class="flex items-center text-neutral-600 hover:text-neutral-800 mb-2"
      >
        <svg class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clip-rule="evenodd"
          />
        </svg>
        {{ $t("common.back") }}
      </button>
      <h1 class="text-2xl font-bold text-neutral-800">
        {{ $t("department.requests") }}
      </h1>
      <p class="text-neutral-600 mt-1">
        {{ $t("department.requestsDescription") }}
      </p>
    </div>

    <!-- Status Filters -->
    <div class="mb-6">
      <div class="bg-white rounded-lg shadow p-1 inline-flex">
        <button
          @click="changeFilter('all')"
          :class="[
            statusFilter === 'all'
              ? 'bg-primary-600 text-white'
              : 'text-neutral-600 hover:bg-neutral-100',
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          ]"
        >
          {{ $t("requests.all") }}
        </button>
        <button
          @click="changeFilter('pending')"
          :class="[
            statusFilter === 'pending'
              ? 'bg-amber-500 text-white'
              : 'text-neutral-600 hover:bg-neutral-100',
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          ]"
        >
          {{ $t("requests.pending") }}
        </button>
        <button
          @click="changeFilter('approved')"
          :class="[
            statusFilter === 'approved'
              ? 'bg-green-500 text-white'
              : 'text-neutral-600 hover:bg-neutral-100',
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          ]"
        >
          {{ $t("requests.approved") }}
        </button>
        <button
          @click="changeFilter('rejected')"
          :class="[
            statusFilter === 'rejected'
              ? 'bg-red-500 text-white'
              : 'text-neutral-600 hover:bg-neutral-100',
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          ]"
        >
          {{ $t("requests.rejected") }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"
      ></div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredRequests.length === 0"
      class="bg-white rounded-lg shadow p-8 text-center"
    >
      <div
        class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 text-neutral-500 mb-4"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-neutral-800">
        {{ $t("department.noRequests") }}
      </h3>
      <p class="text-neutral-600 mt-1">
        {{ $t("department.noRequestsDescription") }}
      </p>
    </div>

    <!-- Requests Table - Desktop -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-neutral-200">
          <thead class="bg-neutral-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("department.employee") }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("requests.type") }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("requests.dates") }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("requests.days") }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("absences.status") }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("workLogs.notes") }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-neutral-200">
            <tr
              v-for="request in filteredRequests"
              :key="request.id"
              class="hover:bg-neutral-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div
                    class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm"
                  >
                    {{ getEmployeeName(request).charAt(0).toUpperCase() }}
                  </div>
                  <span class="ml-3 font-medium text-neutral-800">{{
                    getEmployeeName(request)
                  }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                {{ request.absenceType?.name || "-" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                {{ formatDate(request.startDate) }} -
                {{ formatDate(request.endDate) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                {{ request.daysCount }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="getStatusClass(request.status)"
                >
                  {{ getStatusText(request.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-neutral-600 max-w-xs truncate">
                {{ request.notes || "-" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden divide-y divide-neutral-200">
        <div
          v-for="request in filteredRequests"
          :key="request.id"
          class="p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <div
                class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm"
              >
                {{ getEmployeeName(request).charAt(0).toUpperCase() }}
              </div>
              <span class="ml-3 font-medium text-neutral-800">{{
                getEmployeeName(request)
              }}</span>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="getStatusClass(request.status)"
            >
              {{ getStatusText(request.status) }}
            </span>
          </div>
          <div class="text-sm text-neutral-600 space-y-1">
            <p class="font-medium">{{ request.absenceType?.name || "-" }}</p>
            <p>
              {{ formatDate(request.startDate) }} -
              {{ formatDate(request.endDate) }}
            </p>
            <p>{{ request.daysCount }} {{ $t("requests.days").toLowerCase() }}</p>
            <p v-if="request.notes" class="text-neutral-500 truncate">
              {{ request.notes }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
