<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useHourPoolStore } from "../stores/hourPool";
import type { PoolEmployeeOption } from "../stores/hourPool";
import { useAuthStore } from "../stores/auth";
import { useToast } from "vue-toastification";
import BaseModal from "../components/BaseModal.vue";
import ErrorState from "../components/ErrorState.vue";
import type { EntryType, PoolStatus } from "../types";

const { t } = useI18n();
const hourPoolStore = useHourPoolStore();
const authStore = useAuthStore();
const toast = useToast();

const search = ref("");

// Adjustment modal state
const showAdjustmentModal = ref(false);
/** True when the modal was opened without a row: the employee is picked inside it. */
const pickingEmployee = ref(false);
const employeeOptions = ref<PoolEmployeeOption[]>([]);
const loadingEmployees = ref(false);
const adjustmentEmployeeId = ref("");
const adjustmentEmployeeName = ref("");
const adjustmentType = ref<EntryType>("credit");
const adjustmentMinutes = ref<number | null>(null);
const adjustmentDescription = ref("");
const adjustmentSubmitting = ref(false);
/** Second step: the adjustment is spelled out before it is saved. */
const confirming = ref(false);
const formError = ref("");

// Manual adjustments are administrator-only in the API.
const isAdmin = computed(() => authStore.isAdmin);

const filteredEmployees = computed(() => {
  const all = hourPoolStore.companySummary?.employeeSummaries ?? [];
  const term = search.value.trim().toLowerCase();
  const matches = term
    ? all.filter((employee) => employee.employeeName.toLowerCase().includes(term))
    : all;
  return [...matches].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
});

function formatMinutes(minutes: number): string {
  const absMinutes = Math.round(Math.abs(minutes));
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  const sign = minutes < 0 ? "-" : "";
  if (h > 0 && m > 0) return `${sign}${h}h ${m}m`;
  if (h > 0) return `${sign}${h}h`;
  return `${sign}${m}m`;
}

const adjustmentDuration = computed(() =>
  adjustmentMinutes.value && adjustmentMinutes.value > 0
    ? formatMinutes(adjustmentMinutes.value)
    : ""
);

function getStatusColor(status: PoolStatus): string {
  switch (status) {
    case "company_owes":
      return "text-green-700";
    case "employee_owes":
      return "text-red-700";
    default:
      return "text-neutral-600";
  }
}

