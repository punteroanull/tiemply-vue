<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useDepartmentsStore } from "../stores/departments";
import ErrorState from "../components/ErrorState.vue";
import {
  formatRequestDates,
  requestStatusClass,
  requestStatusLabel,
} from "../utils/requestStatus";

const { t } = useI18n();
const router = useRouter();
const departmentsStore = useDepartmentsStore();

const loading = computed(() => departmentsStore.loading);
const requests = computed(() => departmentsStore.requests);
const canManage = computed(() => departmentsStore.canManageDepartment);
const hasDepartment = computed(() => !!departmentsStore.currentDepartmentId);

// Filter
type StatusFilter = "all" | "pending" | "partial" | "approved" | "rejected";
const statusFilter = ref<StatusFilter>("all");

const filterTabs: { value: StatusFilter; label: string; active: string }[] = [
  { value: "all", label: "requests.all", active: "bg-primary-600 text-white" },
  { value: "pending", label: "requests.pending", active: "bg-amber-500 text-white" },
  { value: "partial", label: "requests.partialStatus", active: "bg-indigo-600 text-white" },
  { value: "approved", label: "requests.approved", active: "bg-green-600 text-white" },
  { value: "rejected", label: "requests.rejected", active: "bg-red-600 text-white" },
];

// Filtered requests. The API cannot filter by "partial", so that tab loads everything
// and narrows it here; the others are narrowed by both.
const filteredRequests = computed(() => {
  if (statusFilter.value === "all") {
    return requests.value;
  }
  return requests.value.filter((req) => req.status === statusFilter.value);
});

/** Reasons given when the request, or any of its periods, was rejected. */
function rejectionReasons(request: (typeof requests.value)[number]): string[] {
  const reasons = [
    request.rejectionReason,
    ...(request.periods ?? []).map((period) => period.rejectionReason),
  ].filter((reason): reason is string => !!reason);
  return [...new Set(reasons)];
}

function getEmployeeName(request: any): string {
  return request.employee?.user?.name || request.employee?.name || t("common.unknown");
}

function goBack() {
  router.push("/department");
}

function load() {
  return departmentsStore.fetchDepartmentRequests(undefined, statusFilter.value);
}

async function changeFilter(status: StatusFilter) {
  statusFilter.value = status;
  // The store keeps only the answer to the latest request, so quick tab changes cannot
  // leave one tab showing another tab's list.
  await load();
}

onMounted(async () => {
  if (!canManage.value) {
    router.push("/department");
    return;
  }
  if (!hasDepartment.value) return;

  await load();
});
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
      <div>
        <button
          type="button"
          @click="goBack"
          class="flex items-center text-neutral-600 hover:text-neutral-800 mb-2"
        >
          <svg class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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

      <!-- This list is read-only; approving and rejecting happens in Team Requests -->
      <router-link to="/team-requests" class="btn-primary">
        {{ $t("department.reviewRequests") }}
      </router-link>
    </div>

    <!-- Not in a department: silence would look like "no requests" -->
    <div v-if="!hasDepartment" class="bg-white rounded-lg shadow p-8 text-center">
      <h3 class="text-lg font-medium text-neutral-800 mb-2">
        {{ $t("department.noDepartment") }}
      </h3>
      <p class="text-neutral-600">{{ $t("department.noDepartmentDescription") }}</p>
    </div>

    <template v-else>
    <!-- Status Filters -->
    <div class="mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div class="bg-white rounded-lg shadow p-1 inline-flex min-w-max" role="group" :aria-label="$t('absences.status')">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          type="button"
          @click="changeFilter(tab.value)"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="statusFilter === tab.value ? tab.active : 'text-neutral-600 hover:bg-neutral-100'"
          :aria-pressed="statusFilter === tab.value"
        >
          {{ $t(tab.label) }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center h-64" role="status">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"
      ></div>
      <span class="sr-only">{{ $t("common.loading") }}</span>
    </div>

    <!-- Error state: a failed load is not "no requests" -->
    <ErrorState v-else-if="departmentsStore.requestsError" @retry="load" />

    <!-- Empty state -->
    <div
      v-else-if="filteredRequests.length === 0"
      class="bg-white rounded-lg shadow p-8 text-center"
    >
      <div
        class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 text-neutral-500 mb-4"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-neutral-800">
        {{ $t("requests.noRequests") }}
      </h3>
      <p class="text-neutral-600 mt-1">
        {{ statusFilter === "all" ? $t("department.noRequestsDescription") : $t(`requests.noResultsByStatus.${statusFilter}`) }}
      </p>
    </div>

    <!-- Requests Table - Desktop -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-neutral-200">
          <thead class="bg-neutral-50">
            <tr>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("department.employee") }}
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("requests.type") }}
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("requests.dates") }}
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("requests.days") }}
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase"
              >
                {{ $t("absences.status") }}
              </th>
              <th
                scope="col"
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
                    aria-hidden="true"
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
                {{ formatRequestDates(request) }}
                <span v-if="request.periods && request.periods.length > 1" class="ml-1 text-xs text-neutral-500">
                  ({{ request.periods.length }} {{ $t("requests.periods") }})
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                {{ request.daysCount ?? 0 }}
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
                  {{ $t("requests.reason") }}: {{ reason }}
                </p>
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
                aria-hidden="true"
                class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm"
              >
                {{ getEmployeeName(request).charAt(0).toUpperCase() }}
              </div>
              <span class="ml-3 font-medium text-neutral-800">{{
                getEmployeeName(request)
              }}</span>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
              :class="requestStatusClass(request.status)"
            >
              {{ requestStatusLabel(request.status) }}
            </span>
          </div>
          <div class="text-sm text-neutral-600 space-y-1">
            <p class="font-medium">{{ request.absenceType?.name || "-" }}</p>
            <p>
              {{ formatRequestDates(request) }}
              <span v-if="request.periods && request.periods.length > 1" class="ml-1 text-xs text-neutral-500">
                ({{ request.periods.length }} {{ $t("requests.periods") }})
              </span>
            </p>
            <p>{{ $t("requests.daysCount", { count: request.daysCount ?? 0 }) }}</p>
            <p v-if="request.notes" class="text-neutral-500 break-words">
              {{ request.notes }}
            </p>
            <p
              v-for="reason in rejectionReasons(request)"
              :key="reason"
              class="text-red-600 break-words"
            >
              {{ $t("requests.reason") }}: {{ reason }}
            </p>
          </div>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>
