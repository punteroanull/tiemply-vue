<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useHourPoolStore } from "../stores/hourPool";
import { useAuthStore } from "../stores/auth";
import { useToast } from "vue-toastification";
import type { EntryType, PoolStatus } from "../types";

const { t } = useI18n();
const hourPoolStore = useHourPoolStore();
const authStore = useAuthStore();
const toast = useToast();

// Adjustment modal state
const showAdjustmentModal = ref(false);
const adjustmentEmployeeId = ref("");
const adjustmentEmployeeName = ref("");
const adjustmentType = ref<EntryType>("credit");
const adjustmentMinutes = ref<number>(0);
const adjustmentDescription = ref("");
const adjustmentSubmitting = ref(false);

const isAdmin = computed(() => authStore.isAdmin);

function formatMinutes(minutes: number): string {
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  const sign = minutes < 0 ? "-" : "";
  if (h > 0 && m > 0) return `${sign}${h}h ${m}m`;
  if (h > 0) return `${sign}${h}h`;
  return `${sign}${m}m`;
}

function getStatusColor(status: PoolStatus): string {
  switch (status) {
    case "company_owes":
      return "text-green-600";
    case "employee_owes":
      return "text-red-600";
    default:
      return "text-neutral-600";
  }
}

function getStatusBadgeClass(status: PoolStatus): string {
  switch (status) {
    case "company_owes":
      return "bg-green-100 text-green-700";
    case "employee_owes":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

function openAdjustmentModal(employeeId: string, employeeName: string) {
  adjustmentEmployeeId.value = employeeId;
  adjustmentEmployeeName.value = employeeName;
  adjustmentType.value = "credit";
  adjustmentMinutes.value = 0;
  adjustmentDescription.value = "";
  showAdjustmentModal.value = true;
}

async function submitAdjustment() {
  if (!adjustmentMinutes.value || adjustmentMinutes.value < 1) {
    toast.error(t("hourPool.adjustment.minutesRequired"));
    return;
  }
  if (!adjustmentDescription.value.trim()) {
    toast.error(t("hourPool.adjustment.descriptionRequired"));
    return;
  }

  adjustmentSubmitting.value = true;
  const success = await hourPoolStore.createAdjustment(adjustmentEmployeeId.value, {
    type: adjustmentType.value,
    minutes: adjustmentMinutes.value,
    description: adjustmentDescription.value.trim(),
  });

  if (success) {
    toast.success(t("hourPool.adjustment.success"));
    showAdjustmentModal.value = false;
    await hourPoolStore.fetchCompanySummary();
  }
  adjustmentSubmitting.value = false;
}

onMounted(async () => {
  await hourPoolStore.fetchCompanySummary();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-neutral-800">
        {{ t("hourPool.companySummary.title") }}
      </h1>
      <p class="text-neutral-500 mt-1">{{ t("hourPool.companySummary.subtitle") }}</p>
    </div>

    <!-- Loading state -->
    <div v-if="hourPoolStore.loadingSummary" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="hourPoolStore.companySummary">
      <!-- Company totals -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("hourPool.netBalance") }}</p>
          <p class="text-2xl font-semibold text-neutral-900 mt-1">
            {{ hourPoolStore.companySummary.formattedBalance }}
          </p>
        </div>
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("hourPool.credits") }}</p>
          <p class="text-2xl font-semibold text-green-600 mt-1">
            {{ hourPoolStore.companySummary.formattedCredits }}
          </p>
        </div>
        <div class="bg-white rounded-lg border border-neutral-200 p-4">
          <p class="text-sm text-neutral-500">{{ t("hourPool.debits") }}</p>
          <p class="text-2xl font-semibold text-red-600 mt-1">
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
        <div class="p-4 border-b border-neutral-200">
          <h2 class="text-lg font-medium text-neutral-800">
            {{ t("hourPool.companySummary.employeeBreakdown") }}
          </h2>
        </div>

        <div v-if="hourPoolStore.companySummary.employeeSummaries.length > 0">
          <!-- Desktop table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead class="bg-neutral-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.companySummary.employee") }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.credits") }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.debits") }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.balance") }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.status.label") }}
                  </th>
                  <th v-if="isAdmin" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {{ t("hourPool.actions") }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-neutral-200">
                <tr
                  v-for="employee in hourPoolStore.companySummary.employeeSummaries"
                  :key="employee.employeeId"
                  class="hover:bg-neutral-50"
                >
                  <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                    {{ employee.employeeName }}
                  </td>
                  <td class="px-4 py-3 text-sm text-green-600">
                    {{ formatMinutes(employee.totalCredits) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-red-600">
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
                      @click="openAdjustmentModal(employee.employeeId, employee.employeeName)"
                      class="text-sm text-primary-600 hover:text-primary-800 font-medium"
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
              v-for="employee in hourPoolStore.companySummary.employeeSummaries"
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
                <span class="text-green-600">{{ formatMinutes(employee.totalCredits) }}</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-neutral-500">{{ t("hourPool.debits") }}:</span>
                <span class="text-red-600">{{ formatMinutes(employee.totalDebits) }}</span>
              </div>
              <button
                v-if="isAdmin"
                @click="openAdjustmentModal(employee.employeeId, employee.employeeName)"
                class="mt-3 w-full text-sm text-primary-600 hover:text-primary-800 font-medium border border-primary-200 rounded-md py-2 hover:bg-primary-50"
              >
                {{ t("hourPool.adjustment.button") }}
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="p-8 text-center">
          <h3 class="text-lg font-medium text-neutral-900">
            {{ t("hourPool.companySummary.noEmployees") }}
          </h3>
        </div>
      </div>
    </div>

    <!-- Adjustment Modal -->
    <Teleport to="body">
      <div
        v-if="showAdjustmentModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div
          class="fixed inset-0 bg-neutral-800 bg-opacity-50"
          @click="showAdjustmentModal = false"
        ></div>
        <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <h3 class="text-lg font-medium text-neutral-900 mb-1">
            {{ t("hourPool.adjustment.title") }}
          </h3>
          <p class="text-sm text-neutral-500 mb-4">
            {{ adjustmentEmployeeName }}
          </p>

          <div class="space-y-4">
            <!-- Type -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                {{ t("hourPool.type") }}
              </label>
              <select
                v-model="adjustmentType"
                class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="credit">{{ t("hourPool.credit") }}</option>
                <option value="debit">{{ t("hourPool.debit") }}</option>
              </select>
            </div>

            <!-- Minutes -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                {{ t("hourPool.minutes") }}
              </label>
              <input
                v-model.number="adjustmentMinutes"
                type="number"
                min="1"
                class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                {{ t("hourPool.description") }}
              </label>
              <textarea
                v-model="adjustmentDescription"
                rows="3"
                maxlength="500"
                class="w-full rounded-md border-neutral-300 text-sm focus:border-primary-500 focus:ring-primary-500"
                :placeholder="t('hourPool.adjustment.descriptionPlaceholder')"
              ></textarea>
              <p class="text-xs text-neutral-400 mt-1">
                {{ adjustmentDescription.length }}/500
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              @click="showAdjustmentModal = false"
              class="px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded-md hover:bg-neutral-50"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              @click="submitAdjustment"
              :disabled="adjustmentSubmitting"
              class="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {{ adjustmentSubmitting ? t("common.loading") : t("common.save") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