function getStatusBadgeClass(status: PoolStatus): string {
  switch (status) {
    case "company_owes":
      return "bg-green-100 text-green-800";
    case "employee_owes":
      return "bg-red-100 text-red-800";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

function resetAdjustmentForm() {
  adjustmentType.value = "credit";
  adjustmentMinutes.value = null;
  adjustmentDescription.value = "";
  confirming.value = false;
  formError.value = "";
}

function openAdjustmentModal(employeeId: string, employeeName: string) {
  pickingEmployee.value = false;
  adjustmentEmployeeId.value = employeeId;
  adjustmentEmployeeName.value = employeeName;
  resetAdjustmentForm();
  showAdjustmentModal.value = true;
}

// For employees whose pool is still empty: they have no row in the summary to click.
async function openNewAdjustmentModal() {
  pickingEmployee.value = true;
  adjustmentEmployeeId.value = "";
  adjustmentEmployeeName.value = "";
  resetAdjustmentForm();
  showAdjustmentModal.value = true;

  if (employeeOptions.value.length === 0) {
    loadingEmployees.value = true;
    const options = await hourPoolStore.fetchCompanyEmployees();
    loadingEmployees.value = false;
    if (options === null) {
      formError.value = t("hourPool.adjustment.loadEmployeesError");
    } else {
      employeeOptions.value = options;
    }
  }
}

function closeAdjustmentModal() {
  if (adjustmentSubmitting.value) return;
  showAdjustmentModal.value = false;
}

function onEmployeePicked() {
  adjustmentEmployeeName.value =
    employeeOptions.value.find((option) => option.id === adjustmentEmployeeId.value)?.name ?? "";
}

function validateAdjustment(): boolean {
  if (!adjustmentEmployeeId.value) {
    formError.value = t("hourPool.adjustment.employeeRequired");
    return false;
  }
  if (
    !adjustmentMinutes.value ||
    !Number.isInteger(adjustmentMinutes.value) ||
    adjustmentMinutes.value < 1
  ) {
    formError.value = t("hourPool.adjustment.minutesRequired");
    return false;
  }
  if (!adjustmentDescription.value.trim()) {
    formError.value = t("hourPool.adjustment.descriptionRequired");
    return false;
  }
  formError.value = "";
  return true;
}

async function submitAdjustment() {
  if (!validateAdjustment()) {
    confirming.value = false;
    return;
  }

  // First press spells out what will happen; the second one saves it.
  if (!confirming.value) {
    confirming.value = true;
    return;
  }

  adjustmentSubmitting.value = true;
  const success = await hourPoolStore.createAdjustment(adjustmentEmployeeId.value, {
    type: adjustmentType.value,
    minutes: adjustmentMinutes.value as number,
    description: adjustmentDescription.value.trim(),
  });
  adjustmentSubmitting.value = false;

  if (success) {
    toast.success(t("hourPool.adjustment.success"));
    showAdjustmentModal.value = false;
    await hourPoolStore.fetchCompanySummary();
  } else {
    confirming.value = false;
  }
}

function loadSummary() {
  return hourPoolStore.fetchCompanySummary();
}

onMounted(() => {
  if (hourPoolStore.canViewCompanySummary) loadSummary();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-neutral-800">
          {{ t("hourPool.companySummary.title") }}
        </h1>
        <p class="text-neutral-500 mt-1">{{ t("hourPool.companySummary.subtitle") }}</p>
      </div>
      <button
        v-if="isAdmin && hourPoolStore.companySummary"
        type="button"
        class="btn-primary min-h-[44px]"
        @click="openNewAdjustmentModal"
      >
        {{ t("hourPool.adjustment.newButton") }}
      </button>
    </div>

    <!-- Only administrators and managers: the API refuses everyone else -->
    <div
      v-if="!hourPoolStore.canViewCompanySummary || hourPoolStore.featureUnavailable"
      class="bg-white rounded-lg border border-neutral-200 p-8 text-center"
    >
      <template v-if="hourPoolStore.featureUnavailable">
        <h3 class="text-lg font-medium text-neutral-900">{{ t("hourPool.notAvailableOnPlan") }}</h3>
        <p class="mt-2 text-neutral-500">{{ t("hourPool.notAvailableOnPlanDescription") }}</p>
      </template>
      <template v-else>
        <h3 class="text-lg font-medium text-neutral-900">{{ t("hourPool.companySummary.noAccess") }}</h3>
        <p class="mt-2 text-neutral-500">{{ t("hourPool.companySummary.noAccessDescription") }}</p>
      </template>
    </div>

    <!-- Loading state -->
    <div
      v-else-if="hourPoolStore.loadingSummary && !hourPoolStore.companySummary"
      class="flex items-center justify-center py-12"
      role="status"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" aria-hidden="true"></div>
      <span class="sr-only">{{ t("common.loading") }}</span>
    </div>

    <!-- Failed to load: never a blank page -->
    <ErrorState
      v-else-if="hourPoolStore.summaryError || !hourPoolStore.companySummary"
      :retrying="hourPoolStore.loadingSummary"
      @retry="loadSummary"
    />

    <div v-else>
      <!-- Company totals -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("hourPool.netBalance") }}</p>
          <p class="text-2xl font-semibold text-neutral-900 mt-1">
            {{ hourPoolStore.companySummary.formattedBalance }}
          </p>
        </div>
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("hourPool.credits") }}</p>
          <p class="text-2xl font-semibold text-green-700 mt-1">
            {{ hourPoolStore.companySummary.formattedCredits }}
          </p>
        </div>
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("hourPool.debits") }}</p>
          <p class="text-2xl font-semibold text-red-700 mt-1">
            {{ hourPoolStore.companySummary.formattedDebits }}
          </p>
        </div>
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("hourPool.companySummary.employees") }}</p>
          <p class="text-2xl font-semibold text-primary-600 mt-1">
            {{ hourPoolStore.companySummary.employeesCount }}
          </p>
        </div>
      </div>

      <!-- Employee summaries -->
      <div class="bg-white rounded-lg border border-neutral-200">
        <div class="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-lg font-medium text-neutral-800">
              {{ t("hourPool.companySummary.employeeBreakdown") }}
            </h2>
            <p class="text-xs text-neutral-500 mt-1">
              {{ t("hourPool.companySummary.onlyWithEntries") }}
            </p>
          </div>
          <input
            v-if="hourPoolStore.companySummary.employeeSummaries.length > 0"
            v-model="search"
            type="search"
            :placeholder="t('hourPool.companySummary.search')"
            :aria-label="t('hourPool.companySummary.search')"
            class="w-full sm:w-64 rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div v-if="filteredEmployees.length > 0">
          <!-- Desktop table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead class="bg-neutral-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.companySummary.employee") }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.credits") }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.debits") }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.balance") }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.status.label") }}
                  </th>
                  <th v-if="isAdmin" scope="col" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.actions") }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-neutral-200">
                <tr
                  v-for="employee in filteredEmployees"
                  :key="employee.employeeId"
                  class="hover:bg-neutral-50"
                >
                  <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                    {{ employee.employeeName }}
                  </td>
                  <td class="px-4 py-3 text-sm text-green-700">
                    {{ formatMinutes(employee.totalCredits) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-red-700">
                    {{ formatMinutes(employee.totalDebits) }}
                  </td>
                  <td class="px-4 py-3 text-sm font-medium" :class="getStatusColor(employee.status)">
                    {{ employee.formattedBalance }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      :class="getStatusBadgeClass(employee.status)"
                      class="px-2 py-1 rounded-full text-xs font-medium"
                    >
                      {{ t(`hourPool.status.${employee.status}`) }}
                    </span>
                  </td>
                  <td v-if="isAdmin" class="px-4 py-3">
                    <button
                      type="button"
                      @click="openAdjustmentModal(employee.employeeId, employee.employeeName)"
                      class="text-sm text-primary-600 hover:text-primary-800 font-medium rounded px-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      {{ t("hourPool.adjustment.button") }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="md:hidden divide-y divide-neutral-200">
            <div
              v-for="employee in filteredEmployees"
              :key="employee.employeeId"
              class="p-4"
            >
              <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-medium text-neutral-900">
                  {{ employee.employeeName }}
                </span>
                <span
                  :class="getStatusBadgeClass(employee.status)"
                  class="px-2 py-1 rounded-full text-xs font-medium"
                >
                  {{ t(`hourPool.status.${employee.status}`) }}
                </span>
              </div>
              <div class="flex justify-between items-center text-sm mb-1">
                <span class="text-neutral-500">{{ t("hourPool.balance") }}:</span>
                <span class="font-medium" :class="getStatusColor(employee.status)">
                  {{ employee.formattedBalance }}
                </span>
              </div>
              <div class="flex justify-between items-center text-sm mb-1">
                <span class="text-neutral-500">{{ t("hourPool.credits") }}:</span>
                <span class="text-green-700">{{ formatMinutes(employee.totalCredits) }}</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-neutral-500">{{ t("hourPool.debits") }}:</span>
                <span class="text-red-700">{{ formatMinutes(employee.totalDebits) }}</span>
              </div>
              <button
                v-if="isAdmin"
                type="button"
                @click="openAdjustmentModal(employee.employeeId, employee.employeeName)"
                class="mt-3 w-full min-h-[44px] text-sm text-primary-600 hover:text-primary-800 font-medium border border-primary-200 rounded-md py-2 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {{ t("hourPool.adjustment.button") }}
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="p-8 text-center">
          <h3 class="text-lg font-medium text-neutral-900">
            {{
              search.trim()
                ? t("hourPool.companySummary.noMatches")
                : t("hourPool.companySummary.noEmployees")
            }}
          </h3>
        </div>
      </div>
    </div>

    <!-- Adjustment Modal -->
    <BaseModal
      :open="showAdjustmentModal"
      :title="t('hourPool.adjustment.title')"
      :busy="adjustmentSubmitting"
      @close="closeAdjustmentModal"
    >
      <form id="adjustment-form" class="space-y-4" novalidate @submit.prevent="submitAdjustment">
        <!-- Employee -->
        <div v-if="pickingEmployee">
          <label for="adjustment-employee" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ t("hourPool.adjustment.employee") }}
          </label>
          <select
            id="adjustment-employee"
            v-model="adjustmentEmployeeId"
            :disabled="loadingEmployees || confirming"
            class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
            @change="onEmployeePicked"
          >
            <option value="" disabled>
              {{ loadingEmployees ? t("common.loading") : t("hourPool.adjustment.selectEmployee") }}
            </option>
            <option v-for="option in employeeOptions" :key="option.id" :value="option.id">
              {{ option.name }}
            </option>
          </select>
        </div>
        <p v-else class="text-sm text-neutral-600">
          <span class="text-neutral-500">{{ t("hourPool.adjustment.employee") }}:</span>
          {{ adjustmentEmployeeName }}
        </p>

        <!-- Type -->
        <div>
          <label for="adjustment-type" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ t("hourPool.type") }}
          </label>
          <select
            id="adjustment-type"
            v-model="adjustmentType"
            :disabled="confirming"
            class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="credit">{{ t("hourPool.credit") }}</option>
            <option value="debit">{{ t("hourPool.debit") }}</option>
          </select>
        </div>

        <!-- Minutes -->
        <div>
          <label for="adjustment-minutes" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ t("hourPool.minutes") }}
          </label>
          <input
            id="adjustment-minutes"
            v-model.number="adjustmentMinutes"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            :disabled="confirming"
            aria-describedby="adjustment-minutes-hint"
            class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <p id="adjustment-minutes-hint" class="text-xs text-neutral-500 mt-1 min-h-[1rem]">
            <template v-if="adjustmentDuration">
              {{ t("hourPool.adjustment.equivalent", { duration: adjustmentDuration }) }}
            </template>
          </p>
        </div>

        <!-- Description -->
        <div>
          <label for="adjustment-description" class="block text-sm font-medium text-neutral-700 mb-1">
            {{ t("hourPool.description") }}
          </label>
          <textarea
            id="adjustment-description"
            v-model="adjustmentDescription"
            rows="3"
            maxlength="500"
            :disabled="confirming"
            class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
            :placeholder="t('hourPool.adjustment.descriptionPlaceholder')"
          ></textarea>
          <p class="text-xs text-neutral-500 mt-1">
            {{ adjustmentDescription.length }}/500
          </p>
        </div>

        <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>

        <!-- Confirmation step -->
        <div
          v-if="confirming"
          class="rounded-md border p-3 text-sm"
          :class="
            adjustmentType === 'debit'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-green-200 bg-green-50 text-green-800'
          "
          role="alert"
        >
          <p class="font-medium">
            {{
              t(
                adjustmentType === "debit"
                  ? "hourPool.adjustment.confirmDebit"
                  : "hourPool.adjustment.confirmCredit",
                { duration: adjustmentDuration, name: adjustmentEmployeeName }
              )
            }}
          </p>
          <p class="mt-1">{{ t("hourPool.adjustment.confirmQuestion") }}</p>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          class="btn-outline min-h-[44px]"
          :disabled="adjustmentSubmitting"
          @click="confirming ? (confirming = false) : closeAdjustmentModal()"
        >
          {{ confirming ? t("common.back") : t("common.cancel") }}
        </button>
        <button
          type="submit"
          form="adjustment-form"
          class="min-h-[44px]"
          :class="confirming && adjustmentType === 'debit' ? 'btn-danger' : 'btn-primary'"
          :disabled="adjustmentSubmitting"
        >
          {{
            adjustmentSubmitting
              ? t("common.loading")
              : confirming
                ? t("common.confirm")
                : t("common.save")
          }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
