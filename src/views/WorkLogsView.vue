<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Work Logs</h1>
      <div class="flex space-x-4">
        <button class="btn-outline">
          Daily
        </button>
        <button class="btn-outline">
          Weekly
        </button>
        <button class="btn-outline">
          Monthly
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <div class="text-sm text-gray-500">
            Total Hours: 0:00
          </div>
        </div>
        
        <div class="border-t border-gray-200">
          <p class="py-4 text-gray-600 text-center">No work logs available.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useWorkLogsStore } from '../stores/workLogs'

const workLogsStore = useWorkLogsStore()

onMounted(async () => {
  await workLogsStore.fetchDailyReport()
})
</script>