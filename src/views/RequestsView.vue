<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Absence Requests</h1>
      <router-link 
        to="/requests/new" 
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        New Request
      </router-link>
    </div>
    
    <div class="bg-white rounded-lg shadow">
      <!-- Request list will be implemented later -->
      <div class="p-4">
        <p class="text-gray-600">Your absence requests will appear here.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Component logic will be added later
</script>